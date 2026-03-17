-- Lead Follow-ups: schedule follow-up actions for CRM leads
CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES employees(id),
  description TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  notified BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lead_follow_ups_lead_id ON lead_follow_ups(lead_id);
CREATE INDEX idx_lead_follow_ups_tenant_id ON lead_follow_ups(tenant_id);
CREATE INDEX idx_lead_follow_ups_assigned_to ON lead_follow_ups(assigned_to);
CREATE INDEX idx_lead_follow_ups_scheduled_at ON lead_follow_ups(scheduled_at);
CREATE INDEX idx_lead_follow_ups_status ON lead_follow_ups(status);

ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follow-ups for their tenant"
  ON lead_follow_ups FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert follow-ups for their tenant"
  ON lead_follow_ups FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update follow-ups for their tenant"
  ON lead_follow_ups FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete follow-ups for their tenant"
  ON lead_follow_ups FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE lead_follow_ups IS 'Scheduled follow-up actions for CRM leads, triggers inbox notifications when due';
