-- Reversão de 20260923120000_prospect_instagram.sql.
--
-- Destrutiva: os perfis de Instagram cadastrados se perdem. Exporte antes se precisar.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

ALTER TABLE public.prospects DROP COLUMN IF EXISTS instagram_url;
ALTER TABLE public.prospect_companies DROP COLUMN IF EXISTS instagram_url;
