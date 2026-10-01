-- Reversão de 20261001200000_prospect_company_faturamento.sql.
--
-- O faturamento informado se perde: exporte `prospect_companies (id, faturamento_anual,
-- faturamento_anual_base)` antes, se precisar dele. Sem BEGIN/COMMIT próprio: quem executa
-- envolve com psql --single-transaction.

ALTER TABLE public.prospect_companies
  DROP CONSTRAINT IF EXISTS prospect_companies_faturamento_com_base,
  DROP CONSTRAINT IF EXISTS prospect_companies_faturamento_base_valida,
  DROP CONSTRAINT IF EXISTS prospect_companies_faturamento_nao_negativo,
  DROP COLUMN IF EXISTS faturamento_anual_base,
  DROP COLUMN IF EXISTS faturamento_anual;
