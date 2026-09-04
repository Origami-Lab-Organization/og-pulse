-- Rollback (PUL-206): as 20 policies voltam a decidir por papel.

-- project_edit_logs (1)
DROP POLICY IF EXISTS "Admins can insert project edit logs" ON public.project_edit_logs;
CREATE POLICY "Admins can insert project edit logs" ON public.project_edit_logs
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), get_project_tenant_id(project_id), 'admin'::app_role));

-- project_financials (1)
DROP POLICY IF EXISTS "Admins can delete project financials" ON public.project_financials;
CREATE POLICY "Admins can delete project financials" ON public.project_financials
  FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_financials.project_id) AND has_role(auth.uid(), p.tenant_id, 'admin'::app_role)))));

-- project_team_row_months (1)
DROP POLICY IF EXISTS "project_team_row_months_select_admin_manager_or_member" ON public.project_team_row_months;
CREATE POLICY "project_team_row_months_select_admin_manager_or_member" ON public.project_team_row_months
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM project_team_rows r
  WHERE ((r.id = project_team_row_months.row_id) AND (has_role(auth.uid(), r.tenant_id, 'admin'::app_role) OR can_manage_project(auth.uid(), r.project_id) OR (EXISTS ( SELECT 1
           FROM (project_role_allocations pra
             JOIN employees e ON ((e.id = pra.employee_id)))
          WHERE ((pra.project_id = r.project_id) AND (e.auth_id = auth.uid())))))))));

-- project_team_rows (1)
DROP POLICY IF EXISTS "project_team_rows_select_admin_manager_or_member" ON public.project_team_rows;
CREATE POLICY "project_team_rows_select_admin_manager_or_member" ON public.project_team_rows
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), tenant_id, 'admin'::app_role) OR can_manage_project(auth.uid(), project_id) OR (EXISTS ( SELECT 1
   FROM (project_role_allocations pra
     JOIN employees e ON ((e.id = pra.employee_id)))
  WHERE ((pra.project_id = project_team_rows.project_id) AND (e.auth_id = auth.uid()))))));

-- project_timesheet_submissions (1)
DROP POLICY IF EXISTS "Admins can delete project submissions" ON public.project_timesheet_submissions;
CREATE POLICY "Admins can delete project submissions" ON public.project_timesheet_submissions
  FOR DELETE TO public
  USING (has_role(auth.uid(), get_project_tenant_id(project_id), 'admin'::app_role));

-- role_capabilities (1)
DROP POLICY IF EXISTS "Admins can manage role capabilities" ON public.role_capabilities;
CREATE POLICY "Admins can manage role capabilities" ON public.role_capabilities
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM tenant_roles r
  WHERE ((r.id = role_capabilities.role_id) AND has_role(auth.uid(), r.tenant_id, 'admin'::app_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM tenant_roles r
  WHERE ((r.id = role_capabilities.role_id) AND has_role(auth.uid(), r.tenant_id, 'admin'::app_role)))));

-- strategy_checkins (1)
DROP POLICY IF EXISTS "tenant_delete_checkins" ON public.strategy_checkins;
CREATE POLICY "tenant_delete_checkins" ON public.strategy_checkins
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

-- strategy_cycles (1)
DROP POLICY IF EXISTS "tenant_delete_cycles" ON public.strategy_cycles;
CREATE POLICY "tenant_delete_cycles" ON public.strategy_cycles
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

-- strategy_key_results (1)
DROP POLICY IF EXISTS "tenant_delete_krs" ON public.strategy_key_results;
CREATE POLICY "tenant_delete_krs" ON public.strategy_key_results
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

-- strategy_objectives (1)
DROP POLICY IF EXISTS "tenant_delete_objectives" ON public.strategy_objectives;
CREATE POLICY "tenant_delete_objectives" ON public.strategy_objectives
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

-- tenant_roles (1)
DROP POLICY IF EXISTS "Admins can manage tenant roles" ON public.tenant_roles;
CREATE POLICY "Admins can manage tenant roles" ON public.tenant_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- timesheet_submissions (1)
DROP POLICY IF EXISTS "Admins can delete submissions" ON public.timesheet_submissions;
CREATE POLICY "Admins can delete submissions" ON public.timesheet_submissions
  FOR DELETE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- user_capability_overrides (2)
DROP POLICY IF EXISTS "Admins can manage overrides of others" ON public.user_capability_overrides;
CREATE POLICY "Admins can manage overrides of others" ON public.user_capability_overrides
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), tenant_id, 'admin'::app_role) AND (user_id <> auth.uid())))
  WITH CHECK ((has_role(auth.uid(), tenant_id, 'admin'::app_role) AND (user_id <> auth.uid())));

DROP POLICY IF EXISTS "Admins can read overrides of members" ON public.user_capability_overrides;
CREATE POLICY "Admins can read overrides of members" ON public.user_capability_overrides
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- user_roles (1)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- user_tenant_roles (2)
DROP POLICY IF EXISTS "Admins can assign roles to others" ON public.user_tenant_roles;
CREATE POLICY "Admins can assign roles to others" ON public.user_tenant_roles
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), tenant_id, 'admin'::app_role) AND (user_id <> auth.uid())))
  WITH CHECK ((has_role(auth.uid(), tenant_id, 'admin'::app_role) AND (user_id <> auth.uid())));

DROP POLICY IF EXISTS "Admins can read tenant roles of members" ON public.user_tenant_roles;
CREATE POLICY "Admins can read tenant roles of members" ON public.user_tenant_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- vacation_requests (3)
DROP POLICY IF EXISTS "vacation_requests_insert" ON public.vacation_requests;
CREATE POLICY "vacation_requests_insert" ON public.vacation_requests
  FOR INSERT TO authenticated
  WITH CHECK ((user_belongs_to_tenant(auth.uid(), tenant_id) AND (employee_id IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = vacation_requests.tenant_id)))) AND ((status = 'pending'::text) OR has_role(auth.uid(), tenant_id, 'admin'::app_role))));

DROP POLICY IF EXISTS "vacation_requests_select" ON public.vacation_requests;
CREATE POLICY "vacation_requests_select" ON public.vacation_requests
  FOR SELECT TO authenticated
  USING (((employee_id IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = vacation_requests.tenant_id)))) OR has_role(auth.uid(), tenant_id, 'admin'::app_role) OR is_vacation_approver(id, auth.uid())));

DROP POLICY IF EXISTS "vacation_requests_update" ON public.vacation_requests;
CREATE POLICY "vacation_requests_update" ON public.vacation_requests
  FOR UPDATE TO authenticated
  USING ((has_role(auth.uid(), tenant_id, 'admin'::app_role) OR (employee_id IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = vacation_requests.tenant_id)))) OR is_vacation_approver(id, auth.uid())))
  WITH CHECK ((has_role(auth.uid(), tenant_id, 'admin'::app_role) OR is_vacation_approver(id, auth.uid()) OR ((employee_id IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = vacation_requests.tenant_id)))) AND (status = 'cancelled'::text))));
