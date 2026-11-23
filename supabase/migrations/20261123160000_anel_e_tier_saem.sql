-- Prospecção — Anel e Tier saem da empresa (US-0017, 23/11/2026).
--
-- Anel (proximidade) e Tier (porte e prioridade) eram textos livres preenchidos à mão. A
-- distância de Formiga (US-0015) e o tipo de conta (US-0008) fazem o mesmo papel, com regra e
-- lista fechada, e já estão no ar. Decisão do Victor (23/11/2026): tirar da tela e do MCP e
-- apagar as colunas no mesmo PR.
--
-- Antes de apagar, os valores ficam guardados em `legado_prospeccao`, fora da API (o PostgREST
-- expõe só `public`) e sem GRANT para anon ou authenticated, como `legado_oportunidades`
-- (20260929120000). O Tier já foi convertido em tipo de conta pelo faturamento, onde deu, pelo
-- script avulso `scripts/receita/converter-tier.ts`, que roda antes desta migration.
--
-- Nenhuma função nem view lê `ring` ou `tier` (conferido em 23/11/2026).
--
-- Rollback: supabase/rollback/20261123160000_anel_e_tier_saem_rollback.sql

CREATE SCHEMA IF NOT EXISTS legado_prospeccao;
REVOKE ALL ON SCHEMA legado_prospeccao FROM PUBLIC;

CREATE TABLE IF NOT EXISTS legado_prospeccao.empresas_anel_tier AS
  SELECT id AS company_id, tenant_id, ring AS anel, tier, now() AS copiado_em
    FROM public.prospect_companies
   WHERE nullif(btrim(ring), '') IS NOT NULL
      OR nullif(btrim(tier), '') IS NOT NULL;

REVOKE ALL ON legado_prospeccao.empresas_anel_tier FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE legado_prospeccao.empresas_anel_tier IS
  'Anel e Tier das empresas da Prospecção antes de saírem (US-0017, 23/11/2026). Só consulta; fora da API.';

ALTER TABLE public.prospect_companies
  DROP CONSTRAINT IF EXISTS prospect_companies_ring_length,
  DROP CONSTRAINT IF EXISTS prospect_companies_tier_length,
  DROP COLUMN IF EXISTS ring,
  DROP COLUMN IF EXISTS tier;
