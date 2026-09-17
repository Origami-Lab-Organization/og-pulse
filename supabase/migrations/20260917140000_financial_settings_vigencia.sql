-- PUL-260 — a configuração financeira passa a ter vigência.
--
-- O PROBLEMA. `financial_settings` tinha `tenant_id UNIQUE`: uma linha por empresa, editada
-- por cima. Mudar a meta de margem em setembro mudava a meta que um projeto de janeiro tinha
-- de bater, e o histórico de análise passava a responder outra coisa sem que nada tivesse
-- acontecido no projeto. Também não sobrava registro de quem mudou nem do que valia antes.
--
-- A FORMA. A mesma tabela vira o histórico: cada linha é uma VERSÃO, com o dia em que passa a
-- valer (`effective_from`), quem gravou (`created_by`) e quando (`created_at`, que já existia).
-- Ler a configuração deixa de ser "a linha do tenant" e passa a ser "a versão vigente na data
-- de referência" — `financial_settings_at()`.
--
-- POR QUE A VIGÊNCIA É DATA E NÃO TIMESTAMP. Percentual de markup não muda de manhã para a
-- tarde, e comparar data cheia tira o fuso da conta. A data/hora da ALTERAÇÃO continua sendo
-- `created_at`, que é outra coisa: uma diz desde quando vale, a outra quando foi decidido.

-- 1. As colunas -------------------------------------------------------------------------
--
-- O default nasce em 1900-01-01 de propósito: assim TODA linha que já existe é retroagida ao
-- início dos tempos na própria criação da coluna, e o número que a empresa vê hoje não muda.
-- Só depois o default vira CURRENT_DATE, que é o certo para versão nova. Fazer nessa ordem
-- também deixa a migration idempotente — sem UPDATE que reescreveria versões novas num
-- segundo `db push`.
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS effective_from date NOT NULL DEFAULT DATE '1900-01-01',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL;

ALTER TABLE public.financial_settings
  ALTER COLUMN effective_from SET DEFAULT CURRENT_DATE;

COMMENT ON COLUMN public.financial_settings.effective_from IS
  'Dia a partir do qual esta versão vale. Ler sempre pela versão vigente na data de referência (public.financial_settings_at).';
COMMENT ON COLUMN public.financial_settings.created_by IS
  'Quem gravou esta versão. NULL quando veio da semente da empresa nova, e a linha continua válida.';

-- 2. Uma linha por tenant vira uma linha por tenant POR DIA de vigência ------------------
ALTER TABLE public.financial_settings
  DROP CONSTRAINT IF EXISTS financial_settings_tenant_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_settings_tenant_vigencia_key'
  ) THEN
    -- Salvar de novo no mesmo dia CORRIGE a versão do dia em vez de criar duas concorrentes.
    -- Também é o índice que `financial_settings_at` percorre para trás.
    ALTER TABLE public.financial_settings
      ADD CONSTRAINT financial_settings_tenant_vigencia_key UNIQUE (tenant_id, effective_from);
  END IF;
END $$;

-- 3. O leitor canônico ------------------------------------------------------------------
--
-- SECURITY INVOKER: a RLS da tabela continua valendo, e quem não pode ler a configuração do
-- tenant não passa a poder por causa de uma função.
-- SETOF, e não o tipo composto direto: função que devolve composto entrega UMA LINHA DE
-- NULLS quando não acha nada, e aí `count(*)` dá 1 e `IF FOUND` mente. Com SETOF, não achar
-- é não devolver linha — que é o que "esta empresa ainda não tinha configuração nessa data"
-- quer dizer.
CREATE OR REPLACE FUNCTION public.financial_settings_at(p_tenant_id uuid, p_on date)
RETURNS SETOF public.financial_settings
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT fs.*
    FROM public.financial_settings fs
   WHERE fs.tenant_id = p_tenant_id
     AND fs.effective_from <= p_on
   ORDER BY fs.effective_from DESC
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.financial_settings_at(uuid, date) IS
  'A versão da configuração financeira que valia na data informada. Sem versão anterior à data, devolve nada — o chamador decide o default.';

REVOKE ALL ON FUNCTION public.financial_settings_at(uuid, date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.financial_settings_at(uuid, date) TO authenticated;

-- 4. O único consumidor SQL da tabela ----------------------------------------------------
--
-- `SELECT INTO` de plpgsql não reclama com várias linhas: pega uma e segue. Sem esta troca a
-- simulação passaria a usar uma versão qualquer, em silêncio — que é o pior desfecho possível.

CREATE OR REPLACE FUNCTION public.simulate_allocation_margin_impact(p_project_id uuid, p_employee_id uuid, p_months jsonb)
 RETURNS TABLE(custo_estimado numeric, horas_total numeric, custo_hora_medio numeric, margem_atual numeric, margem_simulada numeric, margem_baseline numeric, delta_pp numeric, tol_pp numeric, verdict text, has_baseline boolean, is_non_revenue boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
  IF NOT (public.can_manage_project(auth.uid(), p_project_id)) THEN
    RAISE EXCEPTION 'Sem permissão para simular impacto na margem deste projeto';
  END IF;

  -- Simulação é sobre decidir HOJE se cabe alocar, então lê a versão vigente hoje (PUL-260).
  SELECT fs.taxes_percent, fs.commission_percent, fs.margin_tolerance_pp
  INTO v_taxes_pct, v_commission_pct, v_tol
  FROM public.financial_settings_at(v_tenant_id, CURRENT_DATE) fs;

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
$function$;


-- Recriada só para trocar a leitura da configuração; o resto do corpo é o de
-- 20260908150000_functions_off_has_role.sql, byte a byte.
