-- Add monthly_value to budgets for recurring billing type
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS monthly_value NUMERIC(14,2) DEFAULT NULL;

COMMENT ON COLUMN public.budgets.monthly_value IS 'Monthly recurring value for billing_type = recurring budgets';
