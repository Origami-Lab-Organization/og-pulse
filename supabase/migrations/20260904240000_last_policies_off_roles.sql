-- PUL-206 — nenhuma policy decide mais por papel. DECISÃO DE 04/09: aposentar já.
--
-- As 20 últimas trocam `has_role`/`is_admin_or_manager` pela capacidade equivalente, com o
-- mesmo conjunto de papéis — mecanismo, não política. O mapa:
--
--   governança do modelo (7) → `pessoa:editar-papel`, que é literalmente gerir perfis
--   exclusão em estratégia (4) → `estrategia:editar` (Admin + Gerente, como is_admin_or_manager)
--   férias de terceiro (3) → `ferias:administrar` (só-admin)
--   desfazer lançamento (4) → `lancamento:desfazer` (só-admin)
--   alocação de projeto alheio (2) → `alocacao:ler-tudo` (só-admin)
--
-- A composição foi preservada onde existia: em `vacation_requests` o termo da própria pessoa
-- e o do aprovador designado continuam; em `project_team_rows` continuam o gerente do
-- projeto e o participante. Só o termo de papel mudou.


-- project_edit_logs (1)
DROP POLICY IF EXISTS "Admins can insert project edit logs" ON public.project_edit_logs;
CREATE POLICY "Admins can insert project edit logs" ON public.project_edit_logs
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), get_project_tenant_id(project_id), 'lancamento:desfazer'));

-- project_financials (1)
DROP POLICY IF EXISTS "Admins can delete project financials" ON public.project_financials;
CREATE POLICY "Admins can delete project financials" ON public.project_financials
  FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_financials.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'lancamento:desfazer')))));

-- project_team_row_months (1)
DROP POLICY IF EXISTS "project_team_row_months_select_admin_manager_or_member" ON public.project_team_row_months;
CREATE POLICY "project_team_row_months_select_admin_manager_or_member" ON public.project_team_row_months
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM project_team_rows r
  WHERE ((r.id = project_team_row_months.row_id) AND (public.has_capability(auth.uid(), r.tenant_id, 'alocacao:ler-tudo') OR can_manage_project(auth.uid(), r.project_id) OR (EXISTS ( SELECT 1
           FROM (project_role_allocations pra
             JOIN employees e ON ((e.id = pra.employee_id)))
          WHERE ((pra.project_id = r.project_id) AND (e.auth_id = auth.uid())))))))));

-- project_team_rows (1)
DROP POLICY IF EXISTS "project_team_rows_select_admin_manager_or_member" ON public.project_team_rows;
CREATE POLICY "project_team_rows_select_admin_manager_or_member" ON public.project_team_rows
  FOR SELECT TO authenticated
  USING ((public.has_capability(auth.uid(), tenant_id, 'alocacao:ler-tudo') OR can_manage_project(auth.uid(), project_id) OR (EXISTS ( SELECT 1
   FROM (project_role_allocations pra
     JOIN employees e ON ((e.id = pra.employee_id)))
  WHERE ((pra.project_id = project_team_rows.project_id) AND (e.auth_id = auth.uid()))))));

-- project_timesheet_submissions (1)
DROP POLICY IF EXISTS "Admins can delete project submissions" ON public.project_timesheet_submissions;
CREATE POLICY "Admins can delete project submissions" ON public.project_timesheet_submissions
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), get_project_tenant_id(project_id), 'lancamento:desfazer'));

-- role_capabilities (1)
DROP POLICY IF EXISTS "Admins can manage role capabilities" ON public.role_capabilities;
CREATE POLICY "Admins can manage role capabilities" ON public.role_capabilities
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM tenant_roles r
  WHERE ((r.id = role_capabilities.role_id) AND public.has_capability(auth.uid(), r.tenant_id, 'pessoa:editar-papel')))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM tenant_roles r
  WHERE ((r.id = role_capabilities.role_id) AND public.has_capability(auth.uid(), r.tenant_id, 'pessoa:editar-papel')))));

-- strategy_checkins (1)
DROP POLICY IF EXISTS "tenant_delete_checkins" ON public.strategy_checkins;
CREATE POLICY "tenant_delete_checkins" ON public.strategy_checkins
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'estrategia:editar'));

