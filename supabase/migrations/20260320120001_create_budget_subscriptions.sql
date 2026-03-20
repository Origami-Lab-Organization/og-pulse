-- Assinaturas vinculadas a orçamentos
CREATE TABLE public.budget_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  monthly_value numeric(12,2) NOT NULL DEFAULT 0,
  is_recurring boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_budget_subscriptions_budget ON public.budget_subscriptions (budget_id);
CREATE INDEX idx_budget_subscriptions_subscription ON public.budget_subscriptions (subscription_id);

-- RLS
ALTER TABLE public.budget_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget subscriptions in their tenant"
  ON public.budget_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_subscriptions.budget_id
    AND user_belongs_to_tenant(auth.uid(), b.tenant_id)
  ));

CREATE POLICY "Admins and managers can insert budget subscriptions"
  ON public.budget_subscriptions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_subscriptions.budget_id
    AND is_admin_or_manager(auth.uid(), b.tenant_id)
  ));

CREATE POLICY "Admins and managers can update budget subscriptions"
  ON public.budget_subscriptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_subscriptions.budget_id
    AND is_admin_or_manager(auth.uid(), b.tenant_id)
  ));

CREATE POLICY "Admins and managers can delete budget subscriptions"
  ON public.budget_subscriptions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_subscriptions.budget_id
    AND is_admin_or_manager(auth.uid(), b.tenant_id)
  ));
