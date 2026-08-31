-- ─────────────────────────────────────────────────────────────────────────────
-- ADR-0006 — Cutover de planejamento para project_role_allocations
--
-- Objetivo:
--   1) Tornar project_role_allocations a fonte canônica de HORAS PLANEJADAS.
--   2) Adicionar snapshot interno de custo/hora no novo modelo para analytics.
--   3) Atualizar os RPCs de alocação para detalhe e resumo não dependerem de
--      project_member_months como fonte de planejamento.
--
-- Importante:
--   - project_members/project_member_months NÃO são removidas nesta fase.
--     project_timesheets ainda referencia project_members, então o legado fica
--     como compatibilidade de lançamentos realizados/correções.
--   - Os RPCs de alocação continuam retornando somente horas/capacidade,
--     nunca custo, salário ou margem.
-- ─────────────────────────────────────────────────────────────────────────────

-- Bancos que criaram project_role_allocations pela migration antiga
-- 20260413000002 nao possuem timestamps. A migration 20260526145410 adicionou
-- o trigger update_updated_at_column(), entao qualquer UPDATE de backfill falha
-- sem updated_at. Garantir essas colunas antes dos UPDATEs abaixo.
ALTER TABLE public.project_role_allocations
ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.project_role_allocations
ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.project_role_allocations
SET
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE created_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.project_role_allocations
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.project_role_allocations
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.project_role_allocations
ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.project_role_allocations
ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.project_role_allocations
ADD COLUMN IF NOT EXISTS cost_per_hour numeric;

CREATE INDEX IF NOT EXISTS idx_pra_tenant_employee_month
ON public.project_role_allocations(tenant_id, employee_id, year, month);

CREATE INDEX IF NOT EXISTS idx_pra_project_month
ON public.project_role_allocations(project_id, year, month);

