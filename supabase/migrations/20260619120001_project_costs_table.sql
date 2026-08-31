-- J9-01: Reestruturação da aba Custos com categorias expandidas.
-- Nova tabela unificada de custos extra-labor do projeto, com 6 categorias,
-- valores planejado/realizado, moeda estrangeira com conversão e soft delete.
--
-- Decisão (ADR-0003): tabela própria em vez de estender project_suppliers
-- (recorrente) / project_materials. Mantém o modelo recorrente atual intacto
-- (planejamento/budget/analytics) e evita misturar semânticas distintas.

CREATE TABLE public.project_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'supplier',
  description text NOT NULL,
  cost_date date NOT NULL,
  -- Valores na moeda original informada
  planned_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric,
  -- Moeda e conversão
  original_currency text NOT NULL DEFAULT 'BRL',
  exchange_rate numeric NOT NULL DEFAULT 1,
  -- Valores canônicos em BRL — usados por TODOS os totais e gráficos
  planned_amount_brl numeric NOT NULL DEFAULT 0,
  actual_amount_brl numeric,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT project_costs_category_check
    CHECK (category IN ('supplier', 'subscription', 'equipment_rental', 'material', 'travel', 'other')),
  CONSTRAINT project_costs_currency_check
    CHECK (original_currency IN ('BRL', 'USD', 'EUR', 'GBP')),
  CONSTRAINT project_costs_exchange_rate_positive
    CHECK (exchange_rate > 0)
);

COMMENT ON TABLE public.project_costs IS
  'Custos extra-labor do projeto em 6 categorias (J9-01). Valores em BRL nas colunas *_brl.';

-- Índice para a listagem padrão da aba: por projeto, só ativos, ordenado por data.
CREATE INDEX idx_project_costs_project_active
  ON public.project_costs (project_id, cost_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_project_costs_category
  ON public.project_costs (project_id, category)
  WHERE deleted_at IS NULL;

-- updated_at automático (mesma função usada nas demais tabelas)
CREATE TRIGGER set_project_costs_updated_at
  BEFORE UPDATE ON public.project_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS — mesmo padrão de project_suppliers/project_materials:
-- leitura pelo tenant do projeto; escrita só admin/gerente do tenant.
-- Consultor não é admin/gerente → não lê nem escreve (boundary multi-tenant).
ALTER TABLE public.project_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project costs in their tenant"
ON public.project_costs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_costs.project_id
  AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can insert project costs"
ON public.project_costs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_costs.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can update project costs"
ON public.project_costs FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_costs.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can delete project costs"
ON public.project_costs FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_costs.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));
