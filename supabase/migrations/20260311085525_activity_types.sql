-- Activity Types: non-project timesheet categories (Administrativo, Marketing, etc.)

CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  applies_to_all BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Specific employee assignments (used when applies_to_all = false)
CREATE TABLE activity_type_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type_id UUID NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(activity_type_id, employee_id)
);

-- Actual timesheet entries for activities
CREATE TABLE activity_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  activity_type_id UUID NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, activity_type_id, work_date)
);

-- Indexes
CREATE INDEX idx_activity_types_tenant ON activity_types(tenant_id);
CREATE INDEX idx_activity_type_employees_activity ON activity_type_employees(activity_type_id);
CREATE INDEX idx_activity_type_employees_employee ON activity_type_employees(employee_id);
CREATE INDEX idx_activity_timesheets_employee ON activity_timesheets(employee_id, work_date);

-- RLS
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_type_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_timesheets ENABLE ROW LEVEL SECURITY;

-- activity_types: all tenant members can read; only admins can write
CREATE POLICY "activity_types_select" ON activity_types
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_types_insert" ON activity_types
  FOR INSERT WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_types_update" ON activity_types
  FOR UPDATE USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_types_delete" ON activity_types
  FOR DELETE USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- activity_type_employees: tenant members can read/write
CREATE POLICY "activity_type_employees_select" ON activity_type_employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activity_types at
      WHERE at.id = activity_type_id
        AND user_belongs_to_tenant(auth.uid(), at.tenant_id)
    )
  );

CREATE POLICY "activity_type_employees_insert" ON activity_type_employees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM activity_types at
      WHERE at.id = activity_type_id
        AND user_belongs_to_tenant(auth.uid(), at.tenant_id)
    )
  );

CREATE POLICY "activity_type_employees_delete" ON activity_type_employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM activity_types at
      WHERE at.id = activity_type_id
        AND user_belongs_to_tenant(auth.uid(), at.tenant_id)
    )
  );

-- activity_timesheets: employees can read/write their own entries
CREATE POLICY "activity_timesheets_select" ON activity_timesheets
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_timesheets_insert" ON activity_timesheets
  FOR INSERT WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_timesheets_update" ON activity_timesheets
  FOR UPDATE USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_timesheets_delete" ON activity_timesheets
  FOR DELETE USING (user_belongs_to_tenant(auth.uid(), tenant_id));
