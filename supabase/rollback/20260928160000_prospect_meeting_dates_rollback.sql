-- Reversão de 20260928160000_prospect_meeting_dates.sql.
--
-- Os eventos reconstruídos de reunião voltam a ser o marco `anterior` (data desconhecida),
-- e o trigger volta a datar toda mudança no dia de hoje.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP FUNCTION IF EXISTS public.set_prospect_stage(uuid, text, date);

CREATE OR REPLACE FUNCTION public.prospect_stage_changes_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  origem text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    origem := OLD.stage;
  END IF;

  INSERT INTO public.prospect_stage_changes
    (tenant_id, prospect_id, from_stage, to_stage, discard_reason, occurred_on, source, changed_by)
  VALUES (
    NEW.tenant_id,
    NEW.id,
    origem,
    NEW.stage,
    CASE WHEN NEW.stage = 'descartado' THEN NEW.discard_reason END,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date,
    'registrado',
    (SELECT e.id FROM public.employees e WHERE e.auth_id = auth.uid() AND e.tenant_id = NEW.tenant_id LIMIT 1)
  );

  RETURN NULL;
END;
$$;

-- Recoloca o marco `anterior` de quem teve a reunião reconstruída e apaga a reconstrução.
INSERT INTO public.prospect_stage_changes (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source)
SELECT DISTINCT ON (m.prospect_id) m.tenant_id, m.prospect_id, NULL, p.stage, m.created_at::date, 'anterior'
  FROM public.prospect_stage_changes m
  JOIN public.prospects p ON p.id = m.prospect_id
 WHERE m.source = 'reconstruido'
   AND m.to_stage IN ('reuniao_agendada', 'reuniao_feita')
 ORDER BY m.prospect_id, m.created_at;

DELETE FROM public.prospect_stage_changes
 WHERE source = 'reconstruido'
   AND to_stage IN ('reuniao_agendada', 'reuniao_feita');
