-- ─────────────────────────────────────────────────────────────────────────────
-- Restaura a leitura ampla de PM em project_role_allocations (ADR-0003).
--
-- Sintoma: na tela de alocação (/alocacao), gerentes viam a pessoa na grade mas
-- horas planejadas de projetos de OUTROS gerentes apareciam zeradas — o RPC
-- get_allocation_employee_month_summary roda SECURITY INVOKER, então a RLS de
-- SELECT de project_role_allocations é aplicada linha a linha durante a soma.
--
-- Causa: 20260707130000_project_team_rows.sql trocou a policy solta original
-- ("qualquer membro do tenant lê") por uma estrita demais — só admin, o gerente
-- daquele projeto especifico (can_manage_project) ou o proprio funcionario.
-- Isso quebrou a leitura tenant-wide que a ADR-0003 já havia decidido para PMs,
-- mesmo essa decisão nunca tendo sido revertida.
--
-- Correção: mesma regra já usada para leitura de employees
-- (20260301031026_..., is_admin_or_manager) — qualquer admin ou gerente do
-- tenant LÊ todas as alocações. ESCRITA continua restrita por projeto via
-- can_manage_project (20260720120000_fix_project_role_allocations_write_rls.sql),
-- sem alteração aqui.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "project_role_allocations_select_admin_manager_or_member" ON public.project_role_allocations;

CREATE POLICY "project_role_allocations_select_admin_manager_or_member"
ON public.project_role_allocations FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = project_role_allocations.employee_id AND e.auth_id = auth.uid()
  )
);
