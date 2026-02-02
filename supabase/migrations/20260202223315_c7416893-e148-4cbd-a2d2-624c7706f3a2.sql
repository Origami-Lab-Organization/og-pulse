-- Create budget_versions table for storing version history
CREATE TABLE public.budget_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.employees(id),
  snapshot_data jsonb NOT NULL,
  change_summary text,
  
  CONSTRAINT budget_versions_version_number_positive CHECK (version_number > 0),
  CONSTRAINT budget_versions_unique_version UNIQUE (budget_id, version_number)
);

-- Create index for faster queries
CREATE INDEX idx_budget_versions_budget_id ON public.budget_versions(budget_id);
CREATE INDEX idx_budget_versions_created_at ON public.budget_versions(created_at DESC);

-- Enable RLS
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar to other budget_* tables)
CREATE POLICY "Users can view budget versions in their tenant"
ON public.budget_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_versions.budget_id
    AND user_belongs_to_tenant(auth.uid(), b.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert budget versions"
ON public.budget_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_versions.budget_id
    AND is_admin_or_manager(auth.uid(), b.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete budget versions"
ON public.budget_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_versions.budget_id
    AND is_admin_or_manager(auth.uid(), b.tenant_id)
  )
);