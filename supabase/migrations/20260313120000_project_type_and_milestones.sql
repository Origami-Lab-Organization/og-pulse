-- Add project_type column to projects table
-- Possible values: fixed_scope | continuous | success_fee | non_revenue
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'fixed_scope';

-- Create project_milestones table (used for success_fee / Lei do Bem revenue triggers)
CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  expected_date DATE NOT NULL,
  expected_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  actual_date DATE,
  actual_value NUMERIC(15, 2),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_tenant ON project_milestones(tenant_id);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_milestones_select" ON project_milestones
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "project_milestones_insert" ON project_milestones
  FOR INSERT WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "project_milestones_update" ON project_milestones
  FOR UPDATE USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "project_milestones_delete" ON project_milestones
  FOR DELETE USING (user_belongs_to_tenant(auth.uid(), tenant_id));
