-- Seguindo .harness/patterns/security.md e OWASP A01:
-- PMs podem visualizar alocacao do tenant, mas escrita gerencial precisa ser por projeto.
-- Escrita de timesheet proprio permanece permitida, mas com coerencia entre projeto e membro.

DROP POLICY IF EXISTS "Employees can insert own timesheets" ON public.project_timesheets;
DROP POLICY IF EXISTS "Employees can update own timesheets" ON public.project_timesheets;
DROP POLICY IF EXISTS "Admins and managers can insert project timesheets" ON public.project_timesheets;
DROP POLICY IF EXISTS "Admins and managers can update project timesheets" ON public.project_timesheets;
DROP POLICY IF EXISTS "Admins and managers can delete project timesheets" ON public.project_timesheets;
DROP POLICY IF EXISTS "project_timesheets_insert_admin_or_pm" ON public.project_timesheets;
DROP POLICY IF EXISTS "project_timesheets_update_admin_or_pm" ON public.project_timesheets;
DROP POLICY IF EXISTS "project_timesheets_delete_admin_or_pm" ON public.project_timesheets;

CREATE POLICY "Employees can insert own timesheets"
ON public.project_timesheets FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.employees e ON e.id = pm.employee_id
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.id = project_timesheets.project_member_id
      AND pm.project_id = project_timesheets.project_id
      AND e.auth_id = auth.uid()
      AND public.user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Employees can update own timesheets"
ON public.project_timesheets FOR UPDATE TO authenticated
USING (
  is_locked = false
  AND EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.employees e ON e.id = pm.employee_id
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.id = project_timesheets.project_member_id
      AND pm.project_id = project_timesheets.project_id
      AND e.auth_id = auth.uid()
      AND public.user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
)
WITH CHECK (
  is_locked = false
  AND EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.employees e ON e.id = pm.employee_id
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.id = project_timesheets.project_member_id
      AND pm.project_id = project_timesheets.project_id
      AND e.auth_id = auth.uid()
      AND public.user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "project_timesheets_insert_admin_or_pm"
ON public.project_timesheets FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.id = project_timesheets.project_member_id
      AND pm.project_id = project_timesheets.project_id
  )
);

CREATE POLICY "project_timesheets_update_admin_or_pm"
ON public.project_timesheets FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.id = project_timesheets.project_member_id
      AND pm.project_id = project_timesheets.project_id
  )
);

CREATE POLICY "project_timesheets_delete_admin_or_pm"
ON public.project_timesheets FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Admins and managers can insert edit logs" ON public.timesheet_edit_logs;
DROP POLICY IF EXISTS "timesheet_edit_logs_insert_admin_or_pm" ON public.timesheet_edit_logs;

CREATE POLICY "timesheet_edit_logs_insert_admin_or_pm"
ON public.timesheet_edit_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_timesheets pt
    WHERE pt.id = timesheet_edit_logs.timesheet_id
      AND public.can_manage_project(auth.uid(), pt.project_id)
  )
);

DROP POLICY IF EXISTS "activity_employee_months_insert" ON public.activity_employee_months;
DROP POLICY IF EXISTS "activity_employee_months_update" ON public.activity_employee_months;
DROP POLICY IF EXISTS "activity_employee_months_delete" ON public.activity_employee_months;
DROP POLICY IF EXISTS "activity_employee_months_insert_admin" ON public.activity_employee_months;
DROP POLICY IF EXISTS "activity_employee_months_update_admin" ON public.activity_employee_months;
DROP POLICY IF EXISTS "activity_employee_months_delete_admin" ON public.activity_employee_months;

CREATE POLICY "activity_employee_months_insert_admin"
ON public.activity_employee_months FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

CREATE POLICY "activity_employee_months_update_admin"
ON public.activity_employee_months FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

CREATE POLICY "activity_employee_months_delete_admin"
ON public.activity_employee_months FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

DROP POLICY IF EXISTS "activity_timesheets_insert_manager_admin" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_update_manager_admin" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_delete_manager_admin" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_insert_admin" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_update_admin" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_delete_admin" ON public.activity_timesheets;

CREATE POLICY "activity_timesheets_insert_admin"
ON public.activity_timesheets FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

CREATE POLICY "activity_timesheets_update_admin"
ON public.activity_timesheets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

CREATE POLICY "activity_timesheets_delete_admin"
ON public.activity_timesheets FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins and managers can insert activity timesheet edit logs" ON public.activity_timesheet_edit_logs;
DROP POLICY IF EXISTS "activity_timesheet_edit_logs_insert_admin" ON public.activity_timesheet_edit_logs;

CREATE POLICY "activity_timesheet_edit_logs_insert_admin"
ON public.activity_timesheet_edit_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.activity_timesheets at
    WHERE at.id = activity_timesheet_edit_logs.activity_timesheet_id
      AND public.has_role(auth.uid(), at.tenant_id, 'admin'::public.app_role)
  )
);
