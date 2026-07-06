-- J9-02 Fase B.1 — Verificação da cópia legado → project_costs / project_cost_months.
-- NÃO é migration (pasta fora de supabase/migrations). Rode manualmente no Supabase
-- DEPOIS de aplicar 20260619130000_unify_project_costs_phase_b1.sql.
-- Cada query deve retornar ZERO linhas (ou linhas com diff = 0). Qualquer divergência
-- significa que a cópia não bateu — NÃO prosseguir para a Fase B.2.

-- 1. Contagem: todo fornecedor legado virou um custo 'supplier'?
SELECT
  (SELECT count(*) FROM project_suppliers) AS legacy_suppliers,
  (SELECT count(*) FROM project_costs WHERE category = 'supplier' AND is_recurring) AS new_supplier_costs;

-- 2. Contagem: todo material legado virou um custo 'material'?
SELECT
  (SELECT count(*) FROM project_materials) AS legacy_materials,
  (SELECT count(*) FROM project_costs WHERE category = 'material') AS new_material_costs;

-- 3. Planejado mensal de fornecedor: soma legada vs nova, por fornecedor (deve ser vazio)
SELECT psm.project_supplier_id, SUM(psm.value) AS legacy_planned,
       (SELECT SUM(planned_value) FROM project_cost_months m WHERE m.cost_id = psm.project_supplier_id) AS new_planned
FROM project_supplier_months psm
GROUP BY psm.project_supplier_id
HAVING SUM(psm.value) IS DISTINCT FROM
       (SELECT SUM(planned_value) FROM project_cost_months m WHERE m.cost_id = psm.project_supplier_id);

-- 4. Realizado de fornecedor: soma legada vs nova, por fornecedor (deve ser vazio)
SELECT psa.project_supplier_id, SUM(psa.value) AS legacy_actual,
       (SELECT SUM(actual_value) FROM project_cost_months m WHERE m.cost_id = psa.project_supplier_id) AS new_actual
FROM project_supplier_actuals psa
GROUP BY psa.project_supplier_id
HAVING SUM(psa.value) IS DISTINCT FROM
       (SELECT SUM(actual_value) FROM project_cost_months m WHERE m.cost_id = psa.project_supplier_id);

-- 5. Materiais: valor e flag realizado preservados por linha (deve ser vazio)
SELECT pm.id, pm.value AS legacy_value, pm.is_realized AS legacy_realized,
       pc.planned_amount AS new_value, (pc.actual_amount IS NOT NULL) AS new_realized
FROM project_materials pm
JOIN project_costs pc ON pc.id = pm.id
WHERE pm.value IS DISTINCT FROM pc.planned_amount
   OR pm.is_realized IS DISTINCT FROM (pc.actual_amount IS NOT NULL)
   OR pm.month_number IS DISTINCT FROM pc.month_number;

-- 6. Realizado total consolidado no pai = soma dos meses (deve ser vazio)
SELECT pc.id, pc.actual_amount,
       (SELECT SUM(actual_value) FROM project_cost_months m WHERE m.cost_id = pc.id) AS months_sum
FROM project_costs pc
WHERE pc.is_recurring
  AND COALESCE(pc.actual_amount, 0) IS DISTINCT FROM
      COALESCE((SELECT SUM(actual_value) FROM project_cost_months m WHERE m.cost_id = pc.id), 0);
