-- US-0056 (27/11/2026): faturamento e funcionários informados pelo time em faixa, com origem e
-- confiança.
--
-- Decisões do Victor: o time informa uma faixa (de–até) ou um valor exato, diz se estimou ou apurou
-- (balanço, a própria empresa) e, quando estimou, a confiança; a fonte é opcional. Nas contas (tipo de
-- conta, fit, filtros) entra o ponto médio, guardado em `faturamento_anual` e `funcionarios_informados`
-- como hoje; a faixa, a confiança e a fonte só aparecem na tela.
--
-- A faixa do LinkedIn (`funcionarios_faixa`, 20261126110000) vira de–até nas colunas novas, com fonte
-- "LinkedIn"; a coluna antiga fica vazia e sai numa limpeza futura (a Edge Function ainda a lê).
--
-- Segue a RLS da empresa (`prospeccao:ler` / `prospeccao:editar`), sem política nova.
-- Rollback: supabase/rollback/20261127100000_faixa_e_confianca_do_time_rollback.sql

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS faturamento_min numeric(16, 2),
  ADD COLUMN IF NOT EXISTS faturamento_max numeric(16, 2),
  ADD COLUMN IF NOT EXISTS faturamento_confianca text,
  ADD COLUMN IF NOT EXISTS faturamento_fonte text,
  ADD COLUMN IF NOT EXISTS funcionarios_min integer,
  ADD COLUMN IF NOT EXISTS funcionarios_max integer,
  ADD COLUMN IF NOT EXISTS funcionarios_base text,
  ADD COLUMN IF NOT EXISTS funcionarios_confianca text,
  ADD COLUMN IF NOT EXISTS funcionarios_fonte text;

-- A faixa do LinkedIn em de–até, antes das regras novas (o ponto médio é o mesmo do código).
UPDATE public.prospect_companies p
   SET funcionarios_min = f.de, funcionarios_max = f.ate, funcionarios_informados = f.meio,
       funcionarios_base = 'estimado', funcionarios_fonte = 'LinkedIn', funcionarios_faixa = NULL
  FROM (VALUES ('0-1', 0, 1, 1), ('2-10', 2, 10, 6), ('11-50', 11, 50, 30), ('51-200', 51, 200, 125),
               ('201-500', 201, 500, 350), ('501-1000', 501, 1000, 750), ('1001-5000', 1001, 5000, 3000),
               ('5001-10000', 5001, 10000, 7500), ('10001+', 10001, 20000, 15000)) AS f(faixa, de, ate, meio)
 WHERE p.funcionarios_faixa = f.faixa;

ALTER TABLE public.prospect_companies
  ADD CONSTRAINT prospect_companies_faturamento_faixa_valida CHECK (
    (faturamento_min IS NULL) = (faturamento_max IS NULL)
    AND (faturamento_min IS NULL OR (faturamento_min >= 0 AND faturamento_min <= faturamento_max
         AND faturamento_anual BETWEEN faturamento_min AND faturamento_max))),
  ADD CONSTRAINT prospect_companies_faturamento_confianca_valida CHECK (
    faturamento_confianca IS NULL OR faturamento_confianca IN ('baixa', 'media', 'alta')),
  ADD CONSTRAINT prospect_companies_faturamento_fonte_valida CHECK (
    faturamento_fonte IS NULL OR length(faturamento_fonte) <= 300),
  ADD CONSTRAINT prospect_companies_funcionarios_faixa_do_time_valida CHECK (
    (funcionarios_min IS NULL) = (funcionarios_max IS NULL)
    AND (funcionarios_min IS NULL OR (funcionarios_min >= 0 AND funcionarios_min <= funcionarios_max
         AND funcionarios_informados BETWEEN funcionarios_min AND funcionarios_max))),
  ADD CONSTRAINT prospect_companies_funcionarios_base_valida CHECK (
    funcionarios_base IS NULL OR funcionarios_base IN ('estimado', 'apurado')),
  ADD CONSTRAINT prospect_companies_funcionarios_confianca_valida CHECK (
    funcionarios_confianca IS NULL OR funcionarios_confianca IN ('baixa', 'media', 'alta')),
  ADD CONSTRAINT prospect_companies_funcionarios_fonte_valida CHECK (
    funcionarios_fonte IS NULL OR length(funcionarios_fonte) <= 300);

COMMENT ON COLUMN public.prospect_companies.faturamento_min IS
  'US-0056: faixa do faturamento informada pelo time (de); com faturamento_max. Nulo = valor exato. '
  'faturamento_anual guarda o ponto médio, que vale nas contas.';
COMMENT ON COLUMN public.prospect_companies.funcionarios_min IS
  'US-0056: faixa de funcionários informada pelo time (de); com funcionarios_max. Nulo = número exato. '
  'funcionarios_informados guarda o ponto médio, que vale nas contas.';
