-- Reversão de 20260929160000_fomento_publico.sql. Perde a referência importada (reimportável
-- pelo script) e o cruzamento gravado nas empresas.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

ALTER TABLE public.prospect_companies
  DROP COLUMN IF EXISTS fomento,
  DROP COLUMN IF EXISTS fomento_consultado_em;
DROP FUNCTION IF EXISTS public.import_fomento_publico(jsonb);
DROP TABLE IF EXISTS public.fomento_publico;
