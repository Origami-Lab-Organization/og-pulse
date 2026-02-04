-- Create table for timesheets (actual labor hours)
CREATE TABLE public.project_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_member_id UUID NOT NULL REFERENCES public.project_members(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.employees(id),
  
  UNIQUE(project_member_id, work_date)
);

-- Create table for actual supplier costs
CREATE TABLE public.project_supplier_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_supplier_id UUID NOT NULL REFERENCES public.project_suppliers(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  invoice_number TEXT,
  invoice_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(project_supplier_id, month_number)
);

-- Enable RLS on both tables
ALTER TABLE public.project_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_supplier_actuals ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_timesheets
CREATE POLICY "Users can view project timesheets in their tenant"
ON public.project_timesheets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_timesheets.project_id
    AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert project timesheets"
ON public.project_timesheets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_timesheets.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can update project timesheets"
ON public.project_timesheets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_timesheets.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete project timesheets"
ON public.project_timesheets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_timesheets.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- RLS policies for project_supplier_actuals
CREATE POLICY "Users can view project supplier actuals in their tenant"
ON public.project_supplier_actuals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_suppliers ps
    JOIN public.projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_actuals.project_supplier_id
    AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert project supplier actuals"
ON public.project_supplier_actuals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_suppliers ps
    JOIN public.projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_actuals.project_supplier_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can update project supplier actuals"
ON public.project_supplier_actuals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_suppliers ps
    JOIN public.projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_actuals.project_supplier_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete project supplier actuals"
ON public.project_supplier_actuals
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_suppliers ps
    JOIN public.projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_actuals.project_supplier_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);