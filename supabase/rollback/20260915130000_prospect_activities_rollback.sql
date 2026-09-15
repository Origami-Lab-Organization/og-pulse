-- Reversão de 20260915130000_prospect_activities.sql.
--
-- As colunas de `leads` saem primeiro: leads.prospect_id referencia prospects, e a
-- reversão de 20260915120000 não consegue derrubar a tabela com a FK de pé.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP INDEX IF EXISTS public.leads_prospect_id_idx;

ALTER TABLE public.leads
  DROP COLUMN IF EXISTS prospect_id,
  DROP COLUMN IF EXISTS first_touch_at;

DROP TABLE IF EXISTS public.prospect_activities;

DROP FUNCTION IF EXISTS public.prospect_activities_advance();
DROP FUNCTION IF EXISTS public.prospect_activities_set_sequence();
