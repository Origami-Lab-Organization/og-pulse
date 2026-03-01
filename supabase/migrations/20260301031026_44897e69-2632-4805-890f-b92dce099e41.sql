
-- Remover as politicas problematicas
DROP POLICY IF EXISTS "Admins can view all employees in tenant" ON public.employees;
DROP POLICY IF EXISTS "Managers can view employees in tenant" ON public.employees;

-- Criar funcao SECURITY DEFINER para checar is_gerente sem recursao
CREATE OR REPLACE FUNCTION public.is_manager_in_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_id = _user_id
      AND tenant_id = _tenant_id
      AND is_gerente = true
  )
$$;

-- Restaurar politica que permite admins E gerentes verem todos os funcionarios
CREATE POLICY "Admins and managers can view all employees in tenant"
ON public.employees
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), tenant_id, 'admin')
  OR is_manager_in_tenant(auth.uid(), tenant_id)
);
