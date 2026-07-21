-- Verificação da correção de janela admissão/desligamento em cost_per_hour.
-- NÃO é migration (pasta fora de supabase/migrations). Rode manualmente no Supabase
-- DEPOIS de aplicar 20260721160000_employee_cost_snapshot_admission_termination_window.sql
-- e ANTES de aplicar 20260721170000_backfill_active_project_cost_snapshots.sql.
--
-- As três primeiras queries listam, por linha, o valor hoje armazenado vs. o que
-- calculate_employee_hourly_cost_for_month geraria (a função já foi trocada pela
-- migration anterior, mas nenhum dado foi sobrescrito ainda). Revisar contagem e delta em
-- R$ com o time antes de aplicar o backfill — se o total for muito maior que o esperado
-- (ex.: só os casos de desligamento no meio do mês), investigar antes de prosseguir.
--
-- project_role_allocations é a fonte CANÔNICA de horas planejadas (ADR-0006); é a mais
-- importante das três para revisar, já que é o que a aba Financeiro/Custos usa hoje via
-- useProjectLaborBreakdown. project_member_months fica só como compatibilidade de
-- project_timesheets/correções.

-- 1. Planejado canônico (project_role_allocations) — linhas divergentes, projetos ativos
SELECT
  pra.id,
  p.name AS project_name,
  e.nome AS employee_name,
  pra.year,
  pra.month,
  pra.planned_hours,
  pra.cost_per_hour AS old_cost_per_hour,
  public.calculate_employee_hourly_cost_for_month(pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)) AS new_cost_per_hour,
  (public.calculate_employee_hourly_cost_for_month(pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)) - pra.cost_per_hour)
    * COALESCE(pra.planned_hours, 0) AS planned_cost_delta
FROM public.project_role_allocations pra
JOIN public.projects p ON p.id = pra.project_id
JOIN public.employees e ON e.id = pra.employee_id
WHERE p.status = 'active'
  AND pra.cost_per_hour IS DISTINCT FROM public.calculate_employee_hourly_cost_for_month(
    pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)
  )
ORDER BY abs((public.calculate_employee_hourly_cost_for_month(pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)) - pra.cost_per_hour)
  * COALESCE(pra.planned_hours, 0)) DESC;

-- 2. Planejado legado (project_member_months) — linhas divergentes, projetos ativos
SELECT
  pmm.id,
  p.name AS project_name,
  e.nome AS employee_name,
  pmm.month_number,
  pmm.hours,
  pmm.cost_per_hour AS old_cost_per_hour,
  public.calculate_employee_hourly_cost_for_month(
    p.tenant_id, pm.employee_id,
    (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
  ) AS new_cost_per_hour,
  (public.calculate_employee_hourly_cost_for_month(
    p.tenant_id, pm.employee_id,
    (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
  ) - pmm.cost_per_hour) * pmm.hours AS planned_cost_delta
FROM public.project_member_months pmm
JOIN public.project_members pm ON pm.id = pmm.project_member_id
JOIN public.projects p ON p.id = pm.project_id
JOIN public.employees e ON e.id = pm.employee_id
WHERE p.status = 'active'
  AND pmm.cost_per_hour IS DISTINCT FROM public.calculate_employee_hourly_cost_for_month(
    p.tenant_id, pm.employee_id,
    (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
  )
ORDER BY abs((public.calculate_employee_hourly_cost_for_month(
    p.tenant_id, pm.employee_id,
    (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
  ) - pmm.cost_per_hour) * pmm.hours) DESC;

-- 3. Realizado (project_timesheets) — mesma comparação, projetos ativos
SELECT
  pt.id,
  p.name AS project_name,
  e.nome AS employee_name,
  pt.work_date,
  pt.hours,
  pt.cost_per_hour AS old_cost_per_hour,
  public.calculate_employee_hourly_cost_for_month(e.tenant_id, e.id, date_trunc('month', pt.work_date)::date) AS new_cost_per_hour,
  (public.calculate_employee_hourly_cost_for_month(e.tenant_id, e.id, date_trunc('month', pt.work_date)::date) - pt.cost_per_hour) * pt.hours AS realized_cost_delta
FROM public.project_timesheets pt
JOIN public.project_members pm ON pm.id = pt.project_member_id
JOIN public.projects p ON p.id = pt.project_id
JOIN public.employees e ON e.id = pm.employee_id
WHERE p.status = 'active'
  AND pt.cost_per_hour IS DISTINCT FROM public.calculate_employee_hourly_cost_for_month(e.tenant_id, e.id, date_trunc('month', pt.work_date)::date)
ORDER BY abs((public.calculate_employee_hourly_cost_for_month(e.tenant_id, e.id, date_trunc('month', pt.work_date)::date) - pt.cost_per_hour) * pt.hours) DESC;

-- 4. Resumo agregado — quantas linhas mudam nas três tabelas, projetos ativos
SELECT
  (SELECT count(*) FROM public.project_role_allocations pra
     JOIN public.projects p ON p.id = pra.project_id WHERE p.status = 'active') AS total_role_allocation_rows_active,
  (SELECT count(*) FROM public.project_role_allocations pra
     JOIN public.projects p ON p.id = pra.project_id WHERE p.status = 'active'
       AND pra.cost_per_hour IS DISTINCT FROM public.calculate_employee_hourly_cost_for_month(
         pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1))) AS changed_role_allocation_rows,
  (SELECT count(*) FROM public.project_member_months pmm
     JOIN public.project_members pm ON pm.id = pmm.project_member_id
     JOIN public.projects p ON p.id = pm.project_id
     WHERE p.status = 'active') AS total_planned_rows_active,
  (SELECT count(*) FROM public.project_member_months pmm
     JOIN public.project_members pm ON pm.id = pmm.project_member_id
     JOIN public.projects p ON p.id = pm.project_id
     WHERE p.status = 'active'
       AND pmm.cost_per_hour IS DISTINCT FROM public.calculate_employee_hourly_cost_for_month(
         p.tenant_id, pm.employee_id, (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
       )) AS changed_planned_rows,
  (SELECT count(*) FROM public.project_timesheets pt
     JOIN public.projects p ON p.id = pt.project_id
     WHERE p.status = 'active') AS total_timesheet_rows_active,
  (SELECT count(*) FROM public.project_timesheets pt
     JOIN public.project_members pm ON pm.id = pt.project_member_id
     JOIN public.employees e ON e.id = pm.employee_id
     JOIN public.projects p ON p.id = pt.project_id
     WHERE p.status = 'active'
       AND pt.cost_per_hour IS DISTINCT FROM public.calculate_employee_hourly_cost_for_month(e.tenant_id, e.id, date_trunc('month', pt.work_date)::date)
     ) AS changed_timesheet_rows;

-- 5. Linhas "órfãs" — lançamentos fora de [data_admissao, data de desligamento] do
--    funcionário. Sob a correção, essas linhas vão a zero. Sinaliza para o time investigar
--    se o lançamento em si está correto (ex.: hora lançada com data errada), em vez de
--    assumir que zerar é sempre a resposta certa.
SELECT pt.id, e.nome, pt.work_date, e.data_admissao, public.employee_termination_date(e.id) AS termination_date
FROM public.project_timesheets pt
JOIN public.project_members pm ON pm.id = pt.project_member_id
JOIN public.projects p ON p.id = pt.project_id
JOIN public.employees e ON e.id = pm.employee_id
WHERE p.status = 'active'
  AND (
    pt.work_date < e.data_admissao
    OR (
      public.employee_termination_date(e.id) IS NOT NULL
      AND pt.work_date > public.employee_termination_date(e.id)
    )
  );
