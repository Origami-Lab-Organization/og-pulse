
INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT e.auth_id, e.tenant_id, 'manager'
FROM public.employees e
WHERE e.is_gerente = true
  AND e.auth_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = e.auth_id
    AND ur.tenant_id = e.tenant_id
    AND ur.role IN ('admin', 'manager')
  );
