-- Rollback de 20260917150000_stakeholder_do_cliente.sql.
--
-- ATENÇÃO: APAGA os stakeholders cadastrados direto no cliente (`project_id IS NULL`). Eles
-- não têm para onde ir no modelo antigo, em que a pessoa só existe dentro de um projeto.
-- Os stakeholders de projeto ficam intactos.

DELETE FROM public.project_stakeholders WHERE project_id IS NULL;

DROP TRIGGER IF EXISTS set_stakeholder_client ON public.project_stakeholders;
DROP FUNCTION IF EXISTS public.set_stakeholder_client();

DROP INDEX IF EXISTS public.idx_project_stakeholders_client;

-- As policies voltam a exigir projeto (forma de 20260904220000_project_scope_for_managers).
-- ANTES de mexer nas colunas: enquanto uma policy citar `client_id`, o Postgres recusa
-- derrubar a coluna ("cannot drop column ... because other objects depend on it").
DROP POLICY IF EXISTS "Users can view project stakeholders in their tenant" ON public.project_stakeholders;
CREATE POLICY "Users can view project stakeholders in their tenant"
ON public.project_stakeholders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p
   WHERE p.id = project_stakeholders.project_id
     AND public.user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

DROP POLICY IF EXISTS "Admins and managers can insert project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can insert project stakeholders" ON public.project_stakeholders
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can update project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can update project stakeholders" ON public.project_stakeholders
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can delete project stakeholders" ON public.project_stakeholders
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

ALTER TABLE public.project_stakeholders
  DROP CONSTRAINT IF EXISTS stakeholder_pertence_a_projeto_ou_cliente;

ALTER TABLE public.project_stakeholders
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE public.project_stakeholders
  DROP COLUMN IF EXISTS client_id;
