-- Extended services schema
-- Adds billing metadata fields and creates lead_services relationship table

-- ─────────────────────────────────────────────
-- 1. Extend services table
-- ─────────────────────────────────────────────

-- billing_type: mirrors project_type but uses business-facing naming
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS billing_type TEXT
    CHECK (billing_type IN ('fixed_scope', 'recurring', 'success_fee', 'no_revenue'));

-- default_value: pre-defined contract value for this service (replaces unit_price semantically)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_value NUMERIC(14, 2) DEFAULT NULL;

-- billing_unit: human-readable unit label, e.g. "por mês", "% sobre captação"
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS billing_unit TEXT DEFAULT NULL;

-- has_default_value: quick flag to know if a default price is configured
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS has_default_value BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────
-- 2. Migrate existing data
-- ─────────────────────────────────────────────

-- Populate billing_type from project_type, remapping renamed values
UPDATE public.services SET billing_type = CASE project_type
  WHEN 'fixed_scope'   THEN 'fixed_scope'
  WHEN 'continuous'    THEN 'recurring'
  WHEN 'success_fee'   THEN 'success_fee'
  WHEN 'non_revenue'   THEN 'no_revenue'
  ELSE project_type
END
WHERE billing_type IS NULL;

-- Carry over existing unit_price into default_value and set the flag
UPDATE public.services
SET
  default_value    = unit_price,
  has_default_value = true
WHERE unit_price IS NOT NULL;

-- ─────────────────────────────────────────────
-- 3. Create lead_services table
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  service_id          UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  custom_value        NUMERIC(14, 2)  DEFAULT NULL,  -- sobrescreve default_value do serviço
  custom_billing_unit TEXT            DEFAULT NULL,  -- sobrescreve billing_unit do serviço
  notes               TEXT            DEFAULT NULL,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE (lead_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_services_lead_id    ON public.lead_services(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_services_service_id ON public.lead_services(service_id);
CREATE INDEX IF NOT EXISTS idx_lead_services_tenant_id  ON public.lead_services(tenant_id);

-- RLS
ALTER TABLE public.lead_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_services_select" ON public.lead_services
  FOR SELECT TO authenticated
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "lead_services_insert" ON public.lead_services
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "lead_services_update" ON public.lead_services
  FOR UPDATE TO authenticated
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "lead_services_delete" ON public.lead_services
  FOR DELETE TO authenticated
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- ─────────────────────────────────────────────
-- 4. Comments
-- ─────────────────────────────────────────────

COMMENT ON COLUMN public.services.billing_type      IS 'Tipo de cobrança: fixed_scope, recurring, success_fee, no_revenue';
COMMENT ON COLUMN public.services.default_value     IS 'Valor padrão pré-definido para o serviço (pode ser sobrescrito por lead)';
COMMENT ON COLUMN public.services.billing_unit      IS 'Unidade de cobrança legível, ex: "por mês", "% sobre captação"';
COMMENT ON COLUMN public.services.has_default_value IS 'Indica se o serviço possui valor padrão configurado';

COMMENT ON TABLE  public.lead_services               IS 'Relacionamento entre leads e serviços, com valores e unidades personalizáveis por lead';
COMMENT ON COLUMN public.lead_services.custom_value        IS 'Valor negociado para este lead, sobrescreve services.default_value';
COMMENT ON COLUMN public.lead_services.custom_billing_unit IS 'Unidade negociada para este lead, sobrescreve services.billing_unit';
COMMENT ON COLUMN public.lead_services.notes               IS 'Observações sobre este serviço no contexto do lead';
