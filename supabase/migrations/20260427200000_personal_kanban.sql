-- Personal Kanban: user-scoped columns and cards (independent of projects)

CREATE TABLE personal_kanban_columns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()``
);

CREATE TABLE personal_kanban_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id   UUID NOT NULL REFERENCES personal_kanban_columns(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pkc_employee  ON personal_kanban_columns(employee_id);
CREATE INDEX idx_pkcard_column ON personal_kanban_cards(column_id);
CREATE INDEX idx_pkcard_employee ON personal_kanban_cards(employee_id);

ALTER TABLE personal_kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_kanban_cards   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own columns" ON personal_kanban_columns
  FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE auth_id = auth.uid()));

CREATE POLICY "own cards" ON personal_kanban_cards
  FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE auth_id = auth.uid()));
