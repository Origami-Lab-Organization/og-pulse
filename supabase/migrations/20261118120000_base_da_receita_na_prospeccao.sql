-- US-0008 (18/11/2026): abrir oportunidade a partir da base da Receita (tela Empresas).
--
-- 1. Alavanca nova "Base da Receita" (`base_receita`): o botão rápido da lista abre com ela,
--    para as Métricas mostrarem o que veio desta tela (decisão do Victor, 16/11/2026).
-- 2. Base nova do faturamento, "Calculado" (`calculado`): o faturamento estimado da base
--    (US-0006) entra na empresa assim, separado do Estimado e do Apurado pelo time.
--
-- As duas listas também mudam na tela (src/types/prospect.ts) e no MCP da Prospecção
-- (apps/mcp-prospeccao), juntas (TD-0022).
--
-- Rollback: supabase/rollback/20261118120000_base_da_receita_na_prospeccao_rollback.sql

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_lever_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_lever_valid CHECK (
  lever IS NULL OR lever IN (
    'rede_origami', 'outbound', 'inbound', 'abm', 'indicacao_parceiros',
    'recomendacao', 'feira', 'sindicato', 'expansao', 'base_receita'
  )
);

ALTER TABLE public.prospect_companies DROP CONSTRAINT IF EXISTS prospect_companies_faturamento_base_valida;
ALTER TABLE public.prospect_companies ADD CONSTRAINT prospect_companies_faturamento_base_valida
  CHECK (faturamento_anual_base IS NULL OR faturamento_anual_base IN ('estimado', 'apurado', 'calculado'));

COMMENT ON COLUMN public.prospect_companies.faturamento_anual IS
  'Faturamento anual em reais. Base obrigatória junto: estimado ou apurado (informado pelo time) '
  'ou calculado (estimativa da base da Receita ao abrir a oportunidade, US-0008).';
