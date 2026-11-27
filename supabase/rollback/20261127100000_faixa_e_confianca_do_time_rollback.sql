-- Rollback da 20261127100000 (US-0056). As faixas, confianças e fontes se perdem; o ponto médio fica
-- em faturamento_anual e funcionarios_informados. A faixa do LinkedIn migrada não volta para
-- funcionarios_faixa.
ALTER TABLE public.prospect_companies
  DROP CONSTRAINT IF EXISTS prospect_companies_faturamento_faixa_valida,
  DROP CONSTRAINT IF EXISTS prospect_companies_faturamento_confianca_valida,
  DROP CONSTRAINT IF EXISTS prospect_companies_faturamento_fonte_valida,
  DROP CONSTRAINT IF EXISTS prospect_companies_funcionarios_faixa_do_time_valida,
  DROP CONSTRAINT IF EXISTS prospect_companies_funcionarios_base_valida,
  DROP CONSTRAINT IF EXISTS prospect_companies_funcionarios_confianca_valida,
  DROP CONSTRAINT IF EXISTS prospect_companies_funcionarios_fonte_valida,
  DROP COLUMN IF EXISTS faturamento_min,
  DROP COLUMN IF EXISTS faturamento_max,
  DROP COLUMN IF EXISTS faturamento_confianca,
  DROP COLUMN IF EXISTS faturamento_fonte,
  DROP COLUMN IF EXISTS funcionarios_min,
  DROP COLUMN IF EXISTS funcionarios_max,
  DROP COLUMN IF EXISTS funcionarios_base,
  DROP COLUMN IF EXISTS funcionarios_confianca,
  DROP COLUMN IF EXISTS funcionarios_fonte;
