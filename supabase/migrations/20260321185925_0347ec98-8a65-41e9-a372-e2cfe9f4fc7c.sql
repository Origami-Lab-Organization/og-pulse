-- Subscriptions catalog
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  vendor text,
  description text,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('software','infrastructure','design','marketing','analytics','communication','project_management','finance','other')),
  monthly_cost numeric(12,2) NOT NULL DEFAULT 0,
  annual_cost numeric(12,2) NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','quarterly','semiannual','annual')),
  url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(tenant_id, is_active);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_subscriptions_updated_at') THEN
    CREATE TRIGGER set_subscriptions_updated_at
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view subscriptions in their tenant" ON public.subscriptions;
CREATE POLICY "Users can view subscriptions in their tenant"
  ON public.subscriptions FOR SELECT
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can insert subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (is_admin_or_manager(auth.uid(), tenant_id));

-- Budget subscriptions
CREATE TABLE IF NOT EXISTS public.budget_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  monthly_value numeric(12,2) NOT NULL DEFAULT 0,
  is_recurring boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_subscriptions_budget ON public.budget_subscriptions(budget_id);

ALTER TABLE public.budget_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view budget subscriptions in their tenant" ON public.budget_subscriptions;
CREATE POLICY "Users can view budget subscriptions in their tenant"
  ON public.budget_subscriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_subscriptions.budget_id AND user_belongs_to_tenant(auth.uid(), b.tenant_id)));

DROP POLICY IF EXISTS "Admins and managers can insert budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can insert budget subscriptions"
  ON public.budget_subscriptions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_subscriptions.budget_id AND is_admin_or_manager(auth.uid(), b.tenant_id)));

DROP POLICY IF EXISTS "Admins and managers can update budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can update budget subscriptions"
  ON public.budget_subscriptions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_subscriptions.budget_id AND is_admin_or_manager(auth.uid(), b.tenant_id)));

DROP POLICY IF EXISTS "Admins and managers can delete budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can delete budget subscriptions"
  ON public.budget_subscriptions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_subscriptions.budget_id AND is_admin_or_manager(auth.uid(), b.tenant_id)));

-- Project subscriptions
CREATE TABLE IF NOT EXISTS public.project_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  budget_subscription_id uuid REFERENCES public.budget_subscriptions(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  monthly_value numeric(12,2) NOT NULL DEFAULT 0,
  is_recurring boolean NOT NULL DEFAULT true,
  start_month integer NOT NULL DEFAULT 1,
  end_month integer,
  is_realized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_subscriptions_project ON public.project_subscriptions(project_id);

ALTER TABLE public.project_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project subscriptions in their tenant" ON public.project_subscriptions;
CREATE POLICY "Users can view project subscriptions in their tenant"
  ON public.project_subscriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_subscriptions.project_id AND user_belongs_to_tenant(auth.uid(), p.tenant_id)));

DROP POLICY IF EXISTS "Admins and managers can insert project subscriptions" ON public.project_subscriptions;
CREATE POLICY "Admins and managers can insert project subscriptions"
  ON public.project_subscriptions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_subscriptions.project_id AND is_admin_or_manager(auth.uid(), p.tenant_id)));

DROP POLICY IF EXISTS "Admins and managers can update project subscriptions" ON public.project_subscriptions;
CREATE POLICY "Admins and managers can update project subscriptions"
  ON public.project_subscriptions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_subscriptions.project_id AND is_admin_or_manager(auth.uid(), p.tenant_id)));

DROP POLICY IF EXISTS "Admins and managers can delete project subscriptions" ON public.project_subscriptions;
CREATE POLICY "Admins and managers can delete project subscriptions"
  ON public.project_subscriptions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_subscriptions.project_id AND is_admin_or_manager(auth.uid(), p.tenant_id)));