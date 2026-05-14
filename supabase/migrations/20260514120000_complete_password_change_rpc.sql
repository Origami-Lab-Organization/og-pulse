-- RPC to finalize a user's first password change.
-- The "prevent_employee_self_escalation" trigger blocks the authenticated user
-- from updating `status`, which made the previous client-side update
-- (must_change_password + status) fail silently and trap users on
-- /change-password after they reset their password. This RPC runs with
-- SECURITY DEFINER so it can perform both updates atomically and safely,
-- scoped strictly to the caller's own employee row.

CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid := auth.uid();
BEGIN
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.employees
  SET
    must_change_password = false,
    status = CASE
      WHEN status = 'aguardando_confirmacao' THEN 'ativo'
      ELSE status
    END
  WHERE auth_id = v_auth_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_password_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_password_change() TO authenticated;
