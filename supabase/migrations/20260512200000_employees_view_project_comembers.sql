-- Allow regular employees to view basic info of other employees
-- with whom they share a project (so assignee dropdowns, etc. can show names).

CREATE OR REPLACE FUNCTION public.user_shares_project_with_employee(
  _user_id uuid,
  _target_employee_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm_self
    JOIN public.project_members pm_other
      ON pm_other.project_id = pm_self.project_id
    JOIN public.employees self_emp
      ON self_emp.id = pm_self.employee_id
    WHERE self_emp.auth_id = _user_id
      AND pm_other.employee_id = _target_employee_id
  )
$$;

DROP POLICY IF EXISTS "Employees can view project co-members" ON public.employees;

CREATE POLICY "Employees can view project co-members"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.user_shares_project_with_employee(auth.uid(), id)
);
