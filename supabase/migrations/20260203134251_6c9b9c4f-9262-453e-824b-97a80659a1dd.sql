-- Add duration_months column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS duration_months INTEGER NOT NULL DEFAULT 1;

-- Add month_number column to project_materials
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS month_number INTEGER DEFAULT 1;

-- Create project_member_months table
CREATE TABLE IF NOT EXISTS public.project_member_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_member_id UUID NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(project_member_id, month_number)
);

-- Create project_supplier_months table
CREATE TABLE IF NOT EXISTS public.project_supplier_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_supplier_id UUID NOT NULL REFERENCES project_suppliers(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(project_supplier_id, month_number)
);

-- Enable RLS on new tables
ALTER TABLE public.project_member_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_supplier_months ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_member_months
CREATE POLICY "Users can view project member months in their tenant"
ON public.project_member_months
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.id = project_member_months.project_member_id
    AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert project member months"
ON public.project_member_months
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.id = project_member_months.project_member_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can update project member months"
ON public.project_member_months
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.id = project_member_months.project_member_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete project member months"
ON public.project_member_months
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.id = project_member_months.project_member_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- RLS Policies for project_supplier_months
CREATE POLICY "Users can view project supplier months in their tenant"
ON public.project_supplier_months
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_suppliers ps
    JOIN projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_months.project_supplier_id
    AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert project supplier months"
ON public.project_supplier_months
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_suppliers ps
    JOIN projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_months.project_supplier_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can update project supplier months"
ON public.project_supplier_months
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_suppliers ps
    JOIN projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_months.project_supplier_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete project supplier months"
ON public.project_supplier_months
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM project_suppliers ps
    JOIN projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_months.project_supplier_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);