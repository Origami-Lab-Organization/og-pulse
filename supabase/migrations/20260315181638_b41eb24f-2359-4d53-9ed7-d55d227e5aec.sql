
-- 1. Extend services table
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS billing_type TEXT
    CHECK (billing_type IN ('fixed_scope', 'recurring', 'success_fee', 'no_revenue'));

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_value NUMERIC(14, 2) DEFAULT NULL;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS billing_unit TEXT DEFAULT NULL;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS has_default_value BOOLEAN NOT NULL DEFAULT false;

-- 2. Migrate existing data
UPDATE public.services SET billing_type = CASE project_type
  WHEN 'fixed_scope'   THEN 'fixed_scope'
  WHEN 'continuous'    THEN 'recurring'
  WHEN 'success_fee'   THEN 'success_fee'
  WHEN 'non_revenue'   THEN 'no_revenue'
  ELSE project_type
END
WHERE billing_type IS NULL;

UPDATE public.services
SET default_value = unit_price, has_default_value = true
WHERE unit_price IS NOT NULL;

-- 3. Create lead_services table
CREATE TABLE IF NOT EXISTS public.lead_services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  service_id          UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  custom_value        NUMERIC(14, 2)  DEFAULT NULL,
  custom_billing_unit TEXT            DEFAULT NULL,
  notes               TEXT            DEFAULT NULL,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE (lead_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_services_lead_id    ON public.lead_services(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_services_service_id ON public.lead_services(service_id);
CREATE INDEX IF NOT EXISTS idx_lead_services_tenant_id  ON public.lead_services(tenant_id);

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