CREATE OR REPLACE FUNCTION public.calculate_employee_hourly_cost_for_month(
  p_tenant_id uuid,
  p_employee_id uuid,
  p_month_start date
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH bounds AS (
  SELECT
    date_trunc('month', p_month_start)::date AS month_start,
    (date_trunc('month', p_month_start)::date + interval '1 month - 1 day')::date AS month_end
),
version_segments AS (
  SELECT
    ev.total_monthly_cost_estimated,
    ev.jornada_diaria,
    GREATEST(ev.effective_from, b.month_start)::date AS segment_start,
    LEAST(COALESCE(ev.effective_until - 1, b.month_end), b.month_end)::date AS segment_end,
    public.count_employee_cost_business_days(p_tenant_id, b.month_start, b.month_end) AS month_business_days
  FROM bounds b
  JOIN public.employee_versions ev
    ON ev.employee_id = p_employee_id
   AND ev.effective_from <= b.month_end
   AND (ev.effective_until IS NULL OR ev.effective_until > b.month_start)
  WHERE p_month_start IS NOT NULL
    AND ev.jornada_diaria > 0
    AND ev.total_monthly_cost_estimated IS NOT NULL
),
segment_costs AS (
  SELECT
    public.count_employee_cost_business_days(p_tenant_id, segment_start, segment_end) * jornada_diaria AS segment_capacity_hours,
    total_monthly_cost_estimated / NULLIF(month_business_days * jornada_diaria, 0) AS segment_hourly_cost
  FROM version_segments
  WHERE segment_start <= segment_end
    AND month_business_days > 0
)
SELECT SUM(segment_capacity_hours * segment_hourly_cost) / NULLIF(SUM(segment_capacity_hours), 0)
FROM segment_costs;
$$;

CREATE OR REPLACE FUNCTION public.set_project_role_allocation_cost_per_hour()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.employee_id IS NULL OR NEW.year IS NULL OR NEW.month IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.cost_per_hour := public.calculate_employee_hourly_cost_for_month(
    NEW.tenant_id,
    NEW.employee_id,
    make_date(NEW.year, NEW.month, 1)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_project_role_allocation_cost_snapshot
ON public.project_role_allocations;

CREATE TRIGGER set_project_role_allocation_cost_snapshot
BEFORE INSERT OR UPDATE OF tenant_id, employee_id, year, month
ON public.project_role_allocations
FOR EACH ROW
EXECUTE FUNCTION public.set_project_role_allocation_cost_per_hour();

-- Backfill preferindo snapshots antigos equivalentes quando existem, para
-- preservar o custo usado no planejamento histórico antes do cutover.
WITH legacy_costs AS (
  SELECT
    pra.id AS allocation_id,
    SUM(COALESCE(pmm.hours, 0) * pmm.cost_per_hour) / NULLIF(SUM(COALESCE(pmm.hours, 0)), 0) AS cost_per_hour
  FROM public.project_role_allocations pra
  JOIN public.project_members pm
    ON pm.project_id = pra.project_id
   AND pm.employee_id = pra.employee_id
  JOIN public.projects p ON p.id = pm.project_id
  JOIN public.project_member_months pmm ON pmm.project_member_id = pm.id
  CROSS JOIN LATERAL (
    SELECT (date_trunc('month', p.start_date)::date
            + ((pmm.month_number - 1) * interval '1 month'))::date AS month_start
  ) cal
  WHERE p.start_date IS NOT NULL
    AND EXTRACT(YEAR FROM cal.month_start)::integer = pra.year
    AND EXTRACT(MONTH FROM cal.month_start)::integer = pra.month
    AND pmm.cost_per_hour IS NOT NULL
    AND COALESCE(pmm.hours, 0) > 0
  GROUP BY pra.id
)
UPDATE public.project_role_allocations pra
SET cost_per_hour = lc.cost_per_hour
FROM legacy_costs lc
WHERE pra.id = lc.allocation_id
  AND lc.cost_per_hour IS NOT NULL;

WITH calculated_costs AS (
  SELECT
    pra.id,
    public.calculate_employee_hourly_cost_for_month(
      pra.tenant_id,
      pra.employee_id,
      make_date(pra.year, pra.month, 1)
    ) AS cost_per_hour
  FROM public.project_role_allocations pra
  WHERE pra.cost_per_hour IS NULL
)
UPDATE public.project_role_allocations pra
SET cost_per_hour = cc.cost_per_hour
FROM calculated_costs cc
WHERE pra.id = cc.id
  AND cc.cost_per_hour IS NOT NULL;

-- Recalcula snapshots existentes e passa a incluir project_role_allocations.
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
  SELECT e.tenant_id INTO v_tenant_id
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

  WITH member_month_costs AS (
    SELECT
      pmm.id,
      public.calculate_employee_hourly_cost_for_month(
        p.tenant_id,
        pm.employee_id,
        (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
      ) AS cost_per_hour
    FROM public.project_member_months pmm
    JOIN public.project_members pm ON pm.id = pmm.project_member_id
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.employee_id = p_employee_id
      AND p.start_date IS NOT NULL
  )
  UPDATE public.project_member_months pmm
  SET cost_per_hour = mmc.cost_per_hour
  FROM member_month_costs mmc
  WHERE pmm.id = mmc.id
    AND mmc.cost_per_hour IS NOT NULL;

  WITH role_month_costs AS (
    SELECT
      pra.id,
      public.calculate_employee_hourly_cost_for_month(
        pra.tenant_id,
        pra.employee_id,
        make_date(pra.year, pra.month, 1)
      ) AS cost_per_hour
    FROM public.project_role_allocations pra
    WHERE pra.employee_id = p_employee_id
  )
  UPDATE public.project_role_allocations pra
  SET cost_per_hour = rmc.cost_per_hour
  FROM role_month_costs rmc
  WHERE pra.id = rmc.id
    AND rmc.cost_per_hour IS NOT NULL;

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
  SELECT DISTINCT pra.employee_id
  FROM public.project_role_allocations pra
  JOIN project_scope ps ON ps.id = pra.project_id
  UNION
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
        SELECT 1 FROM scoped_project_employees spe WHERE spe.employee_id = e.id
      )
    )
),
project_planned AS (
  SELECT
    pra.employee_id,
    pra.month::integer AS month,
    SUM(COALESCE(pra.planned_hours, 0))::numeric AS planned_hours,
    0::numeric AS actual_hours
  FROM public.project_role_allocations pra
  JOIN project_scope ps ON ps.id = pra.project_id
  WHERE pra.year = p_year
  GROUP BY pra.employee_id, pra.month
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
  GROUP BY pm.employee_id, EXTRACT(MONTH FROM pt.work_date)::integer
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
        SELECT 1 FROM scoped_project_employees spe WHERE spe.employee_id = aem.employee_id
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
        SELECT 1 FROM scoped_project_employees spe WHERE spe.employee_id = ats.employee_id
      )
    )
  GROUP BY ats.employee_id, EXTRACT(MONTH FROM ats.work_date)::integer
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

