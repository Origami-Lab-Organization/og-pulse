-- Create budget_materials table for storing materials in budgets
CREATE TABLE public.budget_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view budget materials in their tenant"
ON public.budget_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_materials.budget_id
    AND user_belongs_to_tenant(auth.uid(), b.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert budget materials"
ON public.budget_materials
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_materials.budget_id
    AND is_admin_or_manager(auth.uid(), b.tenant_id)
  )
);

CREATE POLICY "Admins and managers can update budget materials"
ON public.budget_materials
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_materials.budget_id
    AND is_admin_or_manager(auth.uid(), b.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete budget materials"
ON public.budget_materials
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_materials.budget_id
    AND is_admin_or_manager(auth.uid(), b.tenant_id)
  )
);