-- Lead Interactions: log of past interactions with CRM leads
CREATE TABLE IF NOT EXISTS lead_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  interaction_date DATE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('phone', 'whatsapp', 'email', 'in_person', 'video_call', 'linkedin', 'other')),
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_tenant_id ON lead_interactions(tenant_id);
CREATE INDEX idx_lead_interactions_date ON lead_interactions(interaction_date DESC);

ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions for their tenant"
  ON lead_interactions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert interactions for their tenant"
  ON lead_interactions FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update interactions for their tenant"
  ON lead_interactions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete interactions for their tenant"
  ON lead_interactions FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE lead_interactions IS 'Log of past interactions (calls, meetings, messages) with CRM leads';
