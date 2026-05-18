-- Add due_date to cards
ALTER TABLE personal_kanban_cards ADD COLUMN due_date DATE;

-- Personal tags (scoped per employee)
CREATE TABLE personal_kanban_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#64748b',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, name)
);

-- Card ↔ tag junction
CREATE TABLE personal_kanban_card_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES personal_kanban_cards(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES personal_kanban_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, tag_id)
);

CREATE INDEX idx_pkt_employee   ON personal_kanban_tags(employee_id);
CREATE INDEX idx_pkct_card      ON personal_kanban_card_tags(card_id);
CREATE INDEX idx_pkct_tag       ON personal_kanban_card_tags(tag_id);

ALTER TABLE personal_kanban_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_kanban_card_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tags" ON personal_kanban_tags
  FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE auth_id = auth.uid()));

CREATE POLICY "own card tags" ON personal_kanban_card_tags
  FOR ALL USING (
    card_id IN (
      SELECT id FROM personal_kanban_cards
      WHERE employee_id IN (SELECT id FROM employees WHERE auth_id = auth.uid())
    )
  );
