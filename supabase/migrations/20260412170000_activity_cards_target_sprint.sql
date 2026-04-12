-- Add target_sprint_id to project_activity_cards for advance backlog planning
ALTER TABLE project_activity_cards
  ADD COLUMN IF NOT EXISTS target_sprint_id uuid
    REFERENCES project_activity_sprints(id) ON DELETE SET NULL;

-- Index to support efficient lookups when loading SprintPlanningDrawer
CREATE INDEX IF NOT EXISTS idx_activity_cards_target_sprint
  ON project_activity_cards (target_sprint_id)
  WHERE target_sprint_id IS NOT NULL;
