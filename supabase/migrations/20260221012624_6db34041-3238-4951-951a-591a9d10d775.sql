
-- Create leads table
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  company_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  estimated_value numeric NOT NULL DEFAULT 0,
  source text,
  notes text,
  crm_stage text NOT NULL DEFAULT 'screening',
  budget_id uuid REFERENCES public.budgets(id),
  archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archive_reason text,
  archive_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins and managers can insert leads"
ON public.leads FOR INSERT
WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can update leads"
ON public.leads FOR UPDATE
USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete leads"
ON public.leads FOR DELETE
USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Users can view leads in their tenant"
ON public.leads FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
