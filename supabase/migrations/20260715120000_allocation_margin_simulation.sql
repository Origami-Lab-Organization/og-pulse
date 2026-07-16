-- ─────────────────────────────────────────────────────────────────────────────
-- Simulação de impacto na margem pré-alocação (aba Equipe v2, §5.3)
--
-- 1) financial_settings.margin_tolerance_pp: a tolerância (`tol`) do tenant que o
--    veredito usa como faixa em torno da baseline. Default 3pp (motor v2).
-- 2) RPC simulate_allocation_margin_impact: calcula, 100% server-side, o custo
--    estimado da alocação e as três margens (baseline / atual / simulada) do
--    projeto, devolvendo APENAS agregados. Nenhum campo salarial bruto
--    (salario_mensal, custo_hora individual, total_monthly_cost_estimated)
--    trafega para o cliente — o custo/hora vigente por mês é resolvido dentro do
--    banco por calculate_employee_hourly_cost_for_month (SECURITY DEFINER).
--
--    Régua do veredito (spec §5.3.3), com o `tol` do tenant:
--      🟢 fits      — simulada ≥ baseline − tol
--      🟡 tightens  — baseline − 2·tol ≤ simulada < baseline − tol
--      🔴 breaks    — simulada < baseline − 2·tol
--
--    Margens (fórmula canônica do motor, sobre-pulse.md §5.4):
--      margem% = (receita − impostos − comissões − custo_total) / receita × 100
--    Compartilham receita/impostos/comissões/outros-custos; o que muda entre elas
--    é só o custo de mão de obra:
--      baseline  = mão de obra ORÇADA (budget_roles × budget_role_months)
--      atual     = mão de obra das alocações CORRENTES (cost_per_hour snapshot)
--      simulada  = atual + custo estimado desta alocação
--    Assim o Δ = simulada − baseline reflete o custo real da pessoa sobre o plano.
--
--    RLS: admin OU manager_id do projeto (can_manage_project) — igual às demais
--    RPCs da aba Equipe (ver 20260707130000_project_team_rows.sql).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Tolerância do tenant
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS margin_tolerance_pp numeric NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.financial_settings.margin_tolerance_pp IS
  'Tolerância (em pontos percentuais) que o veredito de impacto na margem usa como faixa em torno da baseline. Default 3pp.';

-- 2) RPC de simulação
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
  v_project_type text;
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
  SELECT p.tenant_id, COALESCE(p.total_value, 0), p.project_type, p.budget_id
  INTO v_tenant_id, v_revenue, v_project_type, v_budget_id
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
  -- calculate_employee_hourly_cost_for_month é SECURITY DEFINER: o salário não
  -- sai do banco; só o agregado volta.
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

  v_is_non_revenue := (v_project_type = 'non_revenue');

  -- Projeto interno ou sem receita: só existe custo, não margem.
  IF v_is_non_revenue OR v_revenue <= 0 THEN
    RETURN QUERY SELECT
      round(v_est, 2), v_hours,
      CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
      NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, v_tol,
      NULL::text, false, v_is_non_revenue;
    RETURN;
  END IF;

  -- Outros custos planejados (extra-labor, tabela unificada, em BRL). Entram
  -- igualmente nas três margens, então não afetam o Δ — só o nível absoluto.
  SELECT COALESCE(SUM(pc.planned_amount_brl), 0)
  INTO v_other
  FROM public.project_costs pc
  WHERE pc.project_id = p_project_id
    AND pc.deleted_at IS NULL;

  -- Mão de obra planejada CORRENTE: todas as alocações atuais do projeto.
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

  -- Baseline derivada do orçamento: mão de obra ORÇADA (papéis × horas × taxa).
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
