-- Create lead_activity_log table
CREATE TABLE public.lead_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_lead_activity_log_lead_id ON public.lead_activity_log(lead_id);
CREATE INDEX idx_lead_activity_log_tenant_id ON public.lead_activity_log(tenant_id);

-- Enable RLS
ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view lead activities in their tenant"
  ON public.lead_activity_log FOR SELECT
  TO authenticated
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Users can insert lead activities in their tenant"
  ON public.lead_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete lead activities"
  ON public.lead_activity_log FOR DELETE
  TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));