DROP FUNCTION IF EXISTS public.get_allocation_employee_detail(
  uuid,
  integer,
  uuid,
  uuid,
  uuid,
  text
);

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
  allocation_id uuid,
  title text,
  subtitle text,
  client_name text,
  manager_id uuid,
  manager_name text,
  team_key text,
  team_label text,
  project_start_date date,
  project_end_date date,
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
    p.end_date,
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
    ON p.service_line ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND s.id::text = p.service_line
  WHERE p.tenant_id = p_tenant_id
    AND (p_manager_id IS NULL OR p.manager_id = p_manager_id)
    AND (p_project_id IS NULL OR p.id = p_project_id)
    AND (p_team_key IS NULL OR COALESCE(p.service_line, '__sem_time__') = p_team_key)
),
legacy_project_members_for_employee AS (
  SELECT DISTINCT ON (pm.project_id)
    pm.id AS project_member_id,
    pm.project_id
  FROM public.project_members pm
  JOIN project_scope ps ON ps.id = pm.project_id
  WHERE pm.employee_id = p_employee_id
  ORDER BY pm.project_id, pm.id
),
project_role_planned AS (
  SELECT
    'project'::text AS item_type,
    pra.project_id AS item_id,
    pra.project_id,
    lpm.project_member_id,
    pra.id AS allocation_id,
    ps.name AS title,
    CONCAT(COALESCE(ps.manager_name, 'Sem gerente'), ' · ', ps.team_label) AS subtitle,
    ps.client_name,
    ps.manager_id,
    ps.manager_name,
    ps.team_key,
    ps.team_label,
    ps.start_date AS project_start_date,
    ps.end_date AS project_end_date,
    ps.duration_months,
    ps.is_continuous,
    pra.month::integer AS month,
    COALESCE(pra.planned_hours, 0)::numeric AS planned_hours,
    0::numeric AS actual_hours
  FROM public.project_role_allocations pra
  JOIN project_scope ps ON ps.id = pra.project_id
  LEFT JOIN legacy_project_members_for_employee lpm ON lpm.project_id = pra.project_id
  WHERE pra.employee_id = p_employee_id
    AND pra.year = p_year
),
project_actual AS (
  SELECT
    'project'::text AS item_type,
    ps.id AS item_id,
    ps.id AS project_id,
    pm.id AS project_member_id,
    pra.id AS allocation_id,
    ps.name AS title,
    CONCAT(COALESCE(ps.manager_name, 'Sem gerente'), ' · ', ps.team_label) AS subtitle,
    ps.client_name,
    ps.manager_id,
    ps.manager_name,
    ps.team_key,
    ps.team_label,
    ps.start_date AS project_start_date,
    ps.end_date AS project_end_date,
    ps.duration_months,
    ps.is_continuous,
    EXTRACT(MONTH FROM pt.work_date)::integer AS month,
    0::numeric AS planned_hours,
    SUM(COALESCE(pt.hours, 0))::numeric AS actual_hours
  FROM public.project_timesheets pt
  JOIN public.project_members pm ON pm.id = pt.project_member_id
  JOIN project_scope ps ON ps.id = pm.project_id
  LEFT JOIN public.project_role_allocations pra
    ON pra.project_id = pm.project_id
   AND pra.employee_id = pm.employee_id
   AND pra.year = p_year
   AND pra.month = EXTRACT(MONTH FROM pt.work_date)::integer
  WHERE pm.employee_id = p_employee_id
    AND pt.work_date >= make_date(p_year, 1, 1)
    AND pt.work_date < make_date(p_year + 1, 1, 1)
  GROUP BY ps.id, pm.id, pra.id, ps.name, ps.manager_name, ps.team_label,
    ps.client_name, ps.manager_id, ps.team_key, ps.start_date, ps.end_date, ps.duration_months,
    ps.is_continuous, EXTRACT(MONTH FROM pt.work_date)::integer
),
activity_planned AS (
  SELECT
    'internal_activity'::text AS item_type,
    aem.activity_type_id AS item_id,
    NULL::uuid AS project_id,
    NULL::uuid AS project_member_id,
    NULL::uuid AS allocation_id,
    at.name AS title,
    'Atividade interna'::text AS subtitle,
    NULL::text AS client_name,
    NULL::uuid AS manager_id,
    NULL::text AS manager_name,
    'internal_activity'::text AS team_key,
    'Atividade interna'::text AS team_label,
    NULL::date AS project_start_date,
    NULL::date AS project_end_date,
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
    NULL::uuid AS allocation_id,
    at.name AS title,
    'Atividade interna'::text AS subtitle,
    NULL::text AS client_name,
    NULL::uuid AS manager_id,
    NULL::text AS manager_name,
    'internal_activity'::text AS team_key,
    'Atividade interna'::text AS team_label,
    NULL::date AS project_start_date,
    NULL::date AS project_end_date,
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
  GROUP BY ats.activity_type_id, at.name, EXTRACT(MONTH FROM ats.work_date)::integer
),
combined AS (
  SELECT * FROM project_role_planned
  UNION ALL SELECT * FROM project_actual
  UNION ALL SELECT * FROM activity_planned
  UNION ALL SELECT * FROM activity_actual
)
SELECT
  c.item_type,
  c.item_id,
  c.project_id,
  (array_agg(c.project_member_id) FILTER (WHERE c.project_member_id IS NOT NULL))[1] AS project_member_id,
  (array_agg(c.allocation_id) FILTER (WHERE c.allocation_id IS NOT NULL))[1] AS allocation_id,
  c.title,
  c.subtitle,
  c.client_name,
  c.manager_id,
  c.manager_name,
  c.team_key,
  c.team_label,
  c.project_start_date,
  c.project_end_date,
  c.duration_months,
  c.is_continuous,
  c.month,
  SUM(c.planned_hours)::numeric AS planned_hours,
  SUM(c.actual_hours)::numeric AS actual_hours
