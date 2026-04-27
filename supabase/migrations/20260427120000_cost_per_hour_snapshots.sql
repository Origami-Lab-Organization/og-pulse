-- Store computed total monthly cost in employee versions for historical accuracy
ALTER TABLE public.employee_versions
ADD COLUMN total_monthly_cost_estimated NUMERIC;

-- Store cost per hour snapshot in each planned month allocation
ALTER TABLE public.project_member_months
ADD COLUMN cost_per_hour NUMERIC;

-- Store cost per hour snapshot in each timesheet entry
ALTER TABLE public.project_timesheets
ADD COLUMN cost_per_hour NUMERIC;
