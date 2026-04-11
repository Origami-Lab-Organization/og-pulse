
-- ─── Sprints por projeto ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_activity_sprints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  number      int  NOT NULL,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  goal        text,
  status      text NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned', 'active', 'completed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_activity_sprints_project_id ON public.project_activity_sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activity_sprints_tenant_id ON public.project_activity_sprints(tenant_id);

ALTER TABLE public.project_activity_sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolation" ON public.project_activity_sprints
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Configurações do board por projeto ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_activity_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sprint_duration_weeks int  NOT NULL DEFAULT 2,
  sprint_naming_mode    text NOT NULL DEFAULT 'auto'
                          CHECK (sprint_naming_mode IN ('auto', 'manual')),
  wip_in_dev            int,
  wip_in_test           int,
  wip_in_deploy         int,
  CONSTRAINT project_activity_settings_project_id_key UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_activity_settings_tenant_id ON public.project_activity_settings(tenant_id);

ALTER TABLE public.project_activity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolation" ON public.project_activity_settings
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
