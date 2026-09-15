-- Reversão de 20260915120000_prospects.sql.
--
-- Só é segura depois de revertida 20260915130000, que cria prospect_activities e as
-- colunas de `leads` que referenciam esta tabela.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP TABLE IF EXISTS public.prospects;

DROP FUNCTION IF EXISTS public.prospects_protect_first_touch();
