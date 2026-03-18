
CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  interaction_date DATE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('phone', 'whatsapp', 'email', 'in_person', 'video_call', 'linkedin', 'other')),
  created_by UUID REFERENCES public.employees(id),
  updated_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_tenant_id ON public.lead_interactions(tenant_id);
CREATE INDEX idx_lead_interactions_date ON public.lead_interactions(interaction_date DESC);

ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions for their tenant"
  ON public.lead_interactions FOR SELECT TO authenticated
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can insert interactions for their tenant"
  ON public.lead_interactions FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can update interactions for their tenant"
  ON public.lead_interactions FOR UPDATE TO authenticated
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete interactions"
  ON public.lead_interactions FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

COMMENT ON TABLE public.lead_interactions IS 'Log of past interactions (calls, meetings, messages) with CRM leads';
