-- Add columns to project_timesheets for lock tracking
ALTER TABLE project_timesheets 
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create timesheet_submissions table
CREATE TABLE IF NOT EXISTS timesheet_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  total_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (tenant_id, week_start)
);

-- Create timesheet_edit_logs table for audit trail
CREATE TABLE IF NOT EXISTS timesheet_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES project_timesheets(id) ON DELETE CASCADE,
  previous_hours NUMERIC NOT NULL,
  new_hours NUMERIC NOT NULL,
  justification TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE timesheet_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_edit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timesheet_submissions
CREATE POLICY "Users can view submissions in their tenant" 
  ON timesheet_submissions FOR SELECT 
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert submissions" 
  ON timesheet_submissions FOR INSERT 
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Managers can update submissions" 
  ON timesheet_submissions FOR UPDATE 
  USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins can delete submissions" 
  ON timesheet_submissions FOR DELETE 
  USING (has_role(auth.uid(), tenant_id, 'admin'));

-- RLS Policies for timesheet_edit_logs
CREATE POLICY "Users can view edit logs in their tenant" 
  ON timesheet_edit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM project_timesheets pt
      JOIN project_members pm ON pt.project_member_id = pm.id
      JOIN projects p ON pm.project_id = p.id
      WHERE pt.id = timesheet_edit_logs.timesheet_id
      AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
    )
  );

CREATE POLICY "Only admins can insert edit logs" 
  ON timesheet_edit_logs FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_timesheets pt
      JOIN project_members pm ON pt.project_member_id = pm.id
      JOIN projects p ON pm.project_id = p.id
      WHERE pt.id = timesheet_edit_logs.timesheet_id
      AND has_role(auth.uid(), p.tenant_id, 'admin')
    )
  );

-- Create trigger for updated_at on timesheet_submissions
CREATE TRIGGER update_timesheet_submissions_updated_at
  BEFORE UPDATE ON timesheet_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on project_timesheets
CREATE TRIGGER update_project_timesheets_updated_at
  BEFORE UPDATE ON project_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();