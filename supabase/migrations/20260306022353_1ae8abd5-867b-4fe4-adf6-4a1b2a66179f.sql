INSERT INTO project_commissions (project_id, installment_id, planned_value)
SELECT 
  pi.project_id,
  pi.id AS installment_id,
  ROUND((b.commission_percent / 100.0 * b.final_total) / inst_count.cnt, 2) AS planned_value
FROM project_installments pi
JOIN projects p ON p.id = pi.project_id
JOIN budgets b ON b.id = p.budget_id
JOIN (
  SELECT project_id, COUNT(*) AS cnt 
  FROM project_installments 
  GROUP BY project_id
) inst_count ON inst_count.project_id = p.id
WHERE b.commission_percent > 0
  AND NOT EXISTS (
    SELECT 1 FROM project_commissions pc WHERE pc.project_id = p.id
  );