-- Rollback: devolve as checagens de system_role e is_gerente ao trigger. Só faz sentido
-- junto do rollback da 20260904170000 — com a derivação ativa, este trigger volta a
-- bloquear a própria sincronização.
CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND tenant_id = OLD.tenant_id AND role IN ('admin', 'manager')
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
    IF NOT (OLD.status = 'aguardando_confirmacao' AND NEW.status = 'ativo') THEN
      RAISE EXCEPTION 'Permission denied: cannot modify status';
    END IF;
  END IF;
  IF NEW.auth_id IS DISTINCT FROM OLD.auth_id THEN
    RAISE EXCEPTION 'Permission denied: cannot modify auth_id';
  END IF;
  RETURN NEW;
END;
$function$;
