-- Rollback de 20261118160000_tipo_de_conta.sql: tira o tipo de conta e devolve a alavanca
-- base_receita à lista (como ficou em 20261118120000).

ALTER TABLE public.prospect_companies DROP CONSTRAINT IF EXISTS prospect_companies_tipo_conta_valido;
ALTER TABLE public.prospect_companies DROP COLUMN IF EXISTS tipo_conta;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_lever_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_lever_valid CHECK (
  lever IS NULL OR lever IN (
    'rede_origami', 'outbound', 'inbound', 'abm', 'indicacao_parceiros',
    'recomendacao', 'feira', 'sindicato', 'expansao', 'base_receita'
  )
);
