-- Reversão de 20260929130000_prospect_company_receita.sql.
--
-- COM PERDA DE DADO — exporte antes `prospect_company_partners` (LinkedIn colado à mão e o
-- vínculo sócio → contato) e as colunas da Receita de `prospect_companies`. Os contatos
-- criados por "Virar contato" continuam: são contatos normais.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP FUNCTION IF EXISTS public.save_prospect_company_receita(uuid, jsonb);
DROP TABLE IF EXISTS public.prospect_company_partners;
DROP FUNCTION IF EXISTS public.prospect_company_partners_guard();

ALTER TABLE public.prospect_companies
  DROP CONSTRAINT IF EXISTS prospect_companies_razao_social_length,
  DROP CONSTRAINT IF EXISTS prospect_companies_capital_social_valid,
  DROP CONSTRAINT IF EXISTS prospect_companies_regime_ano_valid;

ALTER TABLE public.prospect_companies
  DROP COLUMN IF EXISTS razao_social,
  DROP COLUMN IF EXISTS nome_fantasia,
  DROP COLUMN IF EXISTS porte,
  DROP COLUMN IF EXISTS capital_social,
  DROP COLUMN IF EXISTS data_abertura,
  DROP COLUMN IF EXISTS situacao_cadastral,
  DROP COLUMN IF EXISTS regime_tributario,
  DROP COLUMN IF EXISTS regime_tributario_ano,
  DROP COLUMN IF EXISTS receita,
  DROP COLUMN IF EXISTS receita_consultada_em;