-- strategy_cycles (1)
DROP POLICY IF EXISTS "tenant_delete_cycles" ON public.strategy_cycles;
CREATE POLICY "tenant_delete_cycles" ON public.strategy_cycles
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'estrategia:editar'));

-- strategy_key_results (1)
DROP POLICY IF EXISTS "tenant_delete_krs" ON public.strategy_key_results;
CREATE POLICY "tenant_delete_krs" ON public.strategy_key_results
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'estrategia:editar'));

-- strategy_objectives (1)
DROP POLICY IF EXISTS "tenant_delete_objectives" ON public.strategy_objectives;
CREATE POLICY "tenant_delete_objectives" ON public.strategy_objectives
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'estrategia:editar'));

-- tenant_roles (1)
DROP POLICY IF EXISTS "Admins can manage tenant roles" ON public.tenant_roles;
CREATE POLICY "Admins can manage tenant roles" ON public.tenant_roles
  FOR ALL TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel'));

-- timesheet_submissions (1)
DROP POLICY IF EXISTS "Admins can delete submissions" ON public.timesheet_submissions;
CREATE POLICY "Admins can delete submissions" ON public.timesheet_submissions
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'lancamento:desfazer'));

-- user_capability_overrides (2)
DROP POLICY IF EXISTS "Admins can manage overrides of others" ON public.user_capability_overrides;
CREATE POLICY "Admins can manage overrides of others" ON public.user_capability_overrides
  FOR ALL TO authenticated
  USING ((public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel') AND (user_id <> auth.uid())))
  WITH CHECK ((public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel') AND (user_id <> auth.uid())));

DROP POLICY IF EXISTS "Admins can read overrides of members" ON public.user_capability_overrides;
CREATE POLICY "Admins can read overrides of members" ON public.user_capability_overrides
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel'));

-- user_roles (1)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel'));

-- user_tenant_roles (2)
DROP POLICY IF EXISTS "Admins can assign roles to others" ON public.user_tenant_roles;
CREATE POLICY "Admins can assign roles to others" ON public.user_tenant_roles
  FOR ALL TO authenticated
  USING ((public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel') AND (user_id <> auth.uid())))
  WITH CHECK ((public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel') AND (user_id <> auth.uid())));

DROP POLICY IF EXISTS "Admins can read tenant roles of members" ON public.user_tenant_roles;
CREATE POLICY "Admins can read tenant roles of members" ON public.user_tenant_roles
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel'));

-- vacation_requests (3)
DROP POLICY IF EXISTS "vacation_requests_insert" ON public.vacation_requests;
CREATE POLICY "vacation_requests_insert" ON public.vacation_requests
  FOR INSERT TO authenticated
  WITH CHECK ((user_belongs_to_tenant(auth.uid(), tenant_id) AND (employee_id IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = vacation_requests.tenant_id)))) AND ((status = 'pending'::text) OR public.has_capability(auth.uid(), tenant_id, 'ferias:administrar'))));

DROP POLICY IF EXISTS "vacation_requests_select" ON public.vacation_requests;
CREATE POLICY "vacation_requests_select" ON public.vacation_requests
  FOR SELECT TO authenticated
  USING (((employee_id IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = vacation_requests.tenant_id)))) OR public.has_capability(auth.uid(), tenant_id, 'ferias:administrar') OR is_vacation_approver(id, auth.uid())));

DROP POLICY IF EXISTS "vacation_requests_update" ON public.vacation_requests;
CREATE POLICY "vacation_requests_update" ON public.vacation_requests
  FOR UPDATE TO authenticated
  USING ((public.has_capability(auth.uid(), tenant_id, 'ferias:administrar') OR (employee_id IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = vacation_requests.tenant_id)))) OR is_vacation_approver(id, auth.uid())))
  WITH CHECK ((public.has_capability(auth.uid(), tenant_id, 'ferias:administrar') OR is_vacation_approver(id, auth.uid()) OR ((employee_id IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = vacation_requests.tenant_id)))) AND (status = 'cancelled'::text))));
