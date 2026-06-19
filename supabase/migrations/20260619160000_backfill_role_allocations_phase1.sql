-- ─────────────────────────────────────────────────────────────────────────────
-- ADR-0006 — Fase 1: migrar a equipe do modelo antigo (project_members +
-- project_member_months, ligado a custo) para o modelo novo
-- (project_role_allocations, aba Equipe).
--
-- Esta migração é ADITIVA e IDEMPOTENTE:
--   1) Backfill: copia as horas planejadas do modelo antigo para o novo,
--      convertendo month_number (relativo ao início do projeto) em ano/mês de
--      calendário via projects.start_date. ON CONFLICT DO NOTHING preserva
--      alocações já criadas pela aba Equipe.
--   2) Guarda anti-dupla-contagem: o RPC de resumo passa a IGNORAR linhas de
--      project_member_months quando já existe project_role_allocations para o
--      mesmo (employee, project, year, month). Sem isso, o UNION ALL do RPC
--      somaria as duas fontes e dobraria as horas após o backfill.
--
-- NÃO deleta o modelo antigo (custo/margem ainda lê dele — ver Fases 2-4 no ADR).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) BACKFILL ────────────────────────────────────────────────────────────────
-- Reconciliação: o modelo novo tem UNIQUE(employee, project, year, month).
-- Se houver mais de um project_member do mesmo colaborador no mesmo projeto/mês,
-- as horas são SOMADAS (uma alocação por mês). Papéis sem employee_id não migram
-- (o modelo novo exige employee_id NOT NULL).
INSERT INTO public.project_role_allocations
  (project_id, tenant_id, employee_id, budget_role_id, custom_role_name, year, month, planned_hours)
SELECT
  src.project_id,
  src.tenant_id,
  src.employee_id,
  -- se algum membro tinha papel orçado, usa o budget_role_id; senão, papel custom (texto)
  (array_agg(src.budget_role_id) FILTER (WHERE src.budget_role_id IS NOT NULL))[1] AS budget_role_id,
  CASE
    WHEN bool_or(src.budget_role_id IS NOT NULL) THEN NULL
    ELSE (array_agg(src.role) FILTER (WHERE src.role IS NOT NULL AND src.role <> ''))[1]
  END AS custom_role_name,
  src.year,
  src.month,
  SUM(src.hours)::numeric(6,1) AS planned_hours
FROM (
  SELECT
    pm.project_id,
    p.tenant_id,
    pm.employee_id,
    pm.budget_role_id,
    pm.role,
    EXTRACT(YEAR  FROM cal.d)::int AS year,
    EXTRACT(MONTH FROM cal.d)::int AS month,
    pmm.hours
  FROM public.project_member_months pmm
  JOIN public.project_members pm ON pm.id = pmm.project_member_id
  JOIN public.projects        p  ON p.id = pm.project_id
  CROSS JOIN LATERAL (
    SELECT (date_trunc('month', p.start_date)::date
            + ((pmm.month_number - 1) * interval '1 month'))::date AS d
  ) cal
  WHERE pm.employee_id IS NOT NULL
    AND p.start_date IS NOT NULL
    AND COALESCE(pmm.hours, 0) > 0
) src
GROUP BY src.project_id, src.tenant_id, src.employee_id, src.year, src.month
ON CONFLICT (employee_id, project_id, year, month) DO NOTHING;

-- 2) GUARDA ANTI-DUPLA-CONTAGEM no RPC de resumo ──────────────────────────────
-- Mesma assinatura/corpo de 20260526144949, com UMA mudança: a CTE
-- project_planned (project_member_months) ganha um NOT EXISTS contra
-- project_role_allocations para o mesmo (employee, project, ano, mês).
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
  UNION
  SELECT DISTINCT pra.employee_id
  FROM public.project_role_allocations pra
  JOIN project_scope ps ON ps.id = pra.project_id
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
    -- GUARDA: ignora a linha antiga se já houver alocação nova equivalente (evita dupla contagem)
    AND NOT EXISTS (
      SELECT 1
      FROM public.project_role_allocations pra2
      WHERE pra2.employee_id = pm.employee_id
        AND pra2.project_id  = pm.project_id
        AND pra2.year  = EXTRACT(YEAR  FROM (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month')))::integer
        AND pra2.month = EXTRACT(MONTH FROM (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month')))::integer
    )
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
  GROUP BY ats.employee_id, month
),
project_role_planned AS (
  SELECT
    pra.employee_id,
    pra.month::integer AS month,
    SUM(COALESCE(pra.planned_hours, 0))::numeric AS planned_hours,
    0::numeric AS actual_hours
  FROM public.project_role_allocations pra
  JOIN project_scope ps ON ps.id = pra.project_id
  WHERE pra.year = p_year
    AND (
      (p_manager_id IS NULL AND p_project_id IS NULL AND p_team_key IS NULL)
      OR EXISTS (
        SELECT 1 FROM scoped_project_employees spe WHERE spe.employee_id = pra.employee_id
      )
    )
  GROUP BY pra.employee_id, pra.month
),
combined AS (
  SELECT * FROM project_planned
  UNION ALL SELECT * FROM project_actual
  UNION ALL SELECT * FROM activity_planned
  UNION ALL SELECT * FROM activity_actual
  UNION ALL SELECT * FROM project_role_planned
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

-- ─────────────────────────────────────────────────────────────────────────────
-- VALIDAÇÃO MANUAL (rodar antes/depois, NÃO faz parte do schema):
--
--   -- total planejado por colaborador/ano no modelo ANTIGO (calendário):
--   SELECT pm.employee_id,
--          EXTRACT(YEAR FROM (date_trunc('month', p.start_date)::date
--                 + ((pmm.month_number - 1) * interval '1 month')))::int AS ano,
--          SUM(pmm.hours) AS horas_antigo
--   FROM project_member_months pmm
--   JOIN project_members pm ON pm.id = pmm.project_member_id
--   JOIN projects p ON p.id = pm.project_id
--   WHERE pm.employee_id IS NOT NULL AND p.start_date IS NOT NULL
--   GROUP BY 1,2;
--
--   -- total planejado no modelo NOVO:
--   SELECT employee_id, year AS ano, SUM(planned_hours) AS horas_novo
--   FROM project_role_allocations GROUP BY 1,2;
--
--   Após o backfill, horas_novo deve ser >= horas_antigo (>= por causa de
--   alocações já existentes na aba Equipe). E o RPC de resumo NÃO deve dobrar.
-- ─────────────────────────────────────────────────────────────────────────────
