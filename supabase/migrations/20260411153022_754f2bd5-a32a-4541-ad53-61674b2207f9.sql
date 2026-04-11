
-- ─── Templates de checklist por projeto ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_activity_checklist_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('dor', 'dod')),
  items      jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, type)
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_project ON public.project_activity_checklist_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_tenant ON public.project_activity_checklist_templates(tenant_id);

ALTER TABLE public.project_activity_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolation" ON public.project_activity_checklist_templates
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Itens de checklist por card ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_activity_card_checklist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES public.project_activity_cards(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('dor', 'dod')),
  item_text  text NOT NULL,
  is_checked boolean NOT NULL DEFAULT false,
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_checklist_card ON public.project_activity_card_checklist(card_id);

ALTER TABLE public.project_activity_card_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant isolation" ON public.project_activity_card_checklist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_activity_cards c
      WHERE c.id = project_activity_card_checklist.card_id
        AND c.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );
