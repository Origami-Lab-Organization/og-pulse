-- Add card_type to checklist templates so DoR/DoD can be configured per card type.
-- card_type = NULL means "common to all types".

alter table project_activity_checklist_templates
  add column if not exists card_type text
  check (card_type in ('story', 'bug', 'tech_debt', 'task'));

-- Drop the old unique constraint (project_id, type) and replace with a
-- per-card-type constraint that treats NULLs as equal.
alter table project_activity_checklist_templates
  drop constraint if exists project_activity_checklist_templates_project_id_type_key;

alter table project_activity_checklist_templates
  add constraint uq_checklist_templates_project_type_cardtype
  unique nulls not distinct (project_id, type, card_type);
