-- Create role_rates table for storing billing rates per role/seniority
CREATE TABLE public.role_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  role_name TEXT NOT NULL,
  seniority TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, role_name, seniority)
);

-- Enable RLS
ALTER TABLE public.role_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users in the same tenant can view role rates
CREATE POLICY "Users can view role rates in their tenant"
ON public.role_rates
FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Only admins can insert role rates
CREATE POLICY "Admins can insert role rates"
ON public.role_rates
FOR INSERT
WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Only admins can update role rates
CREATE POLICY "Admins can update role rates"
ON public.role_rates
FOR UPDATE
USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Only admins can delete role rates
CREATE POLICY "Admins can delete role rates"
ON public.role_rates
FOR DELETE
USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_role_rates_updated_at
BEFORE UPDATE ON public.role_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();