-- ─────────────────────────────────────────────────────────────────────────────
-- Correção: simulate_allocation_margin_impact não pode depender de
-- projects.project_type. Este banco não tem essa coluna (a migration
-- 20260313120000_project_type_and_milestones.sql não foi aplicada aqui e nenhum
-- read-path do app lê projects.project_type), então a versão anterior da função
-- falhava em runtime com "column p.project_type does not exist" (42703).
--
-- Sem uma flag de projeto interno confiável no schema real, derivamos "sem
-- margem" (só custo) de total_value <= 0 — que é exatamente quando não há
-- receita para calcular margem. O restante da lógica é idêntico à
-- 20260715120000.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.simulate_allocation_margin_impact(
  p_project_id uuid,
  p_employee_id uuid,
  p_months jsonb -- [{ "year": 2026, "month": 7, "hours": 40 }, ...]
)
RETURNS TABLE (
  custo_estimado numeric,
  horas_total numeric,
  custo_hora_medio numeric,
  margem_atual numeric,
  margem_simulada numeric,
  margem_baseline numeric,
  delta_pp numeric,
  tol_pp numeric,
  verdict text,
  has_baseline boolean,
  is_non_revenue boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_revenue numeric;
  v_budget_id uuid;
  v_taxes_pct numeric;
  v_commission_pct numeric;
  v_tol numeric;
  v_taxes numeric;
  v_commissions numeric;
  v_other numeric := 0;
  v_current_labor numeric := 0;
  v_baseline_labor numeric := 0;
  v_est numeric := 0;
  v_hours numeric := 0;
  v_has_baseline boolean := false;
  v_is_non_revenue boolean := false;
  v_margem_atual numeric;
  v_margem_simulada numeric;
  v_margem_baseline numeric;
  v_delta numeric;
  v_verdict text;
BEGIN
  SELECT p.tenant_id, COALESCE(p.total_value, 0), p.budget_id
  INTO v_tenant_id, v_revenue, v_budget_id
  FROM public.projects p
  WHERE p.id = p_project_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Projeto não encontrado';
  END IF;

  -- RLS da RPC: admin OU manager_id do projeto
  IF NOT (
    public.has_role(auth.uid(), v_tenant_id, 'admin')
    OR public.can_manage_project(auth.uid(), p_project_id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para simular impacto na margem deste projeto';
  END IF;

  SELECT fs.taxes_percent, fs.commission_percent, fs.margin_tolerance_pp
  INTO v_taxes_pct, v_commission_pct, v_tol
  FROM public.financial_settings fs
  WHERE fs.tenant_id = v_tenant_id;

  v_taxes_pct := COALESCE(v_taxes_pct, 0);
  v_commission_pct := COALESCE(v_commission_pct, 0);
  v_tol := COALESCE(v_tol, 3);

  -- Custo estimado desta alocação: Σ horas_mês × custo/hora VIGENTE no mês.
  SELECT
    COALESCE(SUM(
      (m->>'hours')::numeric
      * COALESCE(
          public.calculate_employee_hourly_cost_for_month(
            v_tenant_id, p_employee_id,
            make_date((m->>'year')::int, (m->>'month')::int, 1)
          ), 0)
    ), 0),
    COALESCE(SUM((m->>'hours')::numeric), 0)
  INTO v_est, v_hours
  FROM jsonb_array_elements(COALESCE(p_months, '[]'::jsonb)) AS m;

  -- Sem receita → não há margem a calcular, só custo (cobre projetos internos).
  v_is_non_revenue := (v_revenue <= 0);

  IF v_is_non_revenue THEN
    RETURN QUERY SELECT
      round(v_est, 2), v_hours,
      CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
      NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, v_tol,
      NULL::text, false, v_is_non_revenue;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(pc.planned_amount_brl), 0)
  INTO v_other
  FROM public.project_costs pc
  WHERE pc.project_id = p_project_id
    AND pc.deleted_at IS NULL;

  SELECT COALESCE(SUM(
    pra.planned_hours * COALESCE(
      pra.cost_per_hour,
      public.calculate_employee_hourly_cost_for_month(
        pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)
      ), 0)
  ), 0)
  INTO v_current_labor
  FROM public.project_role_allocations pra
  WHERE pra.project_id = p_project_id;

  IF v_budget_id IS NOT NULL THEN
    SELECT COALESCE(SUM(brm.hours * br.hourly_rate), 0)
    INTO v_baseline_labor
    FROM public.budget_roles br
    JOIN public.budget_role_months brm ON brm.budget_role_id = br.id
    WHERE br.budget_id = v_budget_id;

    v_has_baseline := EXISTS (
      SELECT 1 FROM public.budget_roles br WHERE br.budget_id = v_budget_id
    );
  END IF;

  v_taxes := (v_taxes_pct / 100.0) * v_revenue;
  v_commissions := (v_commission_pct / 100.0) * v_revenue;

  v_margem_atual :=
    ((v_revenue - v_taxes - v_commissions - (v_current_labor + v_other)) / v_revenue) * 100;
  v_margem_simulada :=
    ((v_revenue - v_taxes - v_commissions - (v_current_labor + v_other + v_est)) / v_revenue) * 100;

  IF v_has_baseline THEN
    v_margem_baseline :=
      ((v_revenue - v_taxes - v_commissions - (v_baseline_labor + v_other)) / v_revenue) * 100;
    v_delta := v_margem_simulada - v_margem_baseline;
    v_verdict := CASE
      WHEN v_margem_simulada >= v_margem_baseline - v_tol THEN 'fits'
      WHEN v_margem_simulada >= v_margem_baseline - (2 * v_tol) THEN 'tightens'
      ELSE 'breaks'
    END;
  END IF;

  RETURN QUERY SELECT
    round(v_est, 2), v_hours,
    CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
    round(v_margem_atual, 2), round(v_margem_simulada, 2),
    round(v_margem_baseline, 2), round(v_delta, 2), v_tol,
    v_verdict, v_has_baseline, v_is_non_revenue;
END;
$$;

GRANT EXECUTE ON FUNCTION public.simulate_allocation_margin_impact(uuid, uuid, jsonb) TO authenticated;
