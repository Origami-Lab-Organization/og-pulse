-- Reverte 20261001150000_conta_azul_leituras_financeiro.sql (só funções de leitura).
-- Sem BEGIN/COMMIT próprio: envolver por fora com `psql --single-transaction`.

DROP FUNCTION IF EXISTS public.conta_azul_payables_by_category(uuid, date, date);
DROP FUNCTION IF EXISTS public.conta_azul_payables_by_cost_center(uuid, date, date);
DROP FUNCTION IF EXISTS public.conta_azul_revenue_outside_projects(uuid, date, date);
