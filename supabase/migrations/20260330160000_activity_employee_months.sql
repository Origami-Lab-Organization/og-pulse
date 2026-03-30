-- Planning table for internal activities in annual allocation view

CREATE TABLE IF NOT EXISTS activity_employee_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  activity_type_id UUID NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, activity_type_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_activity_employee_months_employee_year
  ON activity_employee_months(employee_id, year);

CREATE INDEX IF NOT EXISTS idx_activity_employee_months_activity
  ON activity_employee_months(activity_type_id);

ALTER TABLE activity_employee_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_employee_months_select" ON activity_employee_months
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_employee_months_insert" ON activity_employee_months
  FOR INSERT WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_employee_months_update" ON activity_employee_months
  FOR UPDATE USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_employee_months_delete" ON activity_employee_months
  FOR DELETE USING (user_belongs_to_tenant(auth.uid(), tenant_id));
