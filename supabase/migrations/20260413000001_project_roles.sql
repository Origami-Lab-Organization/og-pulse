CREATE TABLE IF NOT EXISTS project_roles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id               uuid NOT NULL,
  role_name               text NOT NULL,
  employee_id             uuid REFERENCES employees(id),
  freelancer_name         text,
  freelancer_email        text,
  employment_type         text NOT NULL
    CHECK (employment_type IN ('CLT', 'PJ', 'FREELANCER')),
  payment_type            text NOT NULL
    CHECK (payment_type IN ('hourly', 'monthly', 'delivery')),
  hourly_rate             numeric(10,2),
  monthly_rate            numeric(10,2),
  clt_encargos_multiplier numeric(4,2) DEFAULT 1.72,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  created_by              uuid REFERENCES auth.users(id)
);

ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view project_roles"
  ON project_roles FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can insert project_roles"
  ON project_roles FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can update project_roles"
  ON project_roles FOR UPDATE TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can delete project_roles"
  ON project_roles FOR DELETE TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE INDEX IF NOT EXISTS idx_project_roles_project_id ON project_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_project_roles_tenant_id ON project_roles(tenant_id);
