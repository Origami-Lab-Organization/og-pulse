-- Create enums for project and installment status
CREATE TYPE project_status AS ENUM (
  'planning',
  'active',
  'paused',
  'completed',
  'cancelled'
);

CREATE TYPE installment_status AS ENUM (
  'pending',
  'invoiced',
  'received',
  'overdue'
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  manager_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  budget_id UUID NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'mensal',
  installments_count INT NOT NULL DEFAULT 1,
  first_invoice_date DATE NULL,
  due_day INT NOT NULL DEFAULT 10 CHECK (due_day >= 1 AND due_day <= 31),
  status project_status NOT NULL DEFAULT 'planning',
  contract_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_members table
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  seniority TEXT NOT NULL DEFAULT 'pleno',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, employee_id)
);

-- Create project_installments table
CREATE TABLE public.project_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status installment_status NOT NULL DEFAULT 'pending',
  invoice_number TEXT NULL,
  invoice_date DATE NULL,
  payment_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, installment_number)
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_installments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their tenant"
ON public.projects FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can insert projects"
ON public.projects FOR INSERT
WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can update projects"
ON public.projects FOR UPDATE
USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete projects"
ON public.projects FOR DELETE
USING (is_admin_or_manager(auth.uid(), tenant_id));

-- RLS Policies for project_members (based on project's tenant)
CREATE POLICY "Users can view project members in their tenant"
ON public.project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert project members"
ON public.project_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can update project members"
ON public.project_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete project members"
ON public.project_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- RLS Policies for project_installments (based on project's tenant)
CREATE POLICY "Users can view project installments in their tenant"
ON public.project_installments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert project installments"
ON public.project_installments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can update project installments"
ON public.project_installments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete project installments"
ON public.project_installments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- Create storage bucket for contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false);

-- Storage policies for contracts bucket
CREATE POLICY "Admins and managers can upload contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contracts' AND
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_id = auth.uid()
    AND (
      e.is_gerente = true OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = e.tenant_id
        AND ur.role IN ('admin', 'manager')
      )
    )
  )
);

CREATE POLICY "Users can view contracts in their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts' AND
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_id = auth.uid()
  )
);

CREATE POLICY "Admins and managers can delete contracts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contracts' AND
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_id = auth.uid()
    AND (
      e.is_gerente = true OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = e.tenant_id
        AND ur.role IN ('admin', 'manager')
      )
    )
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_installments_updated_at
BEFORE UPDATE ON public.project_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to mark overdue installments
CREATE OR REPLACE FUNCTION public.update_overdue_installments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.project_installments
  SET status = 'overdue'
  WHERE status IN ('pending', 'invoiced')
    AND due_date < CURRENT_DATE;
END;
$$;