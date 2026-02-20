
-- Drop the overly permissive SELECT policy on employees
DROP POLICY IF EXISTS "Users can view employees in their tenant" ON public.employees;

-- Admins and managers can view all employees in their tenant
CREATE POLICY "Admins and managers can view all employees in tenant"
ON public.employees
FOR SELECT
USING (
  is_admin_or_manager(auth.uid(), tenant_id)
);

-- Regular users can only view their own record
CREATE POLICY "Employees can view own record"
ON public.employees
FOR SELECT
USING (
  auth_id = auth.uid()
);
