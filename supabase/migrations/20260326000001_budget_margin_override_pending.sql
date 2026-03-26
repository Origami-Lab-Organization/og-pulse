-- Add margin_override_pending flag to budgets
-- Allows non-admin users to save a budget with below-minimum margin
-- and request approval from admins

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS margin_override_pending boolean NOT NULL DEFAULT false;
