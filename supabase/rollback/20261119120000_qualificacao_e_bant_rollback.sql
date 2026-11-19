-- Rollback de 20261119120000_qualificacao_e_bant.
-- Oportunidades em Qualificação voltam para A abordar; as evidências do BANT são apagadas.

DROP TABLE IF EXISTS public.prospect_bant_evidencias;
DROP FUNCTION IF EXISTS public.prospect_bant_evidencias_guard();

UPDATE public.prospects SET stage = 'a_abordar' WHERE stage = 'qualificacao';

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_stage_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_stage_valid CHECK (
  stage = ANY (ARRAY[
    'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita',
    'qualificado', 'ganho', 'descartado', 'sem_resposta'
  ])
);

CREATE OR REPLACE FUNCTION public.prospect_activities_advance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  cadencia CONSTANT integer[] := ARRAY[3, 4, 5];
  pai      record;
  etapa    text;
  proxima  date;
BEGIN
  SELECT stage, next_activity_on
    INTO pai
    FROM public.prospects
   WHERE id = NEW.prospect_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contato de prospecção não encontrado.' USING ERRCODE = 'PU001';
  END IF;

  etapa := pai.stage;

  IF pai.stage IN ('a_abordar', 'em_cadencia') THEN
    IF NEW.got_response THEN
      etapa   := 'respondeu';
      proxima := NULL;
    ELSE
      etapa   := 'em_cadencia';
      proxima := CASE
                   WHEN NEW.sequence_no <= array_length(cadencia, 1)
                     THEN NEW.activity_date + cadencia[NEW.sequence_no]
                 END;
    END IF;
  ELSE
    proxima := CASE
                 WHEN pai.next_activity_on > NEW.activity_date THEN pai.next_activity_on
                 ELSE NULL
               END;
  END IF;

  UPDATE public.prospects
     SET activity_count   = NEW.sequence_no,
         stage            = etapa,
         next_activity_on = proxima,
         first_touch_at   = COALESCE(first_touch_at, NEW.activity_date)
   WHERE id = NEW.prospect_id;

  RETURN NULL;
END;
$function$;
