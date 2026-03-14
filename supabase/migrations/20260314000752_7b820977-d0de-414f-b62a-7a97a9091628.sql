-- Create services table for the Comercial/Serviços catalog
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK (project_type IN ('fixed_scope', 'continuous', 'success_fee', 'non_revenue')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_project_type ON services(project_type);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select" ON services
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "services_insert" ON services
  FOR INSERT WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "services_update" ON services
  FOR UPDATE USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "services_delete" ON services
  FOR DELETE USING (user_belongs_to_tenant(auth.uid(), tenant_id));