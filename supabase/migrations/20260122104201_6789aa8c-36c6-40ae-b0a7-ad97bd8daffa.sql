-- Create budget status enum
CREATE TYPE public.budget_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  budget_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status budget_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  
  -- Cliente ou Lead
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_name TEXT,
  lead_contact TEXT,
  
  -- Período do Projeto
  start_date DATE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  
  -- Snapshot dos percentuais financeiros
  admin_expenses_percent NUMERIC NOT NULL DEFAULT 0,
  taxes_percent NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  
  -- Valores calculados
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total_with_fees NUMERIC NOT NULL DEFAULT 0,
  final_total NUMERIC NOT NULL DEFAULT 0,
  
  -- Metadados
  notes TEXT,
  created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint: ou client_id ou lead_name
  CONSTRAINT budget_client_or_lead CHECK (
    (client_id IS NOT NULL) OR (lead_name IS NOT NULL AND lead_name != '')
  ),
  
  -- Unique budget number per tenant
  CONSTRAINT unique_budget_number_per_tenant UNIQUE (tenant_id, budget_number)
);

-- Create budget_roles table (papéis alocados)
CREATE TABLE public.budget_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  role_rate_id UUID REFERENCES public.role_rates(id) ON DELETE SET NULL,
  role_name TEXT NOT NULL,
  seniority TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget_role_months table (horas por mês)
CREATE TABLE public.budget_role_months (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_role_id UUID NOT NULL REFERENCES public.budget_roles(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  
  -- Unique month per role
  CONSTRAINT unique_month_per_role UNIQUE (budget_role_id, month_number),
  
  -- Valid hours
  CONSTRAINT valid_hours CHECK (hours >= 0)
);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_role_months ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budgets
CREATE POLICY "Users can view budgets in their tenant"
ON public.budgets FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can insert budgets"
ON public.budgets FOR INSERT
WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can update budgets"
ON public.budgets FOR UPDATE
USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete budgets"
ON public.budgets FOR DELETE
USING (is_admin_or_manager(auth.uid(), tenant_id));

-- RLS Policies for budget_roles
CREATE POLICY "Users can view budget roles in their tenant"
ON public.budget_roles FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_roles.budget_id
  AND user_belongs_to_tenant(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can insert budget roles"
ON public.budget_roles FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_roles.budget_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can update budget roles"
ON public.budget_roles FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_roles.budget_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can delete budget roles"
ON public.budget_roles FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.budgets b
  WHERE b.id = budget_roles.budget_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

-- RLS Policies for budget_role_months
CREATE POLICY "Users can view budget role months in their tenant"
ON public.budget_role_months FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.budget_roles br
  JOIN public.budgets b ON b.id = br.budget_id
  WHERE br.id = budget_role_months.budget_role_id
  AND user_belongs_to_tenant(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can insert budget role months"
ON public.budget_role_months FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.budget_roles br
  JOIN public.budgets b ON b.id = br.budget_id
  WHERE br.id = budget_role_months.budget_role_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can update budget role months"
ON public.budget_role_months FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.budget_roles br
  JOIN public.budgets b ON b.id = br.budget_id
  WHERE br.id = budget_role_months.budget_role_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

CREATE POLICY "Admins and managers can delete budget role months"
ON public.budget_role_months FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.budget_roles br
  JOIN public.budgets b ON b.id = br.budget_id
  WHERE br.id = budget_role_months.budget_role_id
  AND is_admin_or_manager(auth.uid(), b.tenant_id)
));

-- Trigger for updated_at
CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate next budget number
CREATE OR REPLACE FUNCTION public.generate_budget_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.budgets
  WHERE tenant_id = p_tenant_id
  AND budget_number LIKE 'ORC-' || v_year || '-%';
  
  v_number := 'ORC-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  
  RETURN v_number;
END;
$$;