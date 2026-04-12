-- ── Releases ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_activity_releases (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL,
  name        text        NOT NULL,
  version     text,
  description text,
  target_date date        NOT NULL,
  released_at date,
  status      text        NOT NULL DEFAULT 'planned'
                          CHECK (status IN ('planned', 'in_progress', 'released')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_releases_project
  ON project_activity_releases (project_id, target_date);

-- ── Release ↔ Sprint association ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_activity_release_sprints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id  uuid NOT NULL REFERENCES project_activity_releases(id) ON DELETE CASCADE,
  sprint_id   uuid NOT NULL REFERENCES project_activity_sprints(id)  ON DELETE CASCADE,
  UNIQUE (release_id, sprint_id)
);

CREATE INDEX IF NOT EXISTS idx_release_sprints_release
  ON project_activity_release_sprints (release_id);

-- ── release_id on cards ───────────────────────────────────────────────────────

ALTER TABLE project_activity_cards
  ADD COLUMN IF NOT EXISTS release_id uuid
    REFERENCES project_activity_releases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_cards_release
  ON project_activity_cards (release_id)
  WHERE release_id IS NOT NULL;
