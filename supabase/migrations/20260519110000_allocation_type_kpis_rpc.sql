-- RPC: get_allocation_type_kpis
-- Returns aggregated hours split by type (project vs internal_activity) for
-- the entire team visible to the caller. Used by the 4 type-KPI cards on the
-- allocation screen.
--
-- p_week_cutoff_date: today - 7 days (passed from frontend). Actual hours for
-- the current month are only counted up to this date to account for the fact
-- that employees log timesheets on Friday for the week that is ending.

CREATE OR REPLACE FUNCTION public.get_allocation_type_kpis(
  p_tenant_id        uuid,
  p_year             integer,
  p_current_month    integer,
  p_week_cutoff_date date,
  p_manager_id       uuid    DEFAULT NULL,
  p_project_id       uuid    DEFAULT NULL,
  p_team_key         text    DEFAULT NULL
)
RETURNS TABLE (
  project_planned_annual  numeric,
  project_actual_annual   numeric,
  activity_planned_annual numeric,
  activity_actual_annual  numeric,
  project_planned_month   numeric,
  project_actual_month    numeric,
  activity_planned_month  numeric,
  activity_actual_month   numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH project_scope AS (
    SELECT p.id
    FROM   public.projects p
    WHERE  p.tenant_id = p_tenant_id
      AND  (p_manager_id IS NULL OR p.manager_id = p_manager_id)
      AND  (p_project_id IS NULL OR p.id          = p_project_id)
      AND  (p_team_key   IS NULL OR COALESCE(p.service_line, '__sem_time__') = p_team_key)
  ),

  -- Annual: planned hours from project_member_months mapped to calendar year
  proj_planned_annual AS (
    SELECT
      COALESCE(SUM(pmm.hours), 0)::numeric AS hours
    FROM   public.project_member_months pmm
    JOIN   public.project_members       pm  ON pm.id  = pmm.project_member_id
    JOIN   public.projects              p   ON p.id   = pm.project_id
    JOIN   project_scope                ps  ON ps.id  = p.id
    WHERE  pm.employee_id IS NOT NULL
      AND  EXTRACT(YEAR FROM
             (date_trunc('month', p.start_date)::date
              + ((pmm.month_number - 1) * interval '1 month'))
           )::integer = p_year
  ),

  -- Annual: actual hours from project_timesheets for the year
  proj_actual_annual AS (
    SELECT
      COALESCE(SUM(pt.hours), 0)::numeric AS hours
    FROM   public.project_timesheets pt
    JOIN   public.project_members    pm  ON pm.id  = pt.project_member_id
    JOIN   public.projects           p   ON p.id   = pm.project_id
    JOIN   project_scope             ps  ON ps.id  = p.id
    WHERE  pm.employee_id IS NOT NULL
      AND  pt.work_date >= make_date(p_year, 1, 1)
      AND  pt.work_date <  make_date(p_year + 1, 1, 1)
  ),

  -- Annual: planned hours from activity_employee_months for the year
  act_planned_annual AS (
    SELECT
      COALESCE(SUM(aem.hours), 0)::numeric AS hours
    FROM   public.activity_employee_months aem
    WHERE  aem.tenant_id = p_tenant_id
      AND  aem.year      = p_year
      -- scope: only employees who belong to project_scope (when filters active)
      AND  (
        p_manager_id IS NULL AND p_project_id IS NULL AND p_team_key IS NULL
        OR EXISTS (
          SELECT 1
          FROM   public.project_members pm2
          JOIN   project_scope          ps2 ON ps2.id = pm2.project_id
          WHERE  pm2.employee_id = aem.employee_id
        )
      )
  ),

  -- Annual: actual hours from activity_timesheets for the year
  act_actual_annual AS (
    SELECT
      COALESCE(SUM(ats.hours), 0)::numeric AS hours
    FROM   public.activity_timesheets ats
    WHERE  ats.tenant_id = p_tenant_id
      AND  ats.work_date >= make_date(p_year, 1, 1)
      AND  ats.work_date <  make_date(p_year + 1, 1, 1)
      AND  (
        p_manager_id IS NULL AND p_project_id IS NULL AND p_team_key IS NULL
        OR EXISTS (
          SELECT 1
          FROM   public.project_members pm2
          JOIN   project_scope          ps2 ON ps2.id = pm2.project_id
          WHERE  pm2.employee_id = ats.employee_id
        )
      )
  ),

  -- Current month: planned project hours
  proj_planned_month AS (
    SELECT
      COALESCE(SUM(pmm.hours), 0)::numeric AS hours
    FROM   public.project_member_months pmm
    JOIN   public.project_members       pm  ON pm.id  = pmm.project_member_id
    JOIN   public.projects              p   ON p.id   = pm.project_id
    JOIN   project_scope                ps  ON ps.id  = p.id
    WHERE  pm.employee_id IS NOT NULL
      AND  EXTRACT(YEAR FROM
             (date_trunc('month', p.start_date)::date
              + ((pmm.month_number - 1) * interval '1 month'))
           )::integer = p_year
      AND  EXTRACT(MONTH FROM
             (date_trunc('month', p.start_date)::date
              + ((pmm.month_number - 1) * interval '1 month'))
           )::integer = p_current_month
  ),

  -- Current month: actual project hours up to week-cutoff
  proj_actual_month AS (
    SELECT
      COALESCE(SUM(pt.hours), 0)::numeric AS hours
    FROM   public.project_timesheets pt
    JOIN   public.project_members    pm  ON pm.id  = pt.project_member_id
    JOIN   public.projects           p   ON p.id   = pm.project_id
    JOIN   project_scope             ps  ON ps.id  = p.id
    WHERE  pm.employee_id IS NOT NULL
      AND  pt.work_date >= make_date(p_year, p_current_month, 1)
      AND  pt.work_date <  make_date(p_year, p_current_month, 1) + interval '1 month'
      AND  pt.work_date <= p_week_cutoff_date
  ),

  -- Current month: planned activity hours
  act_planned_month AS (
    SELECT
      COALESCE(SUM(aem.hours), 0)::numeric AS hours
    FROM   public.activity_employee_months aem
    WHERE  aem.tenant_id = p_tenant_id
      AND  aem.year      = p_year
      AND  aem.month     = p_current_month
      AND  (
        p_manager_id IS NULL AND p_project_id IS NULL AND p_team_key IS NULL
        OR EXISTS (
          SELECT 1
          FROM   public.project_members pm2
          JOIN   project_scope          ps2 ON ps2.id = pm2.project_id
          WHERE  pm2.employee_id = aem.employee_id
        )
      )
  ),

  -- Current month: actual activity hours up to week-cutoff
  act_actual_month AS (
    SELECT
      COALESCE(SUM(ats.hours), 0)::numeric AS hours
    FROM   public.activity_timesheets ats
    WHERE  ats.tenant_id = p_tenant_id
      AND  ats.work_date >= make_date(p_year, p_current_month, 1)
      AND  ats.work_date <  make_date(p_year, p_current_month, 1) + interval '1 month'
      AND  ats.work_date <= p_week_cutoff_date
      AND  (
        p_manager_id IS NULL AND p_project_id IS NULL AND p_team_key IS NULL
        OR EXISTS (
          SELECT 1
          FROM   public.project_members pm2
          JOIN   project_scope          ps2 ON ps2.id = pm2.project_id
          WHERE  pm2.employee_id = ats.employee_id
        )
      )
  )

  SELECT
    (SELECT hours FROM proj_planned_annual)  AS project_planned_annual,
    (SELECT hours FROM proj_actual_annual)   AS project_actual_annual,
    (SELECT hours FROM act_planned_annual)   AS activity_planned_annual,
    (SELECT hours FROM act_actual_annual)    AS activity_actual_annual,
    (SELECT hours FROM proj_planned_month)   AS project_planned_month,
    (SELECT hours FROM proj_actual_month)    AS project_actual_month,
    (SELECT hours FROM act_planned_month)    AS activity_planned_month,
    (SELECT hours FROM act_actual_month)     AS activity_actual_month
$$;
