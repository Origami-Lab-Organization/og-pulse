-- Prospecção — nova etapa "Reunião feita" entre agendada e qualificada.
--
-- Decisão de 17/09/2026 (Guilherme): o funil do time separa reunião AGENDADA de reunião
-- REALIZADA, e a distância entre as duas é a taxa de comparecimento — a métrica que
-- mostra quando a agenda enche e a conversa não acontece. Sem a etapa, o módulo não tinha
-- como calcular isso, e o passo simplesmente não existia no dashboard.
--
-- `qualificado` NÃO vira valor novo: só muda de rótulo na interface, para "Oportunidade
-- qualificada". Criar uma etapa nova para a mesma coisa deixaria para trás todo contato já
-- qualificado e exigiria backfill sem ganho nenhum.
--
-- O índice parcial da view "Atividades de hoje" é recriado junto: ele lista as etapas do
-- funil uma a uma, e um índice que não conhece a etapa nova deixaria de cobrir a consulta
-- mais quente do módulo sem nenhum aviso — a query continuaria correta, só mais lenta.
--
-- Rollback: supabase/rollback/20260917115000_prospect_reuniao_feita_rollback.sql

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_stage_valid;

ALTER TABLE public.prospects ADD CONSTRAINT prospects_stage_valid CHECK (stage IN (
  'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado',
  'sem_resposta', 'descartado', 'convertido'
));

DROP INDEX IF EXISTS public.prospects_today_idx;

CREATE INDEX prospects_today_idx
  ON public.prospects (tenant_id, owner_id, next_activity_on)
  WHERE stage IN (
    'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado'
  );

COMMENT ON COLUMN public.prospects.stage IS
  'Etapa do funil frio. Seis etapas de progresso (a_abordar, em_cadencia, respondeu, '
  'reuniao_agendada, reuniao_feita, qualificado) e três desfechos que não são avanço '
  '(sem_resposta, descartado, convertido). reuniao_feita entrou em 17/09/2026 para tornar '
  'a taxa de comparecimento calculável.';
