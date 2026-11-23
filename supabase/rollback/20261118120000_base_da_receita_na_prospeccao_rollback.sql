-- Rollback de 20261118120000_base_da_receita_na_prospeccao.sql.
-- Antes de voltar as listas, os valores novos viram nulo (alavanca) ou estimado (faturamento),
-- senão as restrições antigas recusam as linhas.

UPDATE public.prospects SET lever = NULL WHERE lever = 'base_receita';
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_lever_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_lever_valid CHECK (
  lever IS NULL OR lever IN (
    'rede_origami', 'outbound', 'inbound', 'abm', 'indicacao_parceiros',
    'recomendacao', 'feira', 'sindicato', 'expansao'
  )
);

UPDATE public.prospect_companies SET faturamento_anual_base = 'estimado' WHERE faturamento_anual_base = 'calculado';
ALTER TABLE public.prospect_companies DROP CONSTRAINT IF EXISTS prospect_companies_faturamento_base_valida;
ALTER TABLE public.prospect_companies ADD CONSTRAINT prospect_companies_faturamento_base_valida
  CHECK (faturamento_anual_base IS NULL OR faturamento_anual_base IN ('estimado', 'apurado'));
