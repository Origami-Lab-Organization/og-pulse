
CREATE TABLE IF NOT EXISTS project_activity_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  version text,
  description text,
  target_date date NOT NULL,
  released_at date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_activity_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view releases"
  ON project_activity_releases FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can insert releases"
  ON project_activity_releases FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can update releases"
  ON project_activity_releases FOR UPDATE TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can delete releases"
  ON project_activity_releases FOR DELETE TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE TABLE IF NOT EXISTS project_activity_release_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES project_activity_releases(id) ON DELETE CASCADE,
  sprint_id uuid NOT NULL REFERENCES project_activity_sprints(id) ON DELETE CASCADE,
  UNIQUE (release_id, sprint_id)
);

ALTER TABLE project_activity_release_sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage release_sprints via release"
  ON project_activity_release_sprints FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM project_activity_releases r
    WHERE r.id = release_id
    AND public.user_belongs_to_tenant(auth.uid(), r.tenant_id)
  ));

ALTER TABLE project_activity_cards
  ADD COLUMN IF NOT EXISTS release_id uuid
    REFERENCES project_activity_releases(id) ON DELETE SET NULL;
