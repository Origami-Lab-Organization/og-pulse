
ALTER TABLE public.project_activity_cards
  ADD COLUMN IF NOT EXISTS is_archived   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at   timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by   uuid        REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_cards_project_not_archived
  ON public.project_activity_cards (project_id, is_archived)
  WHERE is_archived = false;
