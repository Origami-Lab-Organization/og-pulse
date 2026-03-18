-- Add is_recurring flag to budgets table
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.budgets.is_recurring IS 'True when budget uses recurring (monthly) billing mode';
