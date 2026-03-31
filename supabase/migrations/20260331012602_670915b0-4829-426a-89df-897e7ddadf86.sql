
CREATE OR REPLACE FUNCTION public.get_employee_status(p_auth_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.employees WHERE auth_id = p_auth_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_status TO authenticated;
