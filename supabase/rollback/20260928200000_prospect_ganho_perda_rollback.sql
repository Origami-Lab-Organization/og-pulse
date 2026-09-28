-- Reversão de 20260928200000_prospect_ganho_perda.sql.
--
-- COM PERDA DE DADO — exporte `prospects` antes:
--   - contatos em Ganho voltam para Oportunidade qualificada, e data e valor do ganho somem;
--   - motivos sem equivalente na lista antiga (sem_resposta, proposta_preco,
--     proposta_escopo) viram sem_interesse; contato_invalido vira contato_errado;
--   - quem saiu de "Sem resposta" para "Em cadência" na migration continua em cadência.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP FUNCTION IF EXISTS public.mark_prospect_won(uuid, date, numeric);
DROP TRIGGER IF EXISTS prospects_outcome_rules ON public.prospects;
DROP FUNCTION IF EXISTS public.prospects_outcome_rules();

ALTER TABLE public.prospects DISABLE TRIGGER prospect_stage_changes_on_update;

UPDATE public.prospects
   SET stage = 'qualificado', closed_at = NULL
 WHERE stage = 'ganho';

ALTER TABLE public.prospects ENABLE TRIGGER prospect_stage_changes_on_update;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_won_has_date;
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_won_value_valid;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS won_on;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS won_value;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_stage_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_stage_valid CHECK (stage IN (
  'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado',
  'sem_resposta', 'descartado', 'convertido'
));

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_discard_reason_valid;
UPDATE public.prospects
   SET discard_reason = CASE discard_reason
                          WHEN 'concorrente' THEN 'concorrente_incumbente'
                          WHEN 'contato_invalido' THEN 'contato_errado'
                          WHEN 'sem_resposta' THEN 'sem_interesse'
                          WHEN 'proposta_preco' THEN 'sem_interesse'
                          WHEN 'proposta_escopo' THEN 'sem_interesse'
                          ELSE discard_reason
                        END
 WHERE discard_reason IN ('concorrente', 'contato_invalido', 'sem_resposta', 'proposta_preco', 'proposta_escopo');
ALTER TABLE public.prospects ADD CONSTRAINT prospects_discard_reason_valid CHECK (
  discard_reason IS NULL OR discard_reason IN (
    'sem_fit', 'sem_orcamento', 'concorrente_incumbente', 'contato_errado',
    'sem_interesse', 'momento_errado', 'dados_invalidos', 'pediu_para_parar'
  )
);

CREATE OR REPLACE FUNCTION public.prospect_activities_advance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cadencia CONSTANT integer[] := ARRAY[3, 4, 5];
  pai      record;
  etapa    text;
  proxima  date;
BEGIN
  SELECT stage, next_activity_on INTO pai FROM public.prospects WHERE id = NEW.prospect_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contato de prospecção não encontrado.' USING ERRCODE = 'PU001';
  END IF;
  etapa := pai.stage;
  IF pai.stage IN ('a_abordar', 'em_cadencia') THEN
    IF NEW.got_response THEN
      etapa := 'respondeu'; proxima := NULL;
    ELSIF NEW.sequence_no > array_length(cadencia, 1) THEN
      etapa := 'sem_resposta'; proxima := NULL;
    ELSE
      etapa := 'em_cadencia'; proxima := NEW.activity_date + cadencia[NEW.sequence_no];
    END IF;
  ELSE
    proxima := CASE WHEN pai.next_activity_on > NEW.activity_date THEN pai.next_activity_on ELSE NULL END;
  END IF;
  UPDATE public.prospects
     SET activity_count = NEW.sequence_no, stage = etapa, next_activity_on = proxima,
         first_touch_at = COALESCE(first_touch_at, NEW.activity_date)
   WHERE id = NEW.prospect_id;
  RETURN NULL;
END;
$$;
