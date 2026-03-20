-- Assinaturas vinculadas a projetos
CREATE TABLE public.project_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  budget_subscription_id uuid REFERENCES public.budget_subscriptions(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  monthly_value numeric(12,2) NOT NULL DEFAULT 0,
  is_recurring boolean NOT NULL DEFAULT true,
  start_month integer,
  end_month integer,
  is_realized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_project_subscriptions_project ON public.project_subscriptions (project_id);
CREATE INDEX idx_project_subscriptions_subscription ON public.project_subscriptions (subscription_id);

-- RLS
ALTER TABLE public.project_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project subscriptions in their tenant"
  ON public.project_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_subscriptions.project_id
    AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  ));

CREATE POLICY "Admins and managers can insert project subscriptions"
  ON public.project_subscriptions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_subscriptions.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  ));

CREATE POLICY "Admins and managers can update project subscriptions"
  ON public.project_subscriptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_subscriptions.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  ));

CREATE POLICY "Admins and managers can delete project subscriptions"
  ON public.project_subscriptions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_subscriptions.project_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  ));
