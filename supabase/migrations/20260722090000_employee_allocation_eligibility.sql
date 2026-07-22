-- ─────────────────────────────────────────────────────────────────────────────
-- Aloca em projetos: colaborador que não participa do fluxo de alocação/timesheet
-- (RH, financeiro, backoffice) deixa de aparecer no seletor "Adicionar a um
-- projeto", na grade "Alocação da Equipe" e no Capacity Planner.
--
-- Não afeta folha (payrollCalculator), headcount ou turnover — esses continuam
-- filtrando só por `status`, nunca por este campo (ver .harness/domain-glossary.md).
--
-- Decisões (ver .harness/adr/0010-employee-allocation-eligibility-flag.md):
--   1. Flag manual, default true (aditivo, não quebra alocação existente).
--   2. Só admin altera — mesmo que managers editem os demais campos da ficha
--      (RLS de UPDATE em employees já libera admin OU manager). Trigger dedicado,
--      no mesmo espírito de prevent_employee_self_escalation, mas como regra
--      própria: aqui bloqueia MANAGER também, não só o próprio colaborador.
--   3. Não pode desmarcar (true→false) com alocação ativa em project_role_allocations
--      no mês atual ou futuro — mesma janela que deallocate_project_member() usa
--      para zerar horas futuras (20260707130000_project_team_rows.sql).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS aloca_em_projetos boolean NOT NULL DEFAULT true;

-- 1) Somente admin pode alterar aloca_em_projetos (independente de quem tem
-- permissão de UPDATE na linha via RLS — manager ou o próprio admin).
CREATE OR REPLACE FUNCTION public.enforce_aloca_em_projetos_admin_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.aloca_em_projetos IS DISTINCT FROM OLD.aloca_em_projetos
     AND NOT public.has_role(auth.uid(), OLD.tenant_id, 'admin'::app_role)
  THEN
    RAISE EXCEPTION 'Permission denied: only admin can modify aloca_em_projetos';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_aloca_em_projetos_admin_only ON public.employees;
CREATE TRIGGER enforce_aloca_em_projetos_admin_only
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_aloca_em_projetos_admin_only();

-- 2) Bloqueia desmarcar aloca_em_projetos enquanto o colaborador tiver alocação
-- ativa (mês atual ou futuro com planned_hours > 0) em algum projeto.
CREATE OR REPLACE FUNCTION public.enforce_aloca_em_projetos_no_active_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_names text;
BEGIN
  IF OLD.aloca_em_projetos = true AND NEW.aloca_em_projetos = false THEN
    SELECT string_agg(DISTINCT p.name, ', ' ORDER BY p.name) INTO v_project_names
    FROM public.project_role_allocations pra
    JOIN public.projects p ON p.id = pra.project_id
    WHERE pra.employee_id = OLD.id
      AND make_date(pra.year, pra.month, 1) >= date_trunc('month', now())::date
      AND pra.planned_hours > 0;

    IF v_project_names IS NOT NULL THEN
      RAISE EXCEPTION 'Não é possível desmarcar "aloca em projetos": colaborador tem alocação ativa em %. Desaloque antes de continuar.', v_project_names;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_aloca_em_projetos_no_active_allocations ON public.employees;
CREATE TRIGGER enforce_aloca_em_projetos_no_active_allocations
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_aloca_em_projetos_no_active_allocations();

-- 3) Filtra employee_scope da RPC de alocação (grade "Alocação da Equipe" +
-- Capacity Planner) para excluir quem não aloca em projetos. Recriação integral
-- da função (nunca editar migration aplicada) — única mudança é o novo
-- `AND e.aloca_em_projetos = true` logo após o filtro de tenant, antes do OR
-- de escopo por manager/project/team (que não é afetado por este AND).
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
    AND e.aloca_em_projetos = true
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
