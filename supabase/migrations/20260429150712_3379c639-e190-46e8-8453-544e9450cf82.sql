-- Add template support to budgets table
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_for_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

-- Add template reference to services table
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS template_budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL;

-- Index for fast lookup of template budgets by service
CREATE INDEX IF NOT EXISTS idx_budgets_template_for_service ON public.budgets(template_for_service_id) WHERE is_template = true;