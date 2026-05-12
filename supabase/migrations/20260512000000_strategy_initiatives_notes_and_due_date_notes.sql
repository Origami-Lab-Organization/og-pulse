-- Add notes and due_date_notes columns to strategy_initiatives.
-- notes: free-form context, decisions, next steps. Backfilled from description for existing rows.
-- due_date_notes: optional explanation for why the deadline was set.

ALTER TABLE public.strategy_initiatives
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS due_date_notes text;

UPDATE public.strategy_initiatives
SET notes = description
WHERE notes IS NULL
  AND description IS NOT NULL;
