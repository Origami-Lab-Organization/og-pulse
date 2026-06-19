-- HU-001 — Redesign do catálogo de serviços
-- Hierarquia: service_lines (Linha) → services (Serviço) → service_revenue_models (Modelo de Receita)
--
-- Estratégia: ADITIVA. Mantém a tabela `services` (referenciada por lead_services com
-- ON DELETE RESTRICT e por templates de orçamento) e adiciona os níveis pai/filho,
-- preservando todos os dados e referências ativas. Ver ADR-0003.

-- ─────────────────────────────────────────────
-- 1. Linhas de serviço (nível pai)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_lines_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_service_lines_tenant ON public.service_lines(tenant_id);

ALTER TABLE public.service_lines ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer membro do tenant (GP precisa enxergar no orçamento).
CREATE POLICY "service_lines_select" ON public.service_lines
  FOR SELECT TO authenticated
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Escrita: apenas admin (HU-001 — "apenas admin gerencia"). Reforça no banco, não só na UI.
CREATE POLICY "service_lines_insert" ON public.service_lines
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "service_lines_update" ON public.service_lines
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "service_lines_delete" ON public.service_lines
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'));

-- ─────────────────────────────────────────────
-- 2. Vincular services à linha de serviço
-- ─────────────────────────────────────────────

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_line_id UUID REFERENCES public.service_lines(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_services_service_line ON public.services(service_line_id);

-- Backfill: cria a linha "Serviços Gerais" para cada tenant que já tem serviços
INSERT INTO public.service_lines (tenant_id, name, description)
SELECT DISTINCT s.tenant_id, 'Serviços Gerais', 'Linha padrão criada na migração do catálogo (HU-001).'
FROM public.services s
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Vincula todos os serviços existentes à linha "Serviços Gerais" do seu tenant
UPDATE public.services s
SET service_line_id = sl.id
FROM public.service_lines sl
WHERE sl.tenant_id = s.tenant_id
  AND sl.name = 'Serviços Gerais'
  AND s.service_line_id IS NULL;

-- ─────────────────────────────────────────────
-- 3. Modelos de receita (nível filho)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_revenue_models (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  model_type   TEXT NOT NULL CHECK (model_type IN ('fixed', 'recurring', 'success_fee', 'indication', 'equity')),
  base_value   NUMERIC(14, 2) DEFAULT NULL,
  billing_unit TEXT DEFAULT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_revenue_models_tenant  ON public.service_revenue_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_revenue_models_service ON public.service_revenue_models(service_id);

ALTER TABLE public.service_revenue_models ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer membro do tenant (GP precisa enxergar no orçamento).
CREATE POLICY "service_revenue_models_select" ON public.service_revenue_models
  FOR SELECT TO authenticated
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Escrita: apenas admin (HU-001 — "apenas admin gerencia").
CREATE POLICY "service_revenue_models_insert" ON public.service_revenue_models
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "service_revenue_models_update" ON public.service_revenue_models
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "service_revenue_models_delete" ON public.service_revenue_models
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'));

-- Backfill: gera um modelo de receita por serviço existente a partir do billing_type
-- atual, preservando valor/unidade. Serviços 'no_revenue' não geram modelo (Cenário 4).
INSERT INTO public.service_revenue_models (tenant_id, service_id, name, model_type, base_value, billing_unit, is_active)
SELECT
  s.tenant_id,
  s.id,
  CASE s.billing_type
    WHEN 'fixed_scope'  THEN 'Escopo Fixo'
    WHEN 'recurring'    THEN 'Recorrente'
    WHEN 'success_fee'  THEN 'Taxa de Sucesso'
    ELSE 'Modelo Padrão'
  END,
  CASE s.billing_type
    WHEN 'fixed_scope'  THEN 'fixed'
    WHEN 'recurring'    THEN 'recurring'
    WHEN 'success_fee'  THEN 'success_fee'
    ELSE 'fixed'
  END,
  s.default_value,
  s.billing_unit,
  s.is_active
FROM public.services s
WHERE s.billing_type IS NOT NULL
  AND s.billing_type <> 'no_revenue';

-- ─────────────────────────────────────────────
-- 4. Comentários
-- ─────────────────────────────────────────────

COMMENT ON TABLE  public.service_lines IS 'Linhas de serviço (nível 1 da hierarquia do catálogo). Ex.: Ventures, Product Studio.';
COMMENT ON TABLE  public.service_revenue_models IS 'Modelos de receita por serviço (nível 3 da hierarquia). Ex.: Escopo Fixo, Taxa de Sucesso.';
COMMENT ON COLUMN public.services.service_line_id IS 'Linha de serviço à qual o serviço pertence (nível 2 da hierarquia).';
COMMENT ON COLUMN public.service_revenue_models.model_type IS 'Tipo do modelo: fixed, recurring, success_fee, indication, equity.';
COMMENT ON COLUMN public.service_revenue_models.base_value IS 'Valor base do modelo. Pré-preenche orçamento (modelo fixed). Pode ser % conforme billing_unit.';
COMMENT ON COLUMN public.services.billing_type IS 'LEGADO (HU-001): valor de cobrança migrou para service_revenue_models. Mantido por back-compat do wizard de orçamento.';
