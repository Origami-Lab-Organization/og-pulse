-- PUL-164 — Financeiro de projeto deixa de ser legível por qualquer membro do tenant.
--
-- Problema:
--   As tabelas financeiras de projeto tinham SELECT liberado a qualquer membro do
--   tenant (`user_belongs_to_tenant` via `projects`), enquanto a escrita já exigia
--   `is_admin_or_manager`. A proteção de leitura vivia só na tela: o detalhe de
--   projeto (`/projects/:id`) nem tem guard de perfil na rota, e as abas de custo
--   são escondidas por condicional de componente. Um funcionário comum com o id do
--   projeto lia custo, comissão e parcelas direto pela API.
--
-- Decisão:
--   SELECT passa a exigir `is_admin_or_manager(auth.uid(), tenant)` — o mesmo
--   predicado que a escrita já usava. Leitura e escrita ficam alinhadas.
--
-- Por que `is_admin_or_manager` e NÃO `can_manage_project`:
--   ADR-0002 estabelece que gerente VISUALIZA todo o portfólio e EDITA apenas os
--   projetos onde é o responsável. Restringir a leitura a `can_manage_project`
--   faria os analytics financeiros (/analises/financeiro, /admin-dashboard, que
--   somam custo e receita de TODOS os projetos do tenant) sub-reportarem
--   silenciosamente para gerentes que não são PM de tudo — um erro de número
--   financeiro, pior que o problema original.
--
-- Consumidores verificados (todos em rota admin/gerente):
--   useProjectCostItems, projectCostsService, useCloseBusinessDeal (/pipeline),
--   useProjectCommissions, useProjectFinancials, useAnalyticsData,
--   useFinancialEvolution, useProjectHealthData, useYearlyEvolution,
--   useRevenueAnalytics, useProjectCosts, useProjectSupplierActuals,
--   useProjectSupplierMonths.
--   projectService.getById busca parcelas e é alcançável por funcionário comum em
--   /my-projects/:id, mas nenhuma tela de funcionário renderiza campo financeiro —
--   o array passa a vir vazio, sem erro.
--
-- Ver ADR-0022.

-- 1. Custos ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view project costs in their tenant" ON public.project_costs;

CREATE POLICY "Admins and managers can view project costs"
ON public.project_costs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_costs.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

DROP POLICY IF EXISTS "View cost months in tenant" ON public.project_cost_months;

CREATE POLICY "Admins and managers can view cost months"
ON public.project_cost_months
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_costs pc
    JOIN public.projects p ON p.id = pc.project_id
    WHERE pc.id = project_cost_months.cost_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- 2. Comissões ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view project commissions in their tenant" ON public.project_commissions;

CREATE POLICY "Admins and managers can view project commissions"
ON public.project_commissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_commissions.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- 3. Parcelas (receita) ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view project installments in their tenant" ON public.project_installments;

CREATE POLICY "Admins and managers can view project installments"
ON public.project_installments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_installments.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- 4. Fornecedores e materiais ---------------------------------------------------
DROP POLICY IF EXISTS "Users can view project suppliers in their tenant" ON public.project_suppliers;

CREATE POLICY "Admins and managers can view project suppliers"
ON public.project_suppliers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_suppliers.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

DROP POLICY IF EXISTS "Users can view project supplier actuals in their tenant" ON public.project_supplier_actuals;

CREATE POLICY "Admins and managers can view supplier actuals"
ON public.project_supplier_actuals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_suppliers ps
    JOIN public.projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_actuals.project_supplier_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

DROP POLICY IF EXISTS "Users can view project supplier months in their tenant" ON public.project_supplier_months;

CREATE POLICY "Admins and managers can view supplier months"
ON public.project_supplier_months
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_suppliers ps
    JOIN public.projects p ON p.id = ps.project_id
    WHERE ps.id = project_supplier_months.project_supplier_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

DROP POLICY IF EXISTS "Users can view project materials in their tenant" ON public.project_materials;

CREATE POLICY "Admins and managers can view project materials"
ON public.project_materials
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_materials.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

-- 5. Custo/hora por RPC: guarda tolerante a cron/trigger ------------------------
--
-- Resíduo herdado da PUL-163. `calculate_employee_hourly_cost_for_month` é
-- SECURITY DEFINER, recebe tenant e devolve custo/hora de um colaborador — logo era
-- chamável por qualquer autenticado com qualquer tenant.
--
-- Não pode ser revogada de PUBLIC: `simulate_allocation_margin_impact` é SECURITY
-- INVOKER e a chama a partir do frontend (painel de impacto na margem).
--
-- Não pode usar `assert_tenant_access` estrito: a função roda em trigger durante
-- escrita do usuário (auth.uid() presente) E em cron/Edge Function com service role
-- (auth.uid() nulo). Uma guarda estrita negaria o caminho de service role e quebraria
-- os recálculos de snapshot de custo.
--
-- Guarda condicional: valida só quando há sessão de usuário. Sem sessão o chamador é
-- service role, que já tem privilégio total por definição.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'calculate_employee_hourly_cost_for_month_unguarded'
  ) THEN
    ALTER FUNCTION public.calculate_employee_hourly_cost_for_month(uuid, uuid, date)
      RENAME TO calculate_employee_hourly_cost_for_month_unguarded;
  END IF;
END
$do$;

REVOKE ALL ON FUNCTION
  public.calculate_employee_hourly_cost_for_month_unguarded(uuid, uuid, date)
  FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.calculate_employee_hourly_cost_for_month(
  p_tenant_id   uuid,
  p_employee_id uuid,
  p_month_start date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() nulo = service role (cron, Edge Function): já é privilegiado.
  IF auth.uid() IS NOT NULL
     AND NOT public.user_belongs_to_tenant(auth.uid(), p_tenant_id) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não pertence ao tenant informado'
      USING ERRCODE = '42501';
  END IF;

  RETURN public.calculate_employee_hourly_cost_for_month_unguarded(
    p_tenant_id, p_employee_id, p_month_start
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.calculate_employee_hourly_cost_for_month(uuid, uuid, date)
  TO authenticated;
