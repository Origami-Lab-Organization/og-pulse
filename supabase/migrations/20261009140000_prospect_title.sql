-- Nome da oportunidade (09/10/2026).
--
-- Pedido do Guilherme: poder editar o nome de cada oportunidade. Desde 20261009120000 o card é
-- a oportunidade da empresa e leva o nome dela — mas uma empresa pode ter várias oportunidades
-- ("Injepol — Painel de PCP", "Injepol — Lei do Bem"), e com o mesmo nome elas não se distinguem
-- no quadro.
--
-- `title` é opcional: vazio, a oportunidade continua com o nome da empresa (regra única na tela,
-- `opportunityName` em src/types/prospect.ts). Nada é preenchido na migração — o nome da empresa
-- já é o que todos veem hoje.
--
-- Rollback: supabase/rollback/20261009140000_prospect_title_rollback.sql

ALTER TABLE public.prospects ADD COLUMN title text;

ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_title_valid
  CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 1 AND 200);

COMMENT ON COLUMN public.prospects.title IS
  'Nome da oportunidade (09/10/2026). NULL = usa o nome da empresa. Até 200 caracteres.';
