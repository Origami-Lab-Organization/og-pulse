
-- ─── Project Activity Tags ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_activity_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS project_activity_tags_project_id_idx ON public.project_activity_tags(project_id);
CREATE INDEX IF NOT EXISTS project_activity_tags_tenant_id_idx  ON public.project_activity_tags(tenant_id);

ALTER TABLE public.project_activity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_tags" ON public.project_activity_tags
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ─── Project Activity Card Tags (junction) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_activity_card_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES public.project_activity_cards(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES public.project_activity_tags(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, tag_id)
);

CREATE INDEX IF NOT EXISTS project_activity_card_tags_card_id_idx ON public.project_activity_card_tags(card_id);
CREATE INDEX IF NOT EXISTS project_activity_card_tags_tag_id_idx  ON public.project_activity_card_tags(tag_id);

ALTER TABLE public.project_activity_card_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_card_tags" ON public.project_activity_card_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_activity_cards c
      WHERE c.id = project_activity_card_tags.card_id
        AND c.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_activity_cards c
      WHERE c.id = project_activity_card_tags.card_id
        AND c.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );
