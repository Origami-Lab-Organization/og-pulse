ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS billing_type text
    CHECK (billing_type IN ('fixed_scope','recurring','success_fee','no_revenue')),
  ADD COLUMN IF NOT EXISTS success_fee_percent numeric,
  ADD COLUMN IF NOT EXISTS expected_revenue_12m numeric,
  ADD COLUMN IF NOT EXISTS planned_costs numeric,
  ADD COLUMN IF NOT EXISTS success_fee_type text
    CHECK (success_fee_type IN ('pontual','continuo'));