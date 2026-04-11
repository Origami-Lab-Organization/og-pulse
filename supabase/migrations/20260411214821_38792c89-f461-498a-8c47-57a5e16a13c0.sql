
-- Add card_type column to checklist templates
ALTER TABLE public.project_activity_checklist_templates
  ADD COLUMN IF NOT EXISTS card_type text
  CHECK (card_type IN ('story', 'bug', 'tech_debt', 'task'));

-- Drop old unique constraint
ALTER TABLE public.project_activity_checklist_templates
  DROP CONSTRAINT IF EXISTS project_activity_checklist_templates_project_id_type_key;

-- Add new unique constraint supporting null card_type
ALTER TABLE public.project_activity_checklist_templates
  ADD CONSTRAINT uq_checklist_templates_project_type_cardtype
  UNIQUE NULLS NOT DISTINCT (project_id, type, card_type);
