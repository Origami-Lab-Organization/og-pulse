-- FUNC-J2 — Onboarding do funcionário.
-- Controle de conclusão do onboarding por funcionário.

-- 1) Colunas de controle.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.employees.onboarding_completed IS
  'FUNC-J2: indica se o funcionário concluiu (ou pulou) o onboarding inicial.';

-- 2) Backfill: usuários JÁ existentes não devem ser jogados no onboarding
--    retroativamente. Apenas novos convidados (criados após esta migration)
--    nascem com o default false.
UPDATE public.employees
   SET onboarding_completed = true,
       onboarding_completed_at = now()
 WHERE onboarding_completed = false;

-- 3) RPC para o próprio funcionário marcar a conclusão. SECURITY DEFINER pelo mesmo
--    motivo de complete_password_change: o usuário não consegue atualizar o próprio
--    registro diretamente (RLS/trigger). Atualiza somente os campos de onboarding do
--    autor da chamada (auth.uid()).
CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employees
     SET onboarding_completed = true,
         onboarding_completed_at = now()
   WHERE auth_id = auth.uid()
     AND onboarding_completed = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;
