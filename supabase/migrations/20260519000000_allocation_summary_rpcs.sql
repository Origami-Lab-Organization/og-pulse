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
        OR EXISTS (
          SELECT 1
          FROM scoped_employees se
          WHERE se.employee_id = aem.employee_id
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
          FROM scoped_employees se
          WHERE se.employee_id = ats.employee_id
        )
      )
    GROUP BY ats.employee_id, month
  ),
  combined AS (
    SELECT * FROM project_planned
    UNION ALL
    SELECT * FROM project_actual
    UNION ALL
    SELECT * FROM activity_planned
    UNION ALL
    SELECT * FROM activity_actual
  )
  SELECT
    e.id AS employee_id,
    e.nome AS employee_name,
    e.cargo,
    e.jornada_diaria::numeric,
    e.status,
    et.termination_date,
    c.month,
    SUM(c.planned_hours)::numeric AS planned_hours,
    SUM(c.actual_hours)::numeric AS actual_hours
  FROM combined c
  JOIN public.employees e ON e.id = c.employee_id
  LEFT JOIN public.employee_terminations et ON et.id = e.termination_id
  WHERE e.tenant_id = p_tenant_id
  GROUP BY e.id, e.nome, e.cargo, e.jornada_diaria, e.status, et.termination_date, c.month
  ORDER BY e.nome, c.month
$$;

