-- Drop project_roles table from previous migration (design was revised)
DROP TABLE IF EXISTS project_roles CASCADE;

-- Table: project_role_allocations
-- Tracks monthly planned hours for each employee allocated to a project.
-- Each row = one employee × one project × one calendar month.
-- An employee may be linked to a budget role (orçado) or a custom role name (não orçado).
CREATE TABLE IF NOT EXISTS project_role_allocations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id        uuid NOT NULL,
  employee_id      uuid NOT NULL REFERENCES employees(id),
  budget_role_id   uuid REFERENCES budget_roles(id),
  custom_role_name text,
  year             int NOT NULL,
  month            int NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_hours    numeric(6,1) DEFAULT 0 CHECK (planned_hours >= 0),
  CONSTRAINT project_role_allocations_unique_month
    UNIQUE (employee_id, project_id, year, month)
);

ALTER TABLE project_role_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view project_role_allocations"
  ON project_role_allocations FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can insert project_role_allocations"
  ON project_role_allocations FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can update project_role_allocations"
  ON project_role_allocations FOR UPDATE TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can delete project_role_allocations"
  ON project_role_allocations FOR DELETE TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE INDEX idx_pra_project  ON project_role_allocations(project_id);
CREATE INDEX idx_pra_employee ON project_role_allocations(employee_id);
CREATE INDEX idx_pra_tenant   ON project_role_allocations(tenant_id);
