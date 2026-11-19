-- US-0020 (18/11/2026): funcionários confirmados pelo time (ex.: pelo LinkedIn).
--
-- Fica na empresa e vale para todas as oportunidades dela, como o faturamento do time. Na tela
-- Empresas, prevalece sobre a RAIS na lista, na ficha e no faturamento estimado. Nulo = não
-- informado (vale a RAIS).
--
-- Também no MCP da Prospecção (TD-0022).
-- Rollback: supabase/rollback/20261118200000_funcionarios_do_time_rollback.sql

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS funcionarios_informados integer,
  ADD CONSTRAINT prospect_companies_funcionarios_informados_validos
    CHECK (funcionarios_informados IS NULL OR funcionarios_informados >= 0);

COMMENT ON COLUMN public.prospect_companies.funcionarios_informados IS
  'Funcionários confirmados pelo time (ex.: LinkedIn). Prevalece sobre a RAIS na tela Empresas '
  'e no faturamento estimado. Nulo = não informado (US-0020).';
