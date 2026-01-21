-- Create financial settings table for tenant-level configuration
CREATE TABLE public.financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  admin_expenses_percent NUMERIC NOT NULL DEFAULT 0,
  taxes_percent NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their tenant's financial settings
CREATE POLICY "Users can view financial settings in their tenant"
ON public.financial_settings
FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Only admins can insert financial settings
CREATE POLICY "Admins can insert financial settings"
ON public.financial_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Only admins can update financial settings
CREATE POLICY "Admins can update financial settings"
ON public.financial_settings
FOR UPDATE
USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Only admins can delete financial settings
CREATE POLICY "Admins can delete financial settings"
ON public.financial_settings
FOR DELETE
USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_financial_settings_updated_at
BEFORE UPDATE ON public.financial_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraint
ALTER TABLE public.financial_settings
ADD CONSTRAINT financial_settings_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;