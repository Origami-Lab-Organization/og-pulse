-- Reversão de 20260929150000_prospect_company_site_scan.sql. Perde só o que o site trouxe;
-- LinkedIn/Instagram/Site preenchidos a partir dele ficam nas colunas de sempre.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

ALTER TABLE public.prospect_companies
  DROP COLUMN IF EXISTS site_scan,
  DROP COLUMN IF EXISTS site_scan_em;
