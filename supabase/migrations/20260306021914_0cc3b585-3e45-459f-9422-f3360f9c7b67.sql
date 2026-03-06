
-- Create project_commissions table
CREATE TABLE public.project_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installment_id uuid NOT NULL REFERENCES public.project_installments(id) ON DELETE CASCADE,
  planned_value numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_date date,
  paid_to text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_commissions ENABLE ROW LEVEL SECURITY;

-- SELECT: users in same tenant
CREATE POLICY "Users can view project commissions in their tenant"
ON public.project_commissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_commissions.project_id
    AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

-- INSERT: admins and managers
CREATE POLICY "Admins and managers can insert project commissions"
ON public.project_commissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_commissions.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- UPDATE: admins and managers
CREATE POLICY "Admins and managers can update project commissions"
ON public.project_commissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_commissions.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- DELETE: admins and managers
CREATE POLICY "Admins and managers can delete project commissions"
ON public.project_commissions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_commissions.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);
