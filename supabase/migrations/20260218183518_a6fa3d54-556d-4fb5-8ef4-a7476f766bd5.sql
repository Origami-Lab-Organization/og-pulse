
DROP POLICY IF EXISTS "Only admins can insert edit logs" ON public.timesheet_edit_logs;

CREATE POLICY "Admins and managers can insert edit logs"
ON public.timesheet_edit_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_timesheets pt
    JOIN project_members pm ON pt.project_member_id = pm.id
    JOIN projects p ON pm.project_id = p.id
    WHERE pt.id = timesheet_edit_logs.timesheet_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);
