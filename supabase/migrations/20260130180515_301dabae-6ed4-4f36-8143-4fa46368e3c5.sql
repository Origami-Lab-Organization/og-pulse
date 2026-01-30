-- 1. Create budget_suppliers table for vendor/supplier costs
CREATE TABLE public.budget_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_suppliers (same pattern as budget_materials)
CREATE POLICY "Users can view budget suppliers in their tenant"
ON public.budget_suppliers
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_suppliers.budget_id
  AND user_belongs_to_tenant(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can insert budget suppliers"
ON public.budget_suppliers
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_suppliers.budget_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can update budget suppliers"
ON public.budget_suppliers
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_suppliers.budget_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can delete budget suppliers"
ON public.budget_suppliers
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_suppliers.budget_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

-- 2. Add net_margin_percent to financial_settings
ALTER TABLE public.financial_settings 
ADD COLUMN net_margin_percent NUMERIC NOT NULL DEFAULT 0;