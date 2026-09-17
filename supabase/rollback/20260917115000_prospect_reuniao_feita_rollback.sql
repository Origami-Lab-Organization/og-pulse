-- Reversão de 20260917115000_prospect_reuniao_feita.sql.
--
-- Os contatos que estiverem em `reuniao_feita` voltam para `reuniao_agendada`: a etapa
-- deixa de existir e o CHECK antigo recusaria as linhas. Volta para a agendada, e não para
-- a qualificada, porque rebaixar é recuperável e promover sem avaliação não é.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

UPDATE public.prospects SET stage = 'reuniao_agendada' WHERE stage = 'reuniao_feita';

ALTER TABLE public.prospects DROP CONSTRAINT prospects_stage_valid;

ALTER TABLE public.prospects ADD CONSTRAINT prospects_stage_valid CHECK (stage IN (
  'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'qualificado',
  'sem_resposta', 'descartado', 'convertido'
));

DROP INDEX IF EXISTS public.prospects_today_idx;

CREATE INDEX prospects_today_idx
  ON public.prospects (tenant_id, owner_id, next_activity_on)
  WHERE stage IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'qualificado');
