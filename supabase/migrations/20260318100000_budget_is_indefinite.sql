-- Add is_indefinite flag to budgets table
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS is_indefinite BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.budgets.is_indefinite IS 'True when the project has no defined end date (continuous renewal). duration_months defaults to 12 for calculation purposes.';
