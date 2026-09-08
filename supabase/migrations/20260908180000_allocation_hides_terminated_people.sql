-- Meu Time / Alocações: quem foi desligado some dos meses posteriores à saída.
--
-- Defeito relatado: "Lorraine foi desligada e segue aparecendo no relatório de alocações
-- Meu Time". Aparecia com capacidade 0h e 160h planejadas, exibida como "-160h estourou".
--
-- Causa: `get_allocation_employee_month_summary_unguarded` monta a lista de pessoas
-- filtrando SÓ por `aloca_em_projetos = true`. Não olha `status` nem desligamento. Então
-- toda pessoa já marcada como alocável continua na lista para sempre, e a capacidade
-- zerada de quem saiu vira estouro na leitura.
--
-- Não é só a Lorraine: cinco pessoas apareciam no tenant principal —
--   Rafael Bruno Andrade        desligado         17/04/2026
--   Mariana Almeida Mendonça    em_desligamento   28/02/2026
--   Enzo Rodrigues Pieroni      em_desligamento   21/05/2026
--   Bruno Monteiro Mestanza     em_desligamento   26/06/2026
--   Lorraine Aparecida de Oliveira  em_desligamento  25/08/2026
--
-- O corte é por MÊS, não por pessoa: quem trabalhou em maio continua aparecendo em maio.
-- Apagar a pessoa da série inteira reescreveria o histórico de capacidade do time.
--
-- FORA DO ESCOPO, e mais grave: o desligamento não limpa alocação futura. A Lorraine tem
-- 4.960h planejadas em 31 meses, de set/2026 a mar/2029, DEPOIS da data de saída; o Bruno
-- tem 8h. Essas horas seguem contando no planejamento do projeto e na simulação de margem.
-- Esta migration esconde a leitura errada, não corrige o dado — limpar exige decidir o que
-- fazer com o plano de cada projeto, e isso é do negócio.
--
-- Corpo gerado a partir de `pg_get_functiondef` do banco; a única mudança é o WHERE final.

CREATE OR REPLACE FUNCTION public.get_allocation_employee_month_summary_unguarded(p_tenant_id uuid, p_year integer, p_manager_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid, p_team_key text DEFAULT NULL::text)
 RETURNS TABLE(employee_id uuid, employee_name text, cargo text, jornada_diaria numeric, status text, hire_date date, termination_date date, month integer, planned_hours numeric, actual_hours numeric, capacity_hours numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
  -- Quem saiu não ocupa capacidade depois de sair. A pessoa continua nos meses em que
  -- trabalhou (o histórico é real) e some do mês seguinte ao desligamento em diante.
  -- Sem isto, quem foi desligado aparecia com capacidade 0 e planejado cheio, exibido
  -- como "estourou" — quando o certo é ela nem estar na lista daquele mês.
  AND (et.termination_date IS NULL OR et.termination_date >= make_date(p_year, m.month, 1))
  -- Desligado sem data registrada é lacuna de cadastro: fora da lista, não em todo mês.
  AND NOT (e.status = 'desligado' AND et.termination_date IS NULL)
ORDER BY e.nome, m.month;
$function$;
