-- Prospecção — Alavanca vira lista fechada.
--
-- Decisão de 17/09/2026 (Guilherme): a alavanca é um CORTE de métrica, e corte digitado à
-- mão não soma. "Rede do Sócio", "rede dos socios" e "Rede Origami" viram três linhas do
-- mesmo fato no dashboard, e o número que deveria dizer o que faz responder passa a dizer
-- como cada pessoa digita.
--
-- Guardado em SLUG, não em rótulo — mesma escolha de `discard_reason`. O pedido que gerou
-- esta migration foi exatamente uma renomeação ("Rede dos Sócios" -> "Rede Origami"): com
-- rótulo no banco, toda troca de nome vira migration; com slug, vira uma linha de tradução
-- na interface.
--
-- As nove alavancas são a lista do time (17/09/2026).
--
-- Rollback: supabase/rollback/20260917120000_prospect_lever_closed_list_rollback.sql

-- 1) Normaliza o que já existe. Variantes com e sem acento listadas explicitamente para não
--    depender da extensão `unaccent`, que não está instalada.
UPDATE public.prospects SET lever = CASE lower(btrim(lever))
    WHEN 'rede origami'          THEN 'rede_origami'
    WHEN 'rede do sócio'         THEN 'rede_origami'
    WHEN 'rede do socio'         THEN 'rede_origami'
    WHEN 'rede dos sócios'       THEN 'rede_origami'
    WHEN 'rede dos socios'       THEN 'rede_origami'
    WHEN 'rede de sócios'        THEN 'rede_origami'
    WHEN 'rede de socios'        THEN 'rede_origami'
    WHEN 'outbound'              THEN 'outbound'
    WHEN 'inbound'               THEN 'inbound'
    WHEN 'abm'                   THEN 'abm'
    WHEN 'indicação de parceiros' THEN 'indicacao_parceiros'
    WHEN 'indicacao de parceiros' THEN 'indicacao_parceiros'
    WHEN 'indicação'             THEN 'indicacao_parceiros'
    WHEN 'indicacao'             THEN 'indicacao_parceiros'
    WHEN 'recomendação'          THEN 'recomendacao'
    WHEN 'recomendacao'          THEN 'recomendacao'
    WHEN 'feira'                 THEN 'feira'
    WHEN 'sindicato'             THEN 'sindicato'
    WHEN 'expansão'              THEN 'expansao'
    WHEN 'expansao'              THEN 'expansao'
    ELSE lever
  END
WHERE lever IS NOT NULL;

-- 2) Guarda explícito ANTES do CHECK. Falhar aqui derruba o build com a lista do que não foi
--    reconhecido, que é acionável; o CHECK sozinho diria só "violates constraint". Perder o
--    valor em silêncio (virar NULL) seria pior que qualquer das duas.
DO $$
DECLARE
  desconhecidos text;
BEGIN
  SELECT string_agg(DISTINCT lever, ', ') INTO desconhecidos
  FROM public.prospects
  WHERE lever IS NOT NULL
    AND lever NOT IN (
      'rede_origami', 'outbound', 'inbound', 'abm', 'indicacao_parceiros',
      'recomendacao', 'feira', 'sindicato', 'expansao'
    );

  IF desconhecidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Alavancas fora da lista fechada: %. Acrescente o mapeamento no passo 1 desta migration e reaplique.',
      desconhecidos;
  END IF;
END $$;

ALTER TABLE public.prospects ADD CONSTRAINT prospects_lever_valid CHECK (
  lever IS NULL OR lever IN (
    'rede_origami', 'outbound', 'inbound', 'abm', 'indicacao_parceiros',
    'recomendacao', 'feira', 'sindicato', 'expansao'
  )
);

COMMENT ON COLUMN public.prospects.lever IS
  'Alavanca / origem da lista — lista FECHADA em slug (ver PROSPECT_LEVERS em '
  'src/types/prospect.ts). É o corte que explica O QUE faz responder; texto livre aqui não '
  'soma no dashboard.';
