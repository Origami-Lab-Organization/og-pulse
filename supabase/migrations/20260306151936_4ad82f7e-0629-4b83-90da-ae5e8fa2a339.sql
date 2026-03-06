ALTER TABLE public.budgets
  ADD COLUMN margin_override_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN margin_override_approved_by uuid,
  ADD COLUMN margin_override_approved_at timestamptz;