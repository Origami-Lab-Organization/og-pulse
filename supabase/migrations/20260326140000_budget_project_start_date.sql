-- Add project_start_date to budgets
-- Only filled when budget reaches 'active' status (Negócio Fechado)
-- start_date is now used as the budget/proposal creation date

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS project_start_date date NULL;
