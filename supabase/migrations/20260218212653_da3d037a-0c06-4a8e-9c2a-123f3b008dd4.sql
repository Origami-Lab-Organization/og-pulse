UPDATE project_timesheets SET hours = ROUND(hours::numeric, 1) WHERE hours != ROUND(hours::numeric, 1);
UPDATE project_member_months SET hours = ROUND(hours::numeric, 1) WHERE hours != ROUND(hours::numeric, 1);
UPDATE budget_role_months SET hours = ROUND(hours::numeric, 1) WHERE hours != ROUND(hours::numeric, 1);