-- Canonical recalculation for historical employee cost snapshots.
-- Planned monthly rows receive a weighted hourly cost when employee data changes mid-month.
-- Timesheet rows receive the hourly cost from the version active on the work date.

CREATE OR REPLACE FUNCTION public.count_employee_cost_business_days(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_start_date IS NULL OR p_end_date IS NULL OR p_start_date > p_end_date THEN 0::numeric
    ELSE (
      SELECT count(*)::numeric
      FROM generate_series(p_start_date, p_end_date, interval '1 day') AS gs(day)
      WHERE EXTRACT(ISODOW FROM gs.day) BETWEEN 1 AND 5
        AND NOT EXISTS (
          SELECT 1
          FROM public.company_holidays ch
          WHERE ch.tenant_id = p_tenant_id
            AND ch.is_active = true
            AND (
              (
                ch.holiday_type = 'fixed'
                AND ch.fixed_day = EXTRACT(DAY FROM gs.day)::integer
                AND ch.fixed_month = EXTRACT(MONTH FROM gs.day)::integer
              )
              OR (
                ch.holiday_type IN ('floating', 'one_time')
                AND ch.specific_date = gs.day::date
              )
            )
        )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_employee_cost_snapshots(
  p_employee_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT e.tenant_id
  INTO v_tenant_id
  FROM public.employees e
  WHERE e.id = p_employee_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Employee % not found for cost snapshot recalculation', p_employee_id;
  END IF;

  IF auth.uid() IS NOT NULL
    AND NOT public.user_belongs_to_tenant(auth.uid(), v_tenant_id)
  THEN
    RAISE EXCEPTION 'Not allowed to recalculate cost snapshots for this employee';
  END IF;

  WITH member_months AS (
    SELECT
      pmm.id,
      pm.employee_id,
      p.tenant_id,
      date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month') AS month_start
    FROM public.project_member_months pmm
    JOIN public.project_members pm ON pm.id = pmm.project_member_id
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.employee_id = p_employee_id
  ),
  month_ranges AS (
    SELECT
      id,
      employee_id,
      tenant_id,
      month_start::date AS month_start,
      (month_start + interval '1 month - 1 day')::date AS month_end
    FROM member_months
  ),
  version_segments AS (
    SELECT
      mr.id,
      mr.tenant_id,
      ev.total_monthly_cost_estimated,
      ev.jornada_diaria,
      mr.month_start,
      mr.month_end,
      GREATEST(ev.effective_from, mr.month_start)::date AS segment_start,
      LEAST(COALESCE(ev.effective_until - 1, mr.month_end), mr.month_end)::date AS segment_end,
      public.count_employee_cost_business_days(mr.tenant_id, mr.month_start, mr.month_end) AS month_business_days
    FROM month_ranges mr
    JOIN public.employee_versions ev
      ON ev.employee_id = mr.employee_id
     AND ev.effective_from <= mr.month_end
     AND (ev.effective_until IS NULL OR ev.effective_until > mr.month_start)
    WHERE ev.jornada_diaria > 0
      AND ev.total_monthly_cost_estimated IS NOT NULL
  ),
  segment_costs AS (
    SELECT
      id,
      public.count_employee_cost_business_days(vs.tenant_id, vs.segment_start, vs.segment_end) * vs.jornada_diaria AS segment_capacity_hours,
      vs.total_monthly_cost_estimated / NULLIF(vs.month_business_days * vs.jornada_diaria, 0) AS segment_hourly_cost
    FROM version_segments vs
    WHERE vs.segment_start <= vs.segment_end
      AND vs.month_business_days > 0
  ),
  weighted_month_costs AS (
    SELECT
      id,
      SUM(segment_capacity_hours * segment_hourly_cost) / NULLIF(SUM(segment_capacity_hours), 0) AS cost_per_hour
    FROM segment_costs
    GROUP BY id
  )
  UPDATE public.project_member_months pmm
  SET cost_per_hour = wmc.cost_per_hour
  FROM weighted_month_costs wmc
  WHERE pmm.id = wmc.id
    AND wmc.cost_per_hour IS NOT NULL;

  WITH timesheet_costs AS (
    SELECT
      pt.id,
      ev.total_monthly_cost_estimated / NULLIF(
        public.count_employee_cost_business_days(
          p.tenant_id,
          date_trunc('month', pt.work_date)::date,
          (date_trunc('month', pt.work_date)::date + interval '1 month - 1 day')::date
        ) * ev.jornada_diaria,
        0
      ) AS cost_per_hour
    FROM public.project_timesheets pt
    JOIN public.project_members pm ON pm.id = pt.project_member_id
    JOIN public.projects p ON p.id = pm.project_id
    JOIN LATERAL (
      SELECT ev.*
      FROM public.employee_versions ev
      WHERE ev.employee_id = pm.employee_id
        AND ev.effective_from <= pt.work_date
        AND (ev.effective_until IS NULL OR ev.effective_until > pt.work_date)
      ORDER BY ev.effective_from DESC
      LIMIT 1
    ) ev ON true
    WHERE pm.employee_id = p_employee_id
      AND ev.jornada_diaria > 0
      AND ev.total_monthly_cost_estimated IS NOT NULL
  )
  UPDATE public.project_timesheets pt
  SET cost_per_hour = tc.cost_per_hour
  FROM timesheet_costs tc
  WHERE pt.id = tc.id
    AND tc.cost_per_hour IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_member_month_cost_per_hour()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_tenant_id uuid;
  v_month_start date;
  v_month_end date;
BEGIN
  SELECT pm.employee_id, p.tenant_id,
         (date_trunc('month', p.start_date)::date + ((NEW.month_number - 1) * interval '1 month'))::date
  INTO v_employee_id, v_tenant_id, v_month_start
  FROM public.project_members pm
  JOIN public.projects p ON p.id = pm.project_id
  WHERE pm.id = NEW.project_member_id;

  IF v_employee_id IS NULL OR v_tenant_id IS NULL OR v_month_start IS NULL THEN
    RETURN NEW;
  END IF;

  v_month_end := (v_month_start + interval '1 month - 1 day')::date;

  WITH version_segments AS (
    SELECT
      ev.total_monthly_cost_estimated,
      ev.jornada_diaria,
      GREATEST(ev.effective_from, v_month_start)::date AS segment_start,
      LEAST(COALESCE(ev.effective_until - 1, v_month_end), v_month_end)::date AS segment_end,
      public.count_employee_cost_business_days(v_tenant_id, v_month_start, v_month_end) AS month_business_days
    FROM public.employee_versions ev
    WHERE ev.employee_id = v_employee_id
      AND ev.effective_from <= v_month_end
      AND (ev.effective_until IS NULL OR ev.effective_until > v_month_start)
      AND ev.jornada_diaria > 0
      AND ev.total_monthly_cost_estimated IS NOT NULL
  ),
  segment_costs AS (
    SELECT
      public.count_employee_cost_business_days(v_tenant_id, segment_start, segment_end) * jornada_diaria AS segment_capacity_hours,
      total_monthly_cost_estimated / NULLIF(month_business_days * jornada_diaria, 0) AS segment_hourly_cost
    FROM version_segments
    WHERE segment_start <= segment_end
      AND month_business_days > 0
  )
  SELECT SUM(segment_capacity_hours * segment_hourly_cost) / NULLIF(SUM(segment_capacity_hours), 0)
  INTO NEW.cost_per_hour
  FROM segment_costs;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_project_timesheet_cost_per_hour()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_tenant_id uuid;
BEGIN
  SELECT pm.employee_id, p.tenant_id
  INTO v_employee_id, v_tenant_id
  FROM public.project_members pm
  JOIN public.projects p ON p.id = pm.project_id
  WHERE pm.id = NEW.project_member_id;

  IF v_employee_id IS NULL OR v_tenant_id IS NULL OR NEW.work_date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    ev.total_monthly_cost_estimated / NULLIF(
      public.count_employee_cost_business_days(
        v_tenant_id,
        date_trunc('month', NEW.work_date)::date,
        (date_trunc('month', NEW.work_date)::date + interval '1 month - 1 day')::date
      ) * ev.jornada_diaria,
      0
    )
  INTO NEW.cost_per_hour
  FROM public.employee_versions ev
  WHERE ev.employee_id = v_employee_id
    AND ev.effective_from <= NEW.work_date
    AND (ev.effective_until IS NULL OR ev.effective_until > NEW.work_date)
    AND ev.jornada_diaria > 0
    AND ev.total_monthly_cost_estimated IS NOT NULL
  ORDER BY ev.effective_from DESC
  LIMIT 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_project_member_month_cost_snapshot ON public.project_member_months;
CREATE TRIGGER set_project_member_month_cost_snapshot
  BEFORE INSERT OR UPDATE OF project_member_id, month_number
  ON public.project_member_months
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_member_month_cost_per_hour();

DROP TRIGGER IF EXISTS set_project_timesheet_cost_snapshot ON public.project_timesheets;
CREATE TRIGGER set_project_timesheet_cost_snapshot
  BEFORE INSERT OR UPDATE OF project_member_id, work_date
  ON public.project_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_timesheet_cost_per_hour();

DO $$
DECLARE
  v_employee record;
BEGIN
  FOR v_employee IN
    SELECT id FROM public.employees
  LOOP
    PERFORM public.recalculate_employee_cost_snapshots(v_employee.id);
  END LOOP;
END $$;
