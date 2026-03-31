
-- Update is_admin_or_manager to use only user_roles (keeping original param names)
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND role IN ('admin', 'manager')
  );
$$;

-- Update is_manager_in_tenant to use user_roles
CREATE OR REPLACE FUNCTION public.is_manager_in_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND tenant_id = _tenant_id
    AND role IN ('admin', 'manager')
  );
$$;
