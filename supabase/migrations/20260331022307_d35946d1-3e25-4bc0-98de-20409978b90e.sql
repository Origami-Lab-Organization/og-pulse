
-- 1. Drop the vulnerable UPDATE policy
DROP POLICY IF EXISTS "Admins can update employees in their tenant" ON public.employees;

-- 2. Create admin/manager-only UPDATE policy (full access to all fields)
CREATE POLICY "Admins can update employees in their tenant"
ON public.employees FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), tenant_id, 'admin'::app_role)
  OR is_manager_in_tenant(auth.uid(), tenant_id)
);

-- 3. Create restricted self-update policy (only safe fields like foto_url)
CREATE POLICY "Employees can update own safe fields"
ON public.employees FOR UPDATE TO authenticated
USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

-- 4. Create a trigger to block privilege escalation on sensitive fields
CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the caller is an admin or manager, allow all changes
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND tenant_id = OLD.tenant_id
    AND role IN ('admin', 'manager')
  ) THEN
    RETURN NEW;
  END IF;

  -- For regular employees, block changes to sensitive fields
  IF NEW.is_gerente IS DISTINCT FROM OLD.is_gerente THEN
    RAISE EXCEPTION 'Permission denied: cannot modify is_gerente';
  END IF;
  IF NEW.system_role IS DISTINCT FROM OLD.system_role THEN
    RAISE EXCEPTION 'Permission denied: cannot modify system_role';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Permission denied: cannot modify tenant_id';
  END IF;
  IF NEW.salario_mensal IS DISTINCT FROM OLD.salario_mensal THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.salario_liquido IS DISTINCT FROM OLD.salario_liquido THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.encargos IS DISTINCT FROM OLD.encargos THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.beneficios IS DISTINCT FROM OLD.beneficios THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.pro_labore IS DISTINCT FROM OLD.pro_labore THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
    RAISE EXCEPTION 'Permission denied: cannot modify cargo';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Permission denied: cannot modify status';
  END IF;
  IF NEW.auth_id IS DISTINCT FROM OLD.auth_id THEN
    RAISE EXCEPTION 'Permission denied: cannot modify auth_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_employee_self_escalation ON public.employees;
CREATE TRIGGER prevent_employee_self_escalation
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_employee_self_escalation();
