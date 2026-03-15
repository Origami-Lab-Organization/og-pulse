-- Mark all project timesheet entries through end of February 2026 as locked
UPDATE project_timesheets
SET is_locked = true
WHERE work_date <= '2026-02-28';

-- Create submission records for every project+week that has entries through end of Feb 2026
INSERT INTO project_timesheet_submissions (project_id, week_start, status, submitted_at, total_hours)
SELECT
  project_id,
  date_trunc('week', work_date::timestamp)::date AS week_start,
  'submitted',
  now(),
  SUM(hours)
FROM project_timesheets
WHERE work_date <= '2026-02-28'
GROUP BY project_id, date_trunc('week', work_date::timestamp)::date
ON CONFLICT (project_id, week_start)
DO UPDATE SET
  status = 'submitted',
  submitted_at = now(),
  total_hours = EXCLUDED.total_hours;
