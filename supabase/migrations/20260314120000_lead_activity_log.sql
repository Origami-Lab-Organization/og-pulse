-- Lead Activity Log: tracks all CRM pipeline activities for audit trail
-- Captures stage transitions, budget changes, notes, and key events

CREATE TABLE IF NOT EXISTS lead_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created',           -- Lead was created
    'stage_changed',     -- Lead moved to a different pipeline stage
    'lead_updated',      -- Lead data was edited
    'budget_created',    -- Budget was created and linked
    'budget_updated',    -- Budget was modified (new version)
    'budget_unlinked',   -- Budget was unlinked
    'archived',          -- Lead was archived
    'unarchived',        -- Lead was restored
    'closed',            -- Deal was closed, project created
    'note_added'         -- A note was added
  )),
  description TEXT NOT NULL,                        -- Human-readable description
  metadata JSONB DEFAULT '{}'::jsonb,               -- Structured data (old/new values, version numbers, etc.)
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_lead_activity_log_lead_id ON lead_activity_log(lead_id);
CREATE INDEX idx_lead_activity_log_tenant_id ON lead_activity_log(tenant_id);
CREATE INDEX idx_lead_activity_log_created_at ON lead_activity_log(created_at DESC);
CREATE INDEX idx_lead_activity_log_type ON lead_activity_log(activity_type);

-- RLS Policies
ALTER TABLE lead_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs for their tenant"
  ON lead_activity_log FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activity logs for their tenant"
  ON lead_activity_log FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Add change_reason to budget_versions for negotiation tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_versions' AND column_name = 'change_reason'
  ) THEN
    ALTER TABLE budget_versions ADD COLUMN change_reason TEXT;
  END IF;
END $$;

COMMENT ON TABLE lead_activity_log IS 'Audit trail for all CRM lead activities - stage changes, budget updates, notes, and deal closings';
COMMENT ON COLUMN lead_activity_log.activity_type IS 'Type of activity that occurred';
COMMENT ON COLUMN lead_activity_log.metadata IS 'Structured JSON data with old/new values, version numbers, etc.';
COMMENT ON COLUMN budget_versions.change_reason IS 'User-provided reason for why this version was created (negotiation context)';
