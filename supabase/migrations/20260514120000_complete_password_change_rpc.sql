-- Fix for the first-login password-change flow.
--
-- The "prevent_employee_self_escalation" trigger blocks the authenticated user
-- from changing `status`. This made the existing client-side update
-- (must_change_password + status='ativo') fail with "cannot modify status",
-- which trapped new users on /change-password after they set their password.
--
-- Two changes:
--   1. Allow the safe one-way transition `aguardando_confirmacao` -> `ativo`
--      in the trigger. Any other status change by a non-manager is still
--      blocked, so the privilege-escalation protections remain intact.
--   2. Add a SECURITY DEFINER RPC `complete_password_change()` that finalizes
--      the flow in a single atomic call, scoped to the caller's own row.

CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND tenant_id = OLD.tenant_id
    AND role IN ('admin', 'manager')
  ) THEN
    RETURN NEW;
  END IF;

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
    -- Allow only the safe one-way activation transition for the first-login
    -- password-change flow. Every other self-initiated status change is blocked.
    IF NOT (OLD.status = 'aguardando_confirmacao' AND NEW.status = 'ativo') THEN
      RAISE EXCEPTION 'Permission denied: cannot modify status';
    END IF;
  END IF;
  IF NEW.auth_id IS DISTINCT FROM OLD.auth_id THEN
    RAISE EXCEPTION 'Permission denied: cannot modify auth_id';
  END IF;

  RETURN NEW;
END;
$$;

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
