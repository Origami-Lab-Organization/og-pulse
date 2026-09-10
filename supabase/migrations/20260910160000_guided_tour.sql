-- PUL-251 — o tour guiado do primeiro acesso.
--
-- No banco e não em localStorage, pelo mesmo motivo de `20260722000000_timesheet_onboarding`:
-- a pessoa entra no computador e no celular, e rever o tour de boas-vindas depois de já ter
-- visto parece defeito. No projete.app o progresso ficou no browser e trocar de navegador
-- reexibe o tour — foi a escolha oposta, e é a que doeu.
--
-- Guarda só "já viu", não em que passo parou. Tour de apresentação interrompido no meio se
-- retoma do começo: são dois minutos, e lembrar onde parou custaria mais complexidade do que
-- o que economiza.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS tour_seen_at timestamptz;

COMMENT ON COLUMN public.employees.tour_seen_at IS
  'Quando a pessoa concluiu ou pulou o tour guiado. NULL = mostra na proxima entrada '
  '(PUL-251).';

-- Backfill: quem JÁ usa o Pulse não é apresentado à casa em que mora. Sem isto, a base
-- inteira receberia um tour de boas-vindas na primeira carga depois do deploy. Mesma decisão
-- de 20260618150000_employee_onboarding.sql.
UPDATE public.employees
SET tour_seen_at = now()
WHERE tour_seen_at IS NULL;

CREATE OR REPLACE FUNCTION public.complete_tour()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employees
  SET tour_seen_at = now()
  WHERE auth_id = auth.uid()
    AND tour_seen_at IS NULL;
END;
$$;

-- Rever o tour é apagar a marca. Diferente de `complete_tour`, esta NÃO é idempotente por
-- construção — é o gesto explícito de "quero ver de novo", vindo da Central de Ajuda.
CREATE OR REPLACE FUNCTION public.restart_tour()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.employees
  SET tour_seen_at = NULL
  WHERE auth_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_tour() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restart_tour() TO authenticated;
