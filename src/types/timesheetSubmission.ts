export interface TimesheetSubmission {
  id: string;
  tenant_id: string;
  week_start: string;
  status: 'draft' | 'submitted';
  submitted_at: string | null;
  submitted_by: string | null;
  total_hours: number;
  created_at: string;
  updated_at: string;
  // Joined data
  submitted_by_employee?: {
    nome: string;
  } | null;
}

export interface ProjectTimesheetSubmission {
  id: string;
  project_id: string;
  week_start: string;
  status: 'draft' | 'submitted';
  submitted_at: string | null;
  submitted_by: string | null;
  total_hours: number;
  created_at: string;
  updated_at: string;
  submitted_by_employee?: { nome: string } | null;
}

export interface TimesheetEditLog {
  id: string;
  timesheet_id: string;
  previous_hours: number;
  new_hours: number;
  justification: string;
  edited_by: string;
  edited_at: string;
}

export interface SubmitWeekInput {
  weekStart: string;
  totalHours: number;
  tenantId: string;
}

export interface SubmitProjectWeekInput {
  projectId: string;
  weekStart: string;
  totalHours: number;
}

export interface AdminEditInput {
  timesheetId: string;
  projectId: string;
  projectMemberId: string;
  workDate: string;
  previousHours: number;
  newHours: number;
  justification: string;
}

export interface BatchEditChange {
  timesheetId: string;
  projectId: string;
  projectMemberId: string;
  workDate: string;
  previousHours: number;
  newHours: number;
}

export interface AdminBatchEditInput {
  changes: BatchEditChange[];
  justification: string;
}

export interface AdminBatchEditInput {
  changes: BatchEditChange[];
  justification: string;
}
