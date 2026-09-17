-- Rollback de 20260917130000_employee_cost_center.sql (PUL-218).
--
-- Remove a regra e a coluna. Nenhum dado de pessoa é apagado além do vínculo com o centro,
-- que é o que esta migration criou. Depois disto, o custo de quem não lança hora volta a ficar
-- fora da leitura por centro.

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_no_timesheet_needs_cost_center;

DROP INDEX IF EXISTS public.employees_cost_center_idx;

ALTER TABLE public.employees
  DROP COLUMN IF EXISTS cost_center_id;
