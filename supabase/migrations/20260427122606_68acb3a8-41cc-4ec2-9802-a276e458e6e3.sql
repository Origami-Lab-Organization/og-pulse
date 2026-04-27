ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS total_monthly_cost_estimated NUMERIC;
ALTER TABLE public.project_member_months ADD COLUMN IF NOT EXISTS cost_per_hour NUMERIC;
ALTER TABLE public.project_timesheets ADD COLUMN IF NOT EXISTS cost_per_hour NUMERIC;