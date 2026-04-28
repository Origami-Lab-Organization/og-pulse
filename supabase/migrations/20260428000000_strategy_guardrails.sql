CREATE TABLE strategy_guardrails (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_id      UUID NOT NULL REFERENCES strategy_cycles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  threshold     NUMERIC NOT NULL,
  operator      VARCHAR(2) NOT NULL DEFAULT '>=',
  unit          VARCHAR(20),
  current_value NUMERIC,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX strategy_guardrails_cycle_idx  ON strategy_guardrails(cycle_id);
CREATE INDEX strategy_guardrails_tenant_idx ON strategy_guardrails(tenant_id);

ALTER TABLE strategy_guardrails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON strategy_guardrails
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM employees WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON strategy_guardrails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
