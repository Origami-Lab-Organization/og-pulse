-- PUL-164 (2a onda) — projects.total_value sai da tabela que o funcionário precisa ler.
--
-- Problema:
--   `total_value` (valor de contrato) morava em `projects`. RLS é row-level e o
--   funcionário precisa ler a linha do projeto — nome, datas, status — em
--   /my-projects, no timesheet e no quadro de atividades. `projects` ainda é
--   embutido em dezenas de consultas (`projects(name)` dentro de project_members,
--   timesheets, activity cards), então restringir a tabela quebraria o funcionário.
--   Resultado: não havia como proteger a coluna sem tirá-la de lá.
--
-- Decisão:
--   Mover o valor de contrato para `project_financials`, tabela-filha 1:1 com RLS
--   de admin/gerente. `projects` volta a ser uma tabela sem dado financeiro, e a
--   regra da tela passa a ser a regra do banco.
--
--   Mesmo caminho que o ADR-0020 usou para remuneração em `employees`: quando a
--   proteção é por coluna e RLS é por linha, a coluna muda de lugar.
--
-- Ver ADR-0024.

-- 1. Tabela-filha ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_financials (
  project_id  uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  total_value numeric NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.project_financials IS
  'Valor de contrato do projeto. Separado de projects porque projects precisa ser '
  'legível por qualquer membro (nome, datas, status) e RLS não restringe coluna (PUL-164).';

-- 2. Migração dos dados existentes ----------------------------------------------
--
-- Idempotente: ON CONFLICT DO NOTHING permite reexecução parcial sem perder valor
-- já gravado. COALESCE preserva o default 0 para projeto sem valor definido.
INSERT INTO public.project_financials (project_id, total_value)
SELECT p.id, COALESCE(p.total_value, 0)
FROM public.projects p
ON CONFLICT (project_id) DO NOTHING;

-- 3. RLS: mesmo predicado do resto do financeiro de projeto ---------------------
ALTER TABLE public.project_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view project financials"
ON public.project_financials FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_financials.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert project financials"
ON public.project_financials FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_financials.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can update project financials"
ON public.project_financials FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_financials.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins can delete project financials"
ON public.project_financials FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_financials.project_id
      AND public.has_role(auth.uid(), p.tenant_id, 'admin')
  )
);

DROP TRIGGER IF EXISTS update_project_financials_updated_at ON public.project_financials;
CREATE TRIGGER update_project_financials_updated_at
  BEFORE UPDATE ON public.project_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Toda criação de projeto ganha a linha-filha --------------------------------
--
-- Garante que não existe projeto sem registro financeiro, inclusive nos caminhos
-- que não passam pelo frontend (Edge Function de seed, importação futura).
CREATE OR REPLACE FUNCTION public.ensure_project_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.project_financials (project_id, total_value)
  VALUES (NEW.id, 0)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS create_project_financials ON public.projects;
CREATE TRIGGER create_project_financials
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.ensure_project_financials();

