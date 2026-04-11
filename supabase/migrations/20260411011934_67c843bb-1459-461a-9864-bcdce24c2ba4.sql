-- Add card_number column
ALTER TABLE public.project_activity_cards
  ADD COLUMN IF NOT EXISTS card_number integer;

-- Function to assign sequential number per project
CREATE OR REPLACE FUNCTION public.assign_activity_card_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT coalesce(max(card_number), 0) + 1
    INTO NEW.card_number
    FROM public.project_activity_cards
   WHERE project_id = NEW.project_id;
  RETURN NEW;
END;
$$;

-- Trigger before INSERT
CREATE TRIGGER trg_assign_activity_card_number
BEFORE INSERT ON public.project_activity_cards
FOR EACH ROW EXECUTE FUNCTION public.assign_activity_card_number();

-- Back-fill existing cards
WITH numbered AS (
  SELECT id,
         row_number() OVER (PARTITION BY project_id ORDER BY created_at) AS rn
    FROM public.project_activity_cards
   WHERE card_number IS NULL
)
UPDATE public.project_activity_cards c
   SET card_number = n.rn
  FROM numbered n
 WHERE c.id = n.id;