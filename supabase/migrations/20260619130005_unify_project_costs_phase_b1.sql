-- J9-02 (Fase B.1) — Unificação do storage de custos atrás do projectCostsService.
--
-- ADITIVA E REVERSÍVEL: estende project_costs com recorrência + cria a tabela-filha
-- project_cost_months (absorve project_supplier_months [planejado] e
-- project_supplier_actuals [realizado]) e COPIA os dados legados.
--
-- As tabelas legadas (project_suppliers, project_supplier_months,
-- project_supplier_actuals, project_materials) NÃO são alteradas nem removidas.
-- Enquanto o service ainda lê delas (até a Fase B.2), o app segue 100% intacto.
-- Os ids legados são REUSADOS como id em project_costs/cost_id para preservar o
-- vínculo pai→filho sem tabela de mapeamento.

-- ── 1. Colunas de recorrência / vínculos em project_costs ────────────────────
-- cost_date passa a ser opcional: custo recorrente não tem data única.
ALTER TABLE public.project_costs ALTER COLUMN cost_date DROP NOT NULL;

ALTER TABLE public.project_costs
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_month integer,
  ADD COLUMN IF NOT EXISTS end_month integer,
  ADD COLUMN IF NOT EXISTS monthly_amount numeric,
  ADD COLUMN IF NOT EXISTS monthly_amount_brl numeric,
  ADD COLUMN IF NOT EXISTS month_number integer,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_supplier_id uuid REFERENCES public.budget_suppliers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.project_costs.is_recurring IS 'Custo recorrente (fornecedor mensal). Detalhe por mês em project_cost_months.';
COMMENT ON COLUMN public.project_costs.month_number IS 'Mês relativo do projeto para custos avulsos legados (materiais).';

-- ── 2. Tabela-filha: valores por mês (planejado + realizado) ─────────────────
CREATE TABLE IF NOT EXISTS public.project_cost_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_id uuid NOT NULL REFERENCES public.project_costs(id) ON DELETE CASCADE,
  month_number integer NOT NULL,
  planned_value numeric,
  actual_value numeric,
  invoice_number text,
  invoice_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_cost_months_unique UNIQUE (cost_id, month_number)
);

COMMENT ON TABLE public.project_cost_months IS
  'Valores mensais de um custo recorrente: planned_value (ex-project_supplier_months) e actual_value (ex-project_supplier_actuals).';

CREATE INDEX IF NOT EXISTS idx_project_cost_months_cost ON public.project_cost_months (cost_id);

CREATE TRIGGER set_project_cost_months_updated_at
  BEFORE UPDATE ON public.project_cost_months
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS — mesmo padrão: acesso amarrado ao tenant/role do projeto via cost pai.
ALTER TABLE public.project_cost_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View cost months in tenant"
ON public.project_cost_months FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.project_costs pc
  JOIN public.projects p ON p.id = pc.project_id
  WHERE pc.id = project_cost_months.cost_id
  AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

CREATE POLICY "Manage cost months (admin/manager) - insert"
ON public.project_cost_months FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_costs pc
  JOIN public.projects p ON p.id = pc.project_id
  WHERE pc.id = project_cost_months.cost_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Manage cost months (admin/manager) - update"
ON public.project_cost_months FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.project_costs pc
  JOIN public.projects p ON p.id = pc.project_id
  WHERE pc.id = project_cost_months.cost_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Manage cost months (admin/manager) - delete"
ON public.project_cost_months FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.project_costs pc
  JOIN public.projects p ON p.id = pc.project_id
  WHERE pc.id = project_cost_months.cost_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

-- ── 3. Data migration (idempotente via WHERE NOT EXISTS / ON CONFLICT) ────────

-- 3a. Fornecedores (recorrente) → project_costs. Reusa o id legado.
--     planned_amount(_brl) = monthly_value × nº de meses da janela (p/ o card-resumo J9-01).
INSERT INTO public.project_costs (
  id, project_id, category, description, notes, is_recurring,
  start_month, end_month, monthly_amount, monthly_amount_brl,
  original_currency, exchange_rate, planned_amount, planned_amount_brl,
  cost_date, supplier_id, budget_supplier_id, created_at
)
SELECT
  ps.id, ps.project_id, 'supplier', ps.name, ps.description, true,
  ps.start_month, ps.end_month, ps.monthly_value, ps.monthly_value,
  'BRL', 1,
  ps.monthly_value * GREATEST(COALESCE(ps.end_month, ps.start_month) - ps.start_month + 1, 0),
  ps.monthly_value * GREATEST(COALESCE(ps.end_month, ps.start_month) - ps.start_month + 1, 0),
  NULL, ps.supplier_id, ps.budget_supplier_id, ps.created_at
FROM public.project_suppliers ps
WHERE NOT EXISTS (SELECT 1 FROM public.project_costs pc WHERE pc.id = ps.id);

-- 3b. project_supplier_months → project_cost_months.planned_value
INSERT INTO public.project_cost_months (cost_id, month_number, planned_value)
SELECT psm.project_supplier_id, psm.month_number, psm.value
FROM public.project_supplier_months psm
WHERE EXISTS (SELECT 1 FROM public.project_costs pc WHERE pc.id = psm.project_supplier_id)
ON CONFLICT (cost_id, month_number)
DO UPDATE SET planned_value = EXCLUDED.planned_value;

-- 3c. project_supplier_actuals → project_cost_months.actual_value (merge no mês)
INSERT INTO public.project_cost_months (cost_id, month_number, actual_value, invoice_number, invoice_date, notes)
SELECT psa.project_supplier_id, psa.month_number, psa.value, psa.invoice_number, psa.invoice_date, psa.notes
FROM public.project_supplier_actuals psa
WHERE EXISTS (SELECT 1 FROM public.project_costs pc WHERE pc.id = psa.project_supplier_id)
ON CONFLICT (cost_id, month_number)
DO UPDATE SET
  actual_value = EXCLUDED.actual_value,
  invoice_number = EXCLUDED.invoice_number,
  invoice_date = EXCLUDED.invoice_date,
  notes = EXCLUDED.notes;

-- 3d. Consolida o realizado total do fornecedor no pai (p/ card-resumo J9-01)
UPDATE public.project_costs pc
SET actual_amount = s.total, actual_amount_brl = s.total
FROM (
  SELECT cost_id, SUM(actual_value) AS total
  FROM public.project_cost_months
  WHERE actual_value IS NOT NULL
  GROUP BY cost_id
) s
WHERE pc.id = s.cost_id AND pc.is_recurring;

-- 3e. Materiais (avulso) → project_costs. Reusa o id legado.
--     value → planned_amount; se realizado, também actual_amount.
INSERT INTO public.project_costs (
  id, project_id, category, description, is_recurring, month_number,
  original_currency, exchange_rate, planned_amount, planned_amount_brl,
  actual_amount, actual_amount_brl, cost_date, created_at
)
SELECT
  pm.id, pm.project_id, 'material', pm.description, false, pm.month_number,
  'BRL', 1, pm.value, pm.value,
  CASE WHEN pm.is_realized THEN pm.value ELSE NULL END,
  CASE WHEN pm.is_realized THEN pm.value ELSE NULL END,
  pm.purchase_date, pm.created_at
FROM public.project_materials pm
WHERE NOT EXISTS (SELECT 1 FROM public.project_costs pc WHERE pc.id = pm.id);
