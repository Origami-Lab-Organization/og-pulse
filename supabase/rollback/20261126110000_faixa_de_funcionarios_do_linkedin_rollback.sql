-- Rollback da 20261126110000 (US-0054). As faixas informadas se perdem; o número exato do time fica.
ALTER TABLE public.prospect_companies
  DROP CONSTRAINT IF EXISTS prospect_companies_funcionarios_exato_ou_faixa,
  DROP CONSTRAINT IF EXISTS prospect_companies_funcionarios_faixa_valida,
  DROP COLUMN IF EXISTS funcionarios_faixa;
