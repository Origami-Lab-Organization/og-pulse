-- Reversão de 20260908150000_functions_off_has_role.sql
--
-- ATENÇÃO: reverter estas funções para `has_role` recria o defeito, porque `has_role`
-- não existe mais desde 20260904280000. Este arquivo existe para a regra do time (toda
-- migration tem reversão escrita e executada ao menos uma vez), não porque voltar seja
-- uma opção operacional.
--
-- O caminho de volta útil, se alguma das cinco funções estiver errada, é corrigir a
-- função em migration NOVA — nunca ressuscitar o mecanismo antigo.
--
-- O que esta reversão faz de fato: desfaz o vocabulário novo. As funções ficam como
-- estão, porque removê-las quebraria trigger e policy que dependem delas.

BEGIN;

-- 1. Solta as duas capacidades novas de perfis, exceções e perfis padrão.
DELETE FROM public.user_capability_overrides
 WHERE capability IN ('alocacao:editar-mes-fechado', 'gpo:reabrir-relatorio');

DELETE FROM public.role_capabilities
 WHERE capability IN ('alocacao:editar-mes-fechado', 'gpo:reabrir-relatorio');

DELETE FROM public.default_role_capabilities
 WHERE capability IN ('alocacao:editar-mes-fechado', 'gpo:reabrir-relatorio');

-- 2. Antes de apagar do vocabulário, as duas funções que as consultam precisam parar de
--    consultá-las, senão ninguém mais passa no predicado. Voltam para o marcador de
--    só-admin, que é o conjunto idêntico medido em 08/09 (8 pessoas, zero divergência).
CREATE OR REPLACE FUNCTION public.enforce_past_month_allocation_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.planned_hours IS DISTINCT FROM OLD.planned_hours
     AND make_date(OLD.year, OLD.month, 1) < date_trunc('month', now())::date
     AND NOT public.has_capability(auth.uid(), OLD.tenant_id, 'pessoa:editar-papel')
  THEN
    RAISE EXCEPTION 'O mês % / % já está fechado e a hora planejada dele não pode mais ser alterada por você.',
      lpad(OLD.month::text, 2, '0'), OLD.year
      USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_project_gpo_report(_report_id uuid)
RETURNS project_gpo_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result public.project_gpo_reports;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.project_gpo_reports r
    WHERE r.id = _report_id AND r.status = 'delivered'
      AND public.has_capability(auth.uid(), r.tenant_id, 'pessoa:editar-papel')
  ) THEN
    RAISE EXCEPTION 'Este relatório não pode ser reaberto por você.'
      USING ERRCODE = 'PU001';
  END IF;
  PERFORM set_config('app.gpo_transition', 'reopen', true);
  UPDATE public.project_gpo_reports
     SET status = 'draft', delivered_at = NULL, delivered_by = NULL,
         reopened_at = now(),
         reopened_by = (SELECT id FROM public.employees WHERE auth_id = auth.uid()),
         updated_at = now()
   WHERE id = _report_id RETURNING * INTO result;
  RETURN result;
END;
$function$;

DELETE FROM public.capabilities
 WHERE key IN ('alocacao:editar-mes-fechado', 'gpo:reabrir-relatorio');

COMMIT;
