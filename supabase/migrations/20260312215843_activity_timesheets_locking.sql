-- Add is_locked column to activity_timesheets
ALTER TABLE activity_timesheets ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Lock existing entries through end of February 2026
UPDATE activity_timesheets
SET is_locked = true
WHERE work_date <= '2026-02-28';
