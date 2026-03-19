-- Add completed_by to track who marked the follow-up as done/skipped
ALTER TABLE lead_follow_ups ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES employees(id);
