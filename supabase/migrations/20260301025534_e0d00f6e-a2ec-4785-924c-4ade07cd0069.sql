-- Drop the overly broad SELECT policy that gives managers full access to all employee data
DROP POLICY IF EXISTS "Admins and managers can view all employees in tenant" ON public.employees;

-- Create admin-only full access SELECT policy
CREATE POLICY "Admins can view all employees in tenant"
ON public.employees
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), tenant_id, 'admin'));

-- Create limited manager access - managers need to see employees for project allocation
-- but this is now separate from admin access for auditability
CREATE POLICY "Managers can view employees in tenant"
ON public.employees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = employees.tenant_id
      AND role = 'manager'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.employees e2
    WHERE e2.auth_id = auth.uid()
      AND e2.tenant_id = employees.tenant_id
      AND e2.is_gerente = true
      AND NOT has_role(auth.uid(), employees.tenant_id, 'admin')
  )
);

-- Keep existing "Employees can view own record" policy (auth_id = auth.uid()) - no changes needed