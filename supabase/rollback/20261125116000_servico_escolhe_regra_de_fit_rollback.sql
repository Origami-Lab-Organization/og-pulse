-- Rollback de 20261125116000_servico_escolhe_regra_de_fit.sql
--
-- O fit volta a mostrar as quatro regras com os nomes fixos do código.

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_regra_de_fit_check;
ALTER TABLE public.services DROP COLUMN IF EXISTS regra_de_fit;
