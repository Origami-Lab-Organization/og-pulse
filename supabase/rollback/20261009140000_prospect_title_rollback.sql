-- Reversão de 20261009140000_prospect_title.sql.
--
-- Perda de dado: os nomes dados às oportunidades (elas voltam a mostrar o nome da empresa).
-- Exportar `id, title` de `public.prospects` antes, se precisar recuperar.

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_title_valid;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS title;
