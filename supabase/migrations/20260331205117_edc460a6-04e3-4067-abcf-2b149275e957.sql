
-- Create tax_entries table
CREATE TABLE public.tax_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  reference_month DATE NOT NULL,
  payment_date DATE NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one entry per tenant per reference month
ALTER TABLE public.tax_entries ADD CONSTRAINT tax_entries_tenant_month_unique UNIQUE (tenant_id, reference_month);

-- Enable RLS
ALTER TABLE public.tax_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies: only admin/manager can manage
CREATE POLICY "Admins and managers can view tax entries"
  ON public.tax_entries FOR SELECT TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can insert tax entries"
  ON public.tax_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can update tax entries"
  ON public.tax_entries FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id))
  WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete tax entries"
  ON public.tax_entries FOR DELETE TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id));

-- Updated_at trigger
CREATE TRIGGER update_tax_entries_updated_at
  BEFORE UPDATE ON public.tax_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for DAE documents
INSERT INTO storage.buckets (id, name, public) VALUES ('tax-documents', 'tax-documents', false);

-- Storage policies
CREATE POLICY "Tenant members can upload tax documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tax-documents' AND public.user_belongs_to_tenant(auth.uid(), (public.get_user_tenant_id(auth.uid()))));

CREATE POLICY "Tenant members can view tax documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tax-documents' AND public.user_belongs_to_tenant(auth.uid(), (public.get_user_tenant_id(auth.uid()))));

CREATE POLICY "Tenant members can delete tax documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tax-documents' AND public.user_belongs_to_tenant(auth.uid(), (public.get_user_tenant_id(auth.uid()))));
