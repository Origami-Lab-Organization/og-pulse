-- ─────────────────────────────────────────────────────────────────────────────
-- Corrige RLS de ESCRITA em public.project_role_allocations
--
-- Sintoma: edição inline de horas planejadas na aba Equipe falhava com
--   "new row violates row-level security policy for table project_role_allocations"
-- (e, antes, falhava silenciosamente no caminho de UPDATE — 0 linhas afetadas).
--
-- Causa: o histórico de migrações deixou a tabela sem policy de INSERT/UPDATE/
-- DELETE válida. Sequência que gerou o drift:
--   · 20260526110000 criou as policies estritas *_admin_or_pm (admin ou GP do projeto);
--   · 20260526145410 recriou policies permissivas "Tenant members can ...";
--   · 20260707130000 DROPOU as permissivas de INSERT/UPDATE/DELETE e só recriou a de SELECT,
--     podendo deixar a tabela sem nenhuma policy de escrita aplicável.
--
-- Correção (idempotente): re-afirma as policies de escrita no modelo de segurança
-- oficial (.harness/patterns/security.md, OWASP A01) — escrita por recurso:
-- somente admin do tenant OU o GP definido em projects.manager_id daquele projeto.
-- Nenhuma retokenização de regra: usa os helpers já existentes
-- can_manage_project() e project_child_tenant_matches().
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_role_allocations ENABLE ROW LEVEL SECURITY;

-- Remove qualquer variante anterior (permissiva ou estrita) para evitar policies duplicadas.
DROP POLICY IF EXISTS "Tenant members can insert project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "Tenant members can update project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "Tenant members can delete project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "project_role_allocations_insert_admin_or_pm" ON public.project_role_allocations;
DROP POLICY IF EXISTS "project_role_allocations_update_admin_or_pm" ON public.project_role_allocations;
DROP POLICY IF EXISTS "project_role_allocations_delete_admin_or_pm" ON public.project_role_allocations;

CREATE POLICY "project_role_allocations_insert_admin_or_pm"
ON public.project_role_allocations FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_role_allocations_update_admin_or_pm"
ON public.project_role_allocations FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_role_allocations_delete_admin_or_pm"
ON public.project_role_allocations FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));