-- 5. simulate_allocation_margin_impact passa a ler da tabela-filha -------------
--
-- Único objeto SQL que referenciava projects.total_value. O corpo abaixo é o da
-- definição vigente (20260717203954), com apenas a leitura da receita alterada
-- para LEFT JOIN em project_financials — extraído e reemitido programaticamente
-- para não haver erro de transcrição nas outras 90 linhas.
--
-- A função é SECURITY INVOKER e já valida `has_role(admin) OR can_manage_project`,
-- portanto a RLS de project_financials (admin/gerente) não a restringe além do que
-- ela já restringia.
CREATE OR REPLACE FUNCTION public.simulate_allocation_margin_impact(
  p_project_id uuid,
  p_employee_id uuid,
  p_months jsonb
)
RETURNS TABLE (
  custo_estimado numeric, horas_total numeric, custo_hora_medio numeric,
  margem_atual numeric, margem_simulada numeric, margem_baseline numeric,
  delta_pp numeric, tol_pp numeric, verdict text, has_baseline boolean, is_non_revenue boolean
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_tenant_id uuid; v_revenue numeric; v_budget_id uuid;
  v_taxes_pct numeric; v_commission_pct numeric; v_tol numeric;
  v_taxes numeric; v_commissions numeric; v_other numeric := 0;
  v_current_labor numeric := 0; v_baseline_labor numeric := 0;
  v_est numeric := 0; v_hours numeric := 0;
  v_has_baseline boolean := false; v_is_non_revenue boolean := false;
  v_margem_atual numeric; v_margem_simulada numeric; v_margem_baseline numeric;
  v_delta numeric; v_verdict text;
BEGIN
  SELECT p.tenant_id, COALESCE(pf.total_value, 0), p.budget_id
  INTO v_tenant_id, v_revenue, v_budget_id
  FROM public.projects p
  LEFT JOIN public.project_financials pf ON pf.project_id = p.id
  WHERE p.id = p_project_id;

  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Projeto não encontrado'; END IF;
  IF NOT (public.has_role(auth.uid(), v_tenant_id, 'admin')
          OR public.can_manage_project(auth.uid(), p_project_id)) THEN
    RAISE EXCEPTION 'Sem permissão para simular impacto na margem deste projeto';
  END IF;

  SELECT fs.taxes_percent, fs.commission_percent, fs.margin_tolerance_pp
  INTO v_taxes_pct, v_commission_pct, v_tol
  FROM public.financial_settings fs WHERE fs.tenant_id = v_tenant_id;

  v_taxes_pct := COALESCE(v_taxes_pct, 0);
  v_commission_pct := COALESCE(v_commission_pct, 0);
  v_tol := COALESCE(v_tol, 3);

  SELECT
    COALESCE(SUM((m->>'hours')::numeric
      * COALESCE(public.calculate_employee_hourly_cost_for_month(
          v_tenant_id, p_employee_id,
          make_date((m->>'year')::int, (m->>'month')::int, 1)), 0)), 0),
    COALESCE(SUM((m->>'hours')::numeric), 0)
  INTO v_est, v_hours
  FROM jsonb_array_elements(COALESCE(p_months, '[]'::jsonb)) AS m;

  v_is_non_revenue := (v_revenue <= 0);

  IF v_is_non_revenue THEN
    RETURN QUERY SELECT round(v_est, 2), v_hours,
      CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
      NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, v_tol,
      NULL::text, false, v_is_non_revenue;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(pc.planned_amount_brl), 0) INTO v_other
  FROM public.project_costs pc
  WHERE pc.project_id = p_project_id AND pc.deleted_at IS NULL;

  SELECT COALESCE(SUM(pra.planned_hours * COALESCE(pra.cost_per_hour,
    public.calculate_employee_hourly_cost_for_month(pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)), 0)), 0)
  INTO v_current_labor
  FROM public.project_role_allocations pra WHERE pra.project_id = p_project_id;

  IF v_budget_id IS NOT NULL THEN
    SELECT COALESCE(SUM(brm.hours * br.hourly_rate), 0) INTO v_baseline_labor
    FROM public.budget_roles br
    JOIN public.budget_role_months brm ON brm.budget_role_id = br.id
    WHERE br.budget_id = v_budget_id;
    v_has_baseline := EXISTS (SELECT 1 FROM public.budget_roles br WHERE br.budget_id = v_budget_id);
  END IF;

  v_taxes := (v_taxes_pct / 100.0) * v_revenue;
  v_commissions := (v_commission_pct / 100.0) * v_revenue;
  v_margem_atual := ((v_revenue - v_taxes - v_commissions - (v_current_labor + v_other)) / v_revenue) * 100;
  v_margem_simulada := ((v_revenue - v_taxes - v_commissions - (v_current_labor + v_other + v_est)) / v_revenue) * 100;

  IF v_has_baseline THEN
    v_margem_baseline := ((v_revenue - v_taxes - v_commissions - (v_baseline_labor + v_other)) / v_revenue) * 100;
    v_delta := v_margem_simulada - v_margem_baseline;
    v_verdict := CASE
      WHEN v_margem_simulada >= v_margem_baseline - v_tol THEN 'fits'
      WHEN v_margem_simulada >= v_margem_baseline - (2 * v_tol) THEN 'tightens'
      ELSE 'breaks' END;
  END IF;

  RETURN QUERY SELECT round(v_est, 2), v_hours,
    CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
    round(v_margem_atual, 2), round(v_margem_simulada, 2),
    round(v_margem_baseline, 2), round(v_delta, 2), v_tol,
    v_verdict, v_has_baseline, v_is_non_revenue;
END;
$$;

-- 6. Remoção da coluna ---------------------------------------------------------
--
-- Sem CASCADE de propósito: se algum objeto ainda depender da coluna, a migration
-- falha e o problema aparece aqui, em vez de silenciosamente remover a dependência.
ALTER TABLE public.projects DROP COLUMN total_value;
