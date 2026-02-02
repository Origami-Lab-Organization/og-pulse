-- Create table for project suppliers (recurring external service costs)
CREATE TABLE public.project_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  monthly_value numeric NOT NULL DEFAULT 0,
  start_month integer NOT NULL DEFAULT 1,
  end_month integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for project materials (one-off costs)
CREATE TABLE public.project_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  purchase_date date,
  is_realized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.project_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_suppliers
CREATE POLICY "Users can view project suppliers in their tenant"
ON public.project_suppliers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_suppliers.project_id
  AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can insert project suppliers"
ON public.project_suppliers FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_suppliers.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can update project suppliers"
ON public.project_suppliers FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_suppliers.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can delete project suppliers"
ON public.project_suppliers FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_suppliers.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

-- RLS policies for project_materials
CREATE POLICY "Users can view project materials in their tenant"
ON public.project_materials FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_materials.project_id
  AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can insert project materials"
ON public.project_materials FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_materials.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can update project materials"
ON public.project_materials FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_materials.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can delete project materials"
ON public.project_materials FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_materials.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));