FROM combined c
WHERE c.month BETWEEN 1 AND 12
GROUP BY c.item_type, c.item_id, c.project_id, c.title, c.subtitle, c.client_name,
  c.manager_id, c.manager_name, c.team_key, c.team_label, c.project_start_date,
  c.project_end_date, c.duration_months, c.is_continuous, c.month
ORDER BY c.item_type DESC, c.title, c.month;
$$;

-- Recalcula os snapshots novos para colaboradores com alocação no modelo novo.
DO $$
DECLARE
  v_employee record;
BEGIN
  FOR v_employee IN
    SELECT DISTINCT employee_id AS id
    FROM public.project_role_allocations
  LOOP
    PERFORM public.recalculate_employee_cost_snapshots(v_employee.id);
  END LOOP;
END $$;

-- Rollback operacional:
--   1) Restaurar get_allocation_employee_month_summary da migration
--      20260619160000_backfill_role_allocations_phase1.sql.
--   2) Restaurar get_allocation_employee_detail da migration
--      20260526150000_allocation_detail_end_date.sql.
--   3) Se necessário, remover trigger/function/coluna:
--        DROP TRIGGER IF EXISTS set_project_role_allocation_cost_snapshot
--          ON public.project_role_allocations;
--        DROP FUNCTION IF EXISTS public.set_project_role_allocation_cost_per_hour();
--        DROP FUNCTION IF EXISTS public.calculate_employee_hourly_cost_for_month(uuid, uuid, date);
--        ALTER TABLE public.project_role_allocations DROP COLUMN IF EXISTS cost_per_hour;
