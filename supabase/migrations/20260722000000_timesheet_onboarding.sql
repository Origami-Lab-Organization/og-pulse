-- Onboarding da nova grade de lançamento de horas (timesheet).
-- Controle de conclusão por funcionário — mesmo padrão de
-- 20260618150000_employee_onboarding.sql (onboarding geral), mas SEM backfill:
-- aqui a regra é "uma vez por usuário, novo ou não", com corte de data
-- aplicado no cliente (não aparece de forma alguma após 31/07/2026).

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS timesheet_onboarding_seen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS timesheet_onboarding_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN public.employees.timesheet_onboarding_seen IS
  'Indica se o funcionário já viu (ou pulou) o tour da nova grade de lançamento de horas.';

-- RPC para o próprio funcionário marcar a conclusão. SECURITY DEFINER pelo mesmo
-- motivo de complete_onboarding(): o usuário não consegue atualizar o próprio
-- registro diretamente (RLS/trigger). Atualiza somente o autor da chamada (auth.uid()).
CREATE OR REPLACE FUNCTION public.complete_timesheet_onboarding()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employees
     SET timesheet_onboarding_seen = true,
         timesheet_onboarding_seen_at = now()
   WHERE auth_id = auth.uid()
     AND timesheet_onboarding_seen = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_timesheet_onboarding() TO authenticated;