CREATE OR REPLACE FUNCTION public.get_allocation_employee_detail(
  p_tenant_id uuid,
  p_year integer,
  p_employee_id uuid,
  p_manager_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_team_key text DEFAULT NULL
)
RETURNS TABLE (
  item_type text,
  item_id uuid,
  project_id uuid,
  project_member_id uuid,
  title text,
  subtitle text,
  client_name text,
  manager_id uuid,
  manager_name text,
  team_key text,
  team_label text,
  project_start_date date,
  duration_months integer,
  is_continuous boolean,
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
    SELECT
      p.id,
      p.name,
      p.start_date,
      p.duration_months,
      p.is_continuous,
      p.manager_id,
      manager.nome AS manager_name,
      COALESCE(c.company_name, 'Sem cliente') AS client_name,
      COALESCE(p.service_line, '__sem_time__') AS team_key,
      COALESCE(s.name, p.service_line, 'Sem linha de serviço') AS team_label
    FROM public.projects p
    LEFT JOIN public.employees manager ON manager.id = p.manager_id
    LEFT JOIN public.clients c ON c.id = p.client_id
    LEFT JOIN public.services s
      ON p.service_line ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND s.id::text = p.service_line
    WHERE p.tenant_id = p_tenant_id
      AND (p_manager_id IS NULL OR p.manager_id = p_manager_id)
      AND (p_project_id IS NULL OR p.id = p_project_id)
      AND (p_team_key IS NULL OR COALESCE(p.service_line, '__sem_time__') = p_team_key)
  ),
  project_members_for_employee AS (
    SELECT
      pm.id AS project_member_id,
      pm.project_id,
      ps.*
    FROM public.project_members pm
    JOIN project_scope ps ON ps.id = pm.project_id
    WHERE pm.employee_id = p_employee_id
  ),
  project_planned AS (
    SELECT
      'project'::text AS item_type,
      pm.project_id AS item_id,
      pm.project_id,
      pm.project_member_id,
      pm.name AS title,
      CONCAT(COALESCE(pm.manager_name, 'Sem gerente'), ' · ', pm.team_label) AS subtitle,
      pm.client_name,
      pm.manager_id,
      pm.manager_name,
      pm.team_key,
      pm.team_label,
      pm.start_date AS project_start_date,
      pm.duration_months,
      pm.is_continuous,
      EXTRACT(MONTH FROM (date_trunc('month', pm.start_date)::date + ((pmm.month_number - 1) * interval '1 month')))::integer AS month,
      SUM(COALESCE(pmm.hours, 0))::numeric AS planned_hours,
      0::numeric AS actual_hours
    FROM public.project_member_months pmm
    JOIN project_members_for_employee pm ON pm.project_member_id = pmm.project_member_id
    WHERE EXTRACT(YEAR FROM (date_trunc('month', pm.start_date)::date + ((pmm.month_number - 1) * interval '1 month')))::integer = p_year
    GROUP BY
      pm.project_id, pm.project_member_id, pm.name, pm.manager_name, pm.team_label,
      pm.client_name, pm.manager_id, pm.team_key, pm.start_date, pm.duration_months, pm.is_continuous, month
  ),
  project_actual AS (
    SELECT
      'project'::text AS item_type,
      pm.project_id AS item_id,
      pm.project_id,
      pm.project_member_id,
      pm.name AS title,
      CONCAT(COALESCE(pm.manager_name, 'Sem gerente'), ' · ', pm.team_label) AS subtitle,
      pm.client_name,
      pm.manager_id,
      pm.manager_name,
      pm.team_key,
      pm.team_label,
      pm.start_date AS project_start_date,
      pm.duration_months,
      pm.is_continuous,
      EXTRACT(MONTH FROM pt.work_date)::integer AS month,
      0::numeric AS planned_hours,
      SUM(COALESCE(pt.hours, 0))::numeric AS actual_hours
    FROM public.project_timesheets pt
    JOIN project_members_for_employee pm ON pm.project_member_id = pt.project_member_id
    WHERE pt.work_date >= make_date(p_year, 1, 1)
      AND pt.work_date < make_date(p_year + 1, 1, 1)
    GROUP BY
      pm.project_id, pm.project_member_id, pm.name, pm.manager_name, pm.team_label,
      pm.client_name, pm.manager_id, pm.team_key, pm.start_date, pm.duration_months, pm.is_continuous, month
  ),
  activity_planned AS (
    SELECT
      'internal_activity'::text AS item_type,
      aem.activity_type_id AS item_id,
      NULL::uuid AS project_id,
      NULL::uuid AS project_member_id,
      at.name AS title,
      'Atividade interna'::text AS subtitle,
      NULL::text AS client_name,
      NULL::uuid AS manager_id,
      NULL::text AS manager_name,
      'internal_activity'::text AS team_key,
      'Atividade interna'::text AS team_label,
      NULL::date AS project_start_date,
      NULL::integer AS duration_months,
      NULL::boolean AS is_continuous,
      aem.month::integer AS month,
      SUM(COALESCE(aem.hours, 0))::numeric AS planned_hours,
      0::numeric AS actual_hours
    FROM public.activity_employee_months aem
    JOIN public.activity_types at ON at.id = aem.activity_type_id
    WHERE aem.tenant_id = p_tenant_id
      AND aem.employee_id = p_employee_id
      AND aem.year = p_year
    GROUP BY aem.activity_type_id, at.name, aem.month
  ),
  activity_actual AS (
    SELECT
      'internal_activity'::text AS item_type,
      ats.activity_type_id AS item_id,
      NULL::uuid AS project_id,
      NULL::uuid AS project_member_id,
      at.name AS title,
      'Atividade interna'::text AS subtitle,
      NULL::text AS client_name,
      NULL::uuid AS manager_id,
      NULL::text AS manager_name,
      'internal_activity'::text AS team_key,
      'Atividade interna'::text AS team_label,
      NULL::date AS project_start_date,
      NULL::integer AS duration_months,
      NULL::boolean AS is_continuous,
      EXTRACT(MONTH FROM ats.work_date)::integer AS month,
      0::numeric AS planned_hours,
      SUM(COALESCE(ats.hours, 0))::numeric AS actual_hours
    FROM public.activity_timesheets ats
    JOIN public.activity_types at ON at.id = ats.activity_type_id
    WHERE ats.tenant_id = p_tenant_id
      AND ats.employee_id = p_employee_id
      AND ats.work_date >= make_date(p_year, 1, 1)
      AND ats.work_date < make_date(p_year + 1, 1, 1)
    GROUP BY ats.activity_type_id, at.name, month
  ),
  combined AS (
    SELECT * FROM project_planned
    UNION ALL
    SELECT * FROM project_actual
    UNION ALL
    SELECT * FROM activity_planned
    UNION ALL
    SELECT * FROM activity_actual
  )
  SELECT
    item_type,
    item_id,
    project_id,
    project_member_id,
    title,
    subtitle,
    client_name,
    manager_id,
    manager_name,
    team_key,
    team_label,
    project_start_date,
    duration_months,
    is_continuous,
    month,
    SUM(planned_hours)::numeric AS planned_hours,
    SUM(actual_hours)::numeric AS actual_hours
  FROM combined
  WHERE month BETWEEN 1 AND 12
  GROUP BY
    item_type, item_id, project_id, project_member_id, title, subtitle, client_name,
    manager_id, manager_name, team_key, team_label, project_start_date,
    duration_months, is_continuous, month
  ORDER BY item_type DESC, title, month
$$;
