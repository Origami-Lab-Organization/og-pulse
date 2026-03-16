-- Add lead_id to projects for CRM traceability
ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id);
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects(lead_id);

-- Backfill: link existing projects to leads via shared budget_id
UPDATE projects p
SET lead_id = l.id
FROM leads l
WHERE p.budget_id IS NOT NULL
  AND p.budget_id = l.budget_id
  AND p.lead_id IS NULL;
