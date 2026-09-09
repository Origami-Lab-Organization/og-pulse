-- Reversão de 20260910100000_cost_centers.sql (PUL-217).
-- Só é segura enquanto nenhuma outra tabela referencia cost_centers (PUL-218/219/221 criam FKs).
DROP TABLE IF EXISTS public.cost_centers;
