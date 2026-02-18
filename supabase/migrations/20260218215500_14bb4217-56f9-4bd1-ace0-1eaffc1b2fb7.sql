
-- Allow employees to insert timesheets for their own project memberships
CREATE POLICY "Employees can insert own timesheets"
ON public.project_timesheets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_members pm
    JOIN employees e ON e.id = pm.employee_id
    WHERE pm.id = project_timesheets.project_member_id
    AND e.auth_id = auth.uid()
  )
);

-- Allow employees to update their own timesheets (only unlocked ones)
CREATE POLICY "Employees can update own timesheets"
ON public.project_timesheets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    JOIN employees e ON e.id = pm.employee_id
    WHERE pm.id = project_timesheets.project_member_id
    AND e.auth_id = auth.uid()
  )
  AND is_locked = false
);
