-- Reversão de 20261021137000_meu_kanban_vinculo_com_projeto.sql.
-- Os cards pessoais e as atividades criadas pelo vínculo continuam existindo; só deixam de
-- andar juntos. A função personal_kanban_cards_before_write volta à versão de 20261021135000.

DROP TRIGGER IF EXISTS project_activity_cards_sync_personal ON public.project_activity_cards;
DROP FUNCTION IF EXISTS public.sync_personal_cards_from_activity();

CREATE OR REPLACE FUNCTION public.personal_kanban_cards_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_stage text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.remind_at IS DISTINCT FROM OLD.remind_at THEN
    NEW.reminder_sent_at := NULL;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.column_id IS DISTINCT FROM OLD.column_id THEN
    SELECT col.stage INTO v_stage FROM public.personal_kanban_columns col WHERE col.id = NEW.column_id;
    IF v_stage = 'done' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    ELSE
      NEW.completed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.activity_column_stage(text);
DROP INDEX IF EXISTS public.idx_pkcard_activity;
DROP INDEX IF EXISTS public.personal_kanban_cards_employee_activity_key;
ALTER TABLE public.personal_kanban_cards DROP COLUMN IF EXISTS project_activity_card_id;
