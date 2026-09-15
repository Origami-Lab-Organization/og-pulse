-- Reversão de 20260915110000_prospect_companies.sql.
--
-- Só é segura depois de revertida 20260915120000 (prospects tem FK para cá).
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP TABLE IF EXISTS public.prospect_companies;
