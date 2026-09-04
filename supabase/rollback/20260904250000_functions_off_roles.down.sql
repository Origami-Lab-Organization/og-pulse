-- Rollback do passo 2 (PUL-206): as quatro funções voltam a ler user_roles. Só aplicável
-- enquanto a tabela existir.
CREATE OR REPLACE FUNCTION public.system_role_for_user(_user_id uuid, _tenant_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
           WHEN bool_or(ur.role = 'admin'::app_role)   THEN 'admin'
           WHEN bool_or(ur.role = 'manager'::app_role) THEN 'manager'
           ELSE 'user'
         END
  FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.tenant_id = _tenant_id
$$;
CREATE OR REPLACE FUNCTION public.enforce_aloca_em_projetos_admin_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.aloca_em_projetos IS DISTINCT FROM OLD.aloca_em_projetos
     AND NOT public.has_role(auth.uid(), OLD.tenant_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: only admin can modify aloca_em_projetos';
  END IF;
  RETURN NEW;
END; $function$;
CREATE OR REPLACE FUNCTION public.get_tenant_admin_employee_ids()
RETURNS TABLE(employee_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT e.id FROM public.employees e
  JOIN public.user_roles ur ON ur.user_id = e.auth_id AND ur.tenant_id = e.tenant_id
  WHERE e.tenant_id = public.get_user_tenant_id(auth.uid()) AND ur.role = 'admin';
$function$;
