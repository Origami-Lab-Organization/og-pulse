INSERT INTO public.employee_versions (
  id, employee_id, effective_from, effective_until,
  jornada_mensal, jornada_diaria,
  salario_mensal, salario_liquido, beneficios, encargos, fgts, inss_empresa,
  decimo_terceiro, ferias, pro_labore, tipo_contratacao, cargo,
  total_monthly_cost_estimated
)
SELECT
  gen_random_uuid(),
  e.id,
  e.data_admissao,
  ev_first.effective_from,
  88,
  4,
  ev_first.salario_mensal,
  ev_first.salario_liquido,
  ev_first.beneficios,
  ev_first.encargos,
  ev_first.fgts,
  ev_first.inss_empresa,
  ev_first.decimo_terceiro,
  ev_first.ferias,
  ev_first.pro_labore,
  ev_first.tipo_contratacao,
  ev_first.cargo,
  ev_first.total_monthly_cost_estimated
FROM public.employees e
JOIN LATERAL (
  SELECT ev.*
  FROM public.employee_versions ev
  WHERE ev.employee_id = e.id
  ORDER BY ev.effective_from ASC
  LIMIT 1
) ev_first ON true
WHERE e.nome ILIKE '%enzo%'
  AND NOT EXISTS (
    SELECT 1 FROM public.employee_versions ev2
    WHERE ev2.employee_id = e.id
    AND ev2.effective_from < ev_first.effective_from
  )
  AND e.data_admissao < ev_first.effective_from;

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
  actual_hours numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH project_scope AS (
  SELECT p.id
  FROM public.projects p
  WHERE p.tenant_id = p_tenant_id
    AND (p_manager_id IS NULL OR p.manager_id = p_manager_id)
    AND (p_project_id IS NULL OR p.id = p_project_id)
    AND (p_team_key IS NULL OR COALESCE(p.service_line, '__sem_time__') = p_team_key)
),
scoped_employees AS (
  SELECT DISTINCT pm.employee_id
  FROM public.project_members pm
  JOIN project_scope ps ON ps.id = pm.project_id
  WHERE pm.employee_id IS NOT NULL
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
      OR EXISTS (SELECT 1 FROM scoped_employees se WHERE se.employee_id = aem.employee_id)
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
      OR EXISTS (SELECT 1 FROM scoped_employees se WHERE se.employee_id = ats.employee_id)
    )
  GROUP BY ats.employee_id, month
),
combined AS (
  SELECT * FROM project_planned
  UNION ALL SELECT * FROM project_actual
  UNION ALL SELECT * FROM activity_planned
  UNION ALL SELECT * FROM activity_actual
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
        AND ev.effective_from <= make_date(p_year, c.month, 1)
        AND (ev.effective_until IS NULL OR ev.effective_until > make_date(p_year, c.month, 1))
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
  c.month,
  SUM(c.planned_hours)::numeric AS planned_hours,
  SUM(c.actual_hours)::numeric AS actual_hours
FROM combined c
JOIN public.employees e ON e.id = c.employee_id
LEFT JOIN public.employee_terminations et ON et.id = e.termination_id
WHERE e.tenant_id = p_tenant_id
GROUP BY e.id, e.nome, e.cargo, e.jornada_diaria, e.status, e.data_admissao, et.termination_date, c.month
ORDER BY e.nome, c.month
$$;