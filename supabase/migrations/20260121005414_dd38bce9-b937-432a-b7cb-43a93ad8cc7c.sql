-- Create function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('admin', 'manager')
  )
  OR EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_id = _user_id
      AND tenant_id = _tenant_id
      AND is_gerente = true
  )
$$;

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  trading_name TEXT,
  cnpj TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Users can view clients in their tenant"
ON public.clients
FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can update clients"
ON public.clients
FOR UPDATE
USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete clients"
ON public.clients
FOR DELETE
USING (is_admin_or_manager(auth.uid(), tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX idx_clients_company_name ON public.clients(company_name);