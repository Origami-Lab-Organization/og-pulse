-- Corrige o snapshot de cost_per_hour (project_member_months, project_role_allocations e
-- project_timesheets) para respeitar a janela de admissão/desligamento do colaborador
-- dentro do mês — hoje ele só recorta por employee_versions.effective_from/effective_until,
-- que NUNCA é fechado por um desligamento (terminationService.ts não toca
-- employee_versions). Isso já exigiu correções manuais linha a linha em produção: ver
-- 20260519200000_fix_rafael_employee_cost_history.sql, onde foi preciso um
-- "UPDATE ... SET cost_per_hour = 0" direto porque recalculate_employee_cost_snapshots()
-- simplesmente não atualiza (fica em silêncio) meses sem nenhuma versão sobreposta.
--
-- Importante (ADR-0006, 20260619170000_complete_role_allocations_cutover.sql):
-- `project_role_allocations` é hoje a fonte CANÔNICA de horas planejadas — não
-- `project_member_months` (mantida só como compatibilidade de `project_timesheets`/
-- correções). Ambas, mais `project_timesheets`, já convergem numa única função
-- compartilhada, `calculate_employee_hourly_cost_for_month(tenant_id, employee_id,
-- month_start)` (usada também por `simulate_allocation_margin_impact` e pelos RPCs de
-- alocação) — então a correção certa é consertar ESSA função no lugar, não criar uma
-- paralela. As triggers e `recalculate_employee_cost_snapshots` só precisam continuar
-- delegando a ela.
--
-- Esta migration é só aditiva: reescreve a fórmula usada pela função compartilhada, pelas
-- triggers e pelo recálculo por funcionário, mas não sobrescreve nenhum dado existente. O
-- backfill retroativo para projetos ativos é a próxima migration, depois de revisão
-- manual do delta (ver supabase/_verification/employee-cost-per-hour-window-fix.sql).
--
-- Escopo deliberado: replica apenas a JANELA (admissão/desligamento) de
-- src/lib/payrollAnalysis.ts (calculatePayrollAnalysisRow/effectiveEmploymentWindow), não
-- a granularidade fina dela (benefícios prorateados por dia útil trabalhado vs.
-- ferramentas cheias vs. detalhamento de encargos). Portar isso para PL/pgSQL recriaria o
-- mesmo risco de duas implementações divergentes que esta migration existe para eliminar.

-- Data de desligamento mais antiga não cancelada — mesma regra usada por
-- src/hooks/usePayrollHistory.ts para montar o relatório Custo x Hora.
CREATE OR REPLACE FUNCTION public.employee_termination_date(p_employee_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT min(et.termination_date)
  FROM public.employee_terminations et
  WHERE et.employee_id = p_employee_id
    AND et.status <> 'cancelled';
$$;

-- Suporte à função acima, que passa a rodar no caminho quente das triggers de
-- project_member_months/project_role_allocations/project_timesheets.
CREATE INDEX IF NOT EXISTS idx_employee_terminations_employee_id_active
  ON public.employee_terminations(employee_id)
  WHERE status <> 'cancelled';

-- Fonte única do custo/hora por (tenant, funcionário, mês) — já era a função
-- compartilhada por project_role_allocations e pelos RPCs de margem/alocação; passa a
-- ser também a única chamada pelas triggers legadas de project_member_months/
-- project_timesheets e por recalculate_employee_cost_snapshots (ver corpo abaixo).
-- Mesma base de segmentação por employee_versions de antes (ponderada por capacidade em
-- horas quando há troca de versão no meio do mês), com o recorte que faltava: cada
-- segmento é limitado por GREATEST(effective_from, data_admissao, início do mês) até
-- LEAST(effective_until, data de desligamento, fim do mês). COALESCE(..., 0) garante que a
-- função sempre retorna um valor — nunca deixa a linha sem UPDATE (a causa raiz do bug).
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
      (date_trunc('month', p_month_start)::date + interval '1 month - 1 day')::date AS month_end,
      e.data_admissao,
      public.employee_termination_date(p_employee_id) AS termination_date
    FROM public.employees e
    WHERE e.id = p_employee_id
  ),
  version_segments AS (
    SELECT
      ev.total_monthly_cost_estimated,
      ev.jornada_diaria,
      GREATEST(ev.effective_from, b.data_admissao, b.month_start)::date AS segment_start,
      LEAST(
        COALESCE(ev.effective_until - 1, b.month_end),
        COALESCE(b.termination_date, b.month_end),
        b.month_end
      )::date AS segment_end,
      b.month_start,
      b.month_end
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
      -- Denominador continua sendo os dias úteis do mês CHEIO (não do segmento) — a
      -- ponderação por segment_capacity_hours já reflete a proporção de dias
      -- efetivamente empregados; dividir de novo pelo denominador recortado contaria a
      -- proporção duas vezes.
      total_monthly_cost_estimated / NULLIF(
        public.count_employee_cost_business_days(p_tenant_id, month_start, month_end) * jornada_diaria, 0
      ) AS segment_hourly_cost
    FROM version_segments
    WHERE segment_start <= segment_end
  )
  SELECT COALESCE(
    SUM(segment_capacity_hours * segment_hourly_cost) / NULLIF(SUM(segment_capacity_hours), 0),
    0
  )
  FROM segment_costs
  WHERE segment_capacity_hours > 0;
$$;

-- Modelo legado (compatibilidade de project_timesheets/correções — ADR-0006). Simplifica
-- para delegar à função única acima, em vez de manter uma segunda cópia da mesma
-- segmentação por employee_versions.
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

  NEW.cost_per_hour := public.calculate_employee_hourly_cost_for_month(v_tenant_id, v_employee_id, v_month_start);

  RETURN NEW;
END;
$$;

-- Nota: antes desta migration, o lançamento realizado usava a versão exata do dia
-- (work_date), enquanto o planejado já usava a média ponderada do mês. Unificar os dois
-- na média ponderada do mês (mesma função compartilhada) alinha ambos com a mesma
-- semântica mensal do relatório Custo x Hora (calculatePayrollAnalysisRow), fechando
-- também essa segunda divergência.
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
  SELECT pm.employee_id, e.tenant_id
  INTO v_employee_id, v_tenant_id
  FROM public.project_members pm
  JOIN public.employees e ON e.id = pm.employee_id
  WHERE pm.id = NEW.project_member_id;

  IF v_employee_id IS NULL OR v_tenant_id IS NULL OR NEW.work_date IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.cost_per_hour := public.calculate_employee_hourly_cost_for_month(
    v_tenant_id, v_employee_id, date_trunc('month', NEW.work_date)::date
  );

  RETURN NEW;
END;
$$;

-- set_project_role_allocation_cost_per_hour() (project_role_allocations, o modelo
-- canônico) já delega a calculate_employee_hourly_cost_for_month desde
-- 20260619170000_complete_role_allocations_cutover.sql — nada a mudar nela, herda a
-- correção automaticamente ao trocar a função acima.

-- Mantém o escopo de 3 tabelas já coberto desde 20260619170000 (project_member_months +
-- project_role_allocations + project_timesheets) e a guarda de autorização (é uma RPC
-- chamada pelo client — ver src/services/projectService.ts:recalculateMemberCosts e
-- src/hooks/useProjectMemberMonths.ts) — só troca timesheets para delegar à função única
-- também (unificando com o mesmo ponto acima) e passa a sobrescrever incondicionalmente
-- (inclusive com 0), fechando o "no-op silencioso" que exigiu o UPDATE manual na migration
-- de correção do Rafael.
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

  UPDATE public.project_member_months pmm
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    v_tenant_id, p_employee_id,
    (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
  )
  FROM public.project_members pm
  JOIN public.projects p ON p.id = pm.project_id
  WHERE pmm.project_member_id = pm.id
    AND pm.employee_id = p_employee_id;

  UPDATE public.project_role_allocations pra
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    v_tenant_id, p_employee_id, make_date(pra.year, pra.month, 1)
  )
  WHERE pra.employee_id = p_employee_id;

  UPDATE public.project_timesheets pt
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    v_tenant_id, p_employee_id, date_trunc('month', pt.work_date)::date
  )
  FROM public.project_members pm
  WHERE pt.project_member_id = pm.id
    AND pm.employee_id = p_employee_id;
END;
$$;

-- Backfill em massa, escopado a projetos ativos (usado só pela migration de backfill —
-- ver 20260721170000). Sem verificação de tenant/role própria (roda em todos os tenants
-- de uma vez), por isso não pode ficar exposta como RPC de cliente como a função por
-- funcionário acima.
CREATE OR REPLACE FUNCTION public.recalculate_employee_cost_snapshots_for_active_projects()
RETURNS TABLE(updated_member_months integer, updated_role_allocations integer, updated_timesheets integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_months integer;
  v_role_allocations integer;
  v_timesheets integer;
BEGIN
  UPDATE public.project_member_months pmm
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    p.tenant_id, pm.employee_id,
    (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
  )
  FROM public.project_members pm
  JOIN public.projects p ON p.id = pm.project_id
  WHERE pmm.project_member_id = pm.id
    AND p.status = 'active';
  GET DIAGNOSTICS v_member_months = ROW_COUNT;

  UPDATE public.project_role_allocations pra
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)
  )
  FROM public.projects p
  WHERE pra.project_id = p.id
    AND p.status = 'active';
  GET DIAGNOSTICS v_role_allocations = ROW_COUNT;

  UPDATE public.project_timesheets pt
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    e.tenant_id, e.id, date_trunc('month', pt.work_date)::date
  )
  FROM public.project_members pm
  JOIN public.employees e ON e.id = pm.employee_id
  JOIN public.projects p ON p.id = pt.project_id
  WHERE pt.project_member_id = pm.id
    AND p.status = 'active';
  GET DIAGNOSTICS v_timesheets = ROW_COUNT;

  RETURN QUERY SELECT v_member_months, v_role_allocations, v_timesheets;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_employee_cost_snapshots_for_active_projects() FROM PUBLIC;
