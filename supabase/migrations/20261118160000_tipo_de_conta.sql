-- US-0008 revista (18/11/2026): colocar empresas para abordar com o tipo de conta.
--
-- 1. Tipo de conta da empresa: Âncora, Ponte ou Satélite (lista fechada; nulo = ainda não
--    classificada). Obrigatório ao colocar para abordar pela tela Empresas, sugerido pelo
--    faturamento; editável na ficha da empresa. Substitui o Tier (que sai na US-0017).
-- 2. A alavanca "Base da Receita" sai: alavanca é o canal de chegada, definida ao abordar
--    (decisão do Victor, 18/11/2026). Nenhuma oportunidade a usava (conferido em 18/11/2026).
--
-- Também na tela (src/types/prospect.ts) e no MCP da Prospecção (TD-0022).
-- Rollback: supabase/rollback/20261118160000_tipo_de_conta_rollback.sql

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS tipo_conta text,
  ADD CONSTRAINT prospect_companies_tipo_conta_valido
    CHECK (tipo_conta IS NULL OR tipo_conta IN ('ancora', 'ponte', 'satelite'));

COMMENT ON COLUMN public.prospect_companies.tipo_conta IS
  'Tipo de conta da Origami: ancora (acima de R$ 300 mi), ponte (R$ 100 a 300 mi) ou satelite '
  '(R$ 10 a 100 mi). Nulo = não classificada. Substitui o Tier (US-0008, US-0017).';

UPDATE public.prospects SET lever = NULL WHERE lever = 'base_receita';
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_lever_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_lever_valid CHECK (
  lever IS NULL OR lever IN (
    'rede_origami', 'outbound', 'inbound', 'abm', 'indicacao_parceiros',
    'recomendacao', 'feira', 'sindicato', 'expansao'
  )
);
