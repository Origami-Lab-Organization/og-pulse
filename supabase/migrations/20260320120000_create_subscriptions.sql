-- Catálogo central de assinaturas SaaS/software
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  vendor text,
  description text,
  category text,
  monthly_cost numeric(12,2) NOT NULL DEFAULT 0,
  annual_cost numeric(12,2),
  billing_cycle text,
  url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_category_check CHECK (category IN (
    'software', 'infrastructure', 'design', 'marketing', 'analytics',
    'communication', 'project_management', 'finance', 'other'
  )),
  CONSTRAINT subscriptions_billing_cycle_check CHECK (billing_cycle IN (
    'monthly', 'quarterly', 'semiannual', 'annual'
  ))
);

-- Índices
CREATE INDEX idx_subscriptions_tenant_active ON public.subscriptions (tenant_id, is_active);
CREATE INDEX idx_subscriptions_tenant_category ON public.subscriptions (tenant_id, category);

-- Trigger updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscriptions in their tenant"
  ON public.subscriptions FOR SELECT
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can insert subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins and managers can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (is_admin_or_manager(auth.uid(), tenant_id));
