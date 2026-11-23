-- Rollback de 20261118200000_funcionarios_do_time (US-0020).
-- Apaga os funcionários informados pelo time: a tela volta a mostrar só a RAIS.

ALTER TABLE public.prospect_companies
  DROP CONSTRAINT IF EXISTS prospect_companies_funcionarios_informados_validos,
  DROP COLUMN IF EXISTS funcionarios_informados;
