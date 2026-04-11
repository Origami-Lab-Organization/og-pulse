CREATE OR REPLACE FUNCTION public.assign_activity_card_number()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT coalesce(max(card_number), 0) + 1
    INTO NEW.card_number
    FROM public.project_activity_cards
   WHERE project_id = NEW.project_id;
  RETURN NEW;
END;
$$;