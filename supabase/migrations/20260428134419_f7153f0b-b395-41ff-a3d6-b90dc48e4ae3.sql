ALTER TABLE public.strategy_initiatives
ADD COLUMN IF NOT EXISTS notes text;

UPDATE public.strategy_initiatives
SET notes = description
WHERE notes IS NULL
  AND description IS NOT NULL;