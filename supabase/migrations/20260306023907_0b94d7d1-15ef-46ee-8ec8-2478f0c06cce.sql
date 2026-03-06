ALTER TABLE project_commissions ADD COLUMN commission_percent numeric NOT NULL DEFAULT 0;

UPDATE project_commissions pc
SET commission_percent = b.commission_percent
FROM projects p JOIN budgets b ON b.id = p.budget_id
WHERE p.id = pc.project_id;