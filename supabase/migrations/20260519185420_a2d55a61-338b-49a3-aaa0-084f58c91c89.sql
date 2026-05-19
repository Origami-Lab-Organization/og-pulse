CREATE OR REPLACE FUNCTION public.calculate_employee_capacity_hours(
  p_tenant_id uuid,
  p_employee_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH employee_context AS (
  SELECT
    e.id,
    e.tenant_id,
    e.data_admissao,
    e.jornada_diaria,
    et.termination_date
  FROM public.employees e
  LEFT JOIN public.employee_terminations et ON et.id = e.termination_id
  WHERE e.id = p_employee_id
    AND e.tenant_id = p_tenant_id
    AND (
      auth.uid() IS NULL
      OR public.user_belongs_to_tenant(auth.uid(), e.tenant_id)
    )
),
bounds AS (
  SELECT
    ec.*,
    GREATEST(p_start_date, COALESCE(ec.data_admissao, p_start_date))::date AS effective_start,
    LEAST(p_end_date, COALESCE(ec.termination_date, p_end_date))::date AS effective_end
  FROM employee_context ec
  WHERE p_start_date IS NOT NULL
    AND p_end_date IS NOT NULL
    AND p_start_date <= p_end_date
),
business_days AS (
  SELECT
    b.id AS employee_id,
    b.tenant_id,
    b.jornada_diaria AS employee_jornada_diaria,
    gs.day::date AS work_day
  FROM bounds b
  JOIN LATERAL generate_series(b.effective_start, b.effective_end, interval '1 day') AS gs(day)
    ON b.effective_start <= b.effective_end
  WHERE EXTRACT(ISODOW FROM gs.day) BETWEEN 1 AND 5
    AND NOT EXISTS (
      SELECT 1
      FROM public.company_holidays ch
      WHERE ch.tenant_id = b.tenant_id
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
SELECT COALESCE(SUM(COALESCE(active_version.jornada_diaria, earliest_version.jornada_diaria, bd.employee_jornada_diaria, 8)), 0)::numeric
FROM business_days bd
LEFT JOIN LATERAL (
  SELECT ev.jornada_diaria
  FROM public.employee_versions ev
  WHERE ev.employee_id = bd.employee_id
    AND ev.effective_from <= bd.work_day
    AND (ev.effective_until IS NULL OR ev.effective_until > bd.work_day)
  ORDER BY ev.effective_from DESC
  LIMIT 1
) active_version ON true
LEFT JOIN LATERAL (
  SELECT ev.jornada_diaria
  FROM public.employee_versions ev
  WHERE ev.employee_id = bd.employee_id
  ORDER BY ev.effective_from ASC
  LIMIT 1
) earliest_version ON true;
$$;

DROP FUNCTION IF EXISTS public.get_allocation_employee_month_summary(uuid, integer, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.get_allocation_employee_month_summary(
  p_tenant_id uuid,
  p_year integer,
  p_manager_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_team_key text DEFAULT NULL
)
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  cargo text,
  jornada_diaria numeric,
  status text,
  hire_date date,
  termination_date date,
  month integer,
  planned_hours numeric,
  actual_hours numeric,
  capacity_hours numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH months AS (
  SELECT generate_series(1, 12)::integer AS month
),
project_scope AS (
  SELECT p.id
  FROM public.projects p
  WHERE p.tenant_id = p_tenant_id
    AND (p_manager_id IS NULL OR p.manager_id = p_manager_id)
    AND (p_project_id IS NULL OR p.id = p_project_id)
    AND (p_team_key IS NULL OR COALESCE(p.service_line, '__sem_time__') = p_team_key)
),
scoped_project_employees AS (
  SELECT DISTINCT pm.employee_id
  FROM public.project_members pm
  JOIN project_scope ps ON ps.id = pm.project_id
  WHERE pm.employee_id IS NOT NULL
),
employee_scope AS (
  SELECT e.id
  FROM public.employees e
  WHERE e.tenant_id = p_tenant_id
    AND (
      (p_manager_id IS NULL AND p_project_id IS NULL AND p_team_key IS NULL)
      OR EXISTS (
        SELECT 1
        FROM scoped_project_employees spe
        WHERE spe.employee_id = e.id
      )
    )
),
project_planned AS (
  SELECT
    pm.employee_id,
    EXTRACT(MONTH FROM (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month')))::integer AS month,
    SUM(COALESCE(pmm.hours, 0))::numeric AS planned_hours,
    0::numeric AS actual_hours
  FROM public.project_member_months pmm
  JOIN public.project_members pm ON pm.id = pmm.project_member_id
  JOIN public.projects p ON p.id = pm.project_id
  JOIN project_scope ps ON ps.id = p.id
  WHERE pm.employee_id IS NOT NULL
    AND EXTRACT(YEAR FROM (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month')))::integer = p_year
  GROUP BY pm.employee_id, month
),
project_actual AS (
  SELECT
    pm.employee_id,
    EXTRACT(MONTH FROM pt.work_date)::integer AS month,
    0::numeric AS planned_hours,
    SUM(COALESCE(pt.hours, 0))::numeric AS actual_hours
  FROM public.project_timesheets pt
  JOIN public.project_members pm ON pm.id = pt.project_member_id
  JOIN public.projects p ON p.id = pm.project_id
  JOIN project_scope ps ON ps.id = p.id
  WHERE pm.employee_id IS NOT NULL
    AND pt.work_date >= make_date(p_year, 1, 1)
    AND pt.work_date < make_date(p_year + 1, 1, 1)
  GROUP BY pm.employee_id, month
),
activity_planned AS (
  SELECT
    aem.employee_id,
    aem.month::integer AS month,
    SUM(COALESCE(aem.hours, 0))::numeric AS planned_hours,
    0::numeric AS actual_hours
  FROM public.activity_employee_months aem
  WHERE aem.tenant_id = p_tenant_id
    AND aem.year = p_year
    AND (
      (p_manager_id IS NULL AND p_project_id IS NULL AND p_team_key IS NULL)
      OR EXISTS (
        SELECT 1
        FROM scoped_project_employees spe
        WHERE spe.employee_id = aem.employee_id
      )
    )
  GROUP BY aem.employee_id, aem.month
),
activity_actual AS (
  SELECT
    ats.employee_id,
    EXTRACT(MONTH FROM ats.work_date)::integer AS month,
    0::numeric AS planned_hours,
    SUM(COALESCE(ats.hours, 0))::numeric AS actual_hours
  FROM public.activity_timesheets ats
  WHERE ats.tenant_id = p_tenant_id
    AND ats.work_date >= make_date(p_year, 1, 1)
    AND ats.work_date < make_date(p_year + 1, 1, 1)
    AND (
      (p_manager_id IS NULL AND p_project_id IS NULL AND p_team_key IS NULL)
      OR EXISTS (
        SELECT 1
        FROM scoped_project_employees spe
        WHERE spe.employee_id = ats.employee_id
      )
    )
  GROUP BY ats.employee_id, month
),
combined AS (
  SELECT * FROM project_planned
  UNION ALL SELECT * FROM project_actual
  UNION ALL SELECT * FROM activity_planned
  UNION ALL SELECT * FROM activity_actual
),
combined_by_employee_month AS (
  SELECT
    c.employee_id,
    c.month,
    SUM(c.planned_hours)::numeric AS planned_hours,
    SUM(c.actual_hours)::numeric AS actual_hours
  FROM combined c
  GROUP BY c.employee_id, c.month
)
SELECT
  e.id AS employee_id,
  e.nome AS employee_name,
  e.cargo,
  COALESCE(
    (
      SELECT ev.jornada_diaria
      FROM public.employee_versions ev
      WHERE ev.employee_id = e.id
        AND ev.effective_from <= make_date(p_year, m.month, 1)
        AND (ev.effective_until IS NULL OR ev.effective_until > make_date(p_year, m.month, 1))
      ORDER BY ev.effective_from DESC
      LIMIT 1
    ),
    (
      SELECT ev.jornada_diaria
      FROM public.employee_versions ev
      WHERE ev.employee_id = e.id
      ORDER BY ev.effective_from ASC
      LIMIT 1
    ),
    e.jornada_diaria
  )::numeric AS jornada_diaria,
  e.status,
  e.data_admissao AS hire_date,
  et.termination_date,
  m.month,
  COALESCE(cbem.planned_hours, 0)::numeric AS planned_hours,
  COALESCE(cbem.actual_hours, 0)::numeric AS actual_hours,
  public.calculate_employee_capacity_hours(
    p_tenant_id,
    e.id,
    make_date(p_year, m.month, 1),
    (make_date(p_year, m.month, 1) + interval '1 month - 1 day')::date
  )::numeric AS capacity_hours
FROM employee_scope es
JOIN public.employees e ON e.id = es.id
CROSS JOIN months m
LEFT JOIN public.employee_terminations et ON et.id = e.termination_id
LEFT JOIN combined_by_employee_month cbem ON cbem.employee_id = e.id AND cbem.month = m.month
WHERE e.tenant_id = p_tenant_id
ORDER BY e.nome, m.month;
$$;