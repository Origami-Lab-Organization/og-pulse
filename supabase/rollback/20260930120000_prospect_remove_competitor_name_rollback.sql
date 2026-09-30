-- Reversão de 20260930120000_prospect_remove_competitor_name.sql.
--
-- Devolve a coluna e a regra de tamanho, VAZIAS: o valor apagado não volta — nem nos
-- contatos, nem na cópia arquivada em `legado_oportunidades.leads`. Só a restauração a
-- partir de um export feito antes da migração traz o dado de volta.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS competitor_name text;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_competitor_name_length;
ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_competitor_name_length
    CHECK (competitor_name IS NULL OR char_length(competitor_name) <= 160);

COMMENT ON COLUMN public.prospects.competitor_name IS
  'Concorrente na disputa, quando houver. Texto livre, como era em leads.competitor_name.';
