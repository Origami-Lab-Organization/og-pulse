-- Rollback: a função volta a decidir por papel. Só aplicável junto do rollback do escopo.
CREATE OR REPLACE FUNCTION public.can_manage_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.employees manager ON manager.id = p.manager_id AND manager.tenant_id = p.tenant_id
    WHERE p.id = _project_id
      AND (public.has_role(_user_id, p.tenant_id, 'admin') OR manager.auth_id = _user_id)
  );
$function$;
DELETE FROM public.role_capabilities WHERE capability = 'projeto:gerir-qualquer';
DELETE FROM public.user_capability_overrides WHERE capability = 'projeto:gerir-qualquer';
DELETE FROM public.capabilities WHERE key = 'projeto:gerir-qualquer';
