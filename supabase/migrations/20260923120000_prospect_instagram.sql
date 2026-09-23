-- Prospecção — Instagram da empresa e do contato.
--
-- Pedido de 23/09/2026 (Guilherme): parte das empresas prospectadas é mais ativa no
-- Instagram do que no LinkedIn, e o perfil ficava perdido em observação ou fora do card.
-- Espelha `linkedin_url` nas duas tabelas: a da empresa vale para todos os contatos dela;
-- a do contato é pessoal.
--
-- Diferente do LinkedIn, o Instagram NÃO entra na deduplicação: a regra continua CNPJ ou
-- LinkedIn. Perfil de Instagram muda de @ com frequência e muitas empresas têm mais de um
-- (marca, filial, produto) — um índice único aqui bloquearia cadastro legítimo.
--
-- Sem policy nova: as colunas herdam as policies de linha de `prospect_companies` e
-- `prospects` (prospeccao:ler / prospeccao:editar).
--
-- Rollback: supabase/rollback/20260923120000_prospect_instagram_rollback.sql

ALTER TABLE public.prospect_companies
  ADD COLUMN instagram_url text,
  ADD CONSTRAINT prospect_companies_instagram_length
    CHECK (instagram_url IS NULL OR char_length(instagram_url) <= 300);

ALTER TABLE public.prospects
  ADD COLUMN instagram_url text,
  ADD CONSTRAINT prospects_instagram_length
    CHECK (instagram_url IS NULL OR char_length(instagram_url) <= 300);

COMMENT ON COLUMN public.prospect_companies.instagram_url IS
  'Instagram da empresa (perfil ou @). Não participa da deduplicação — só CNPJ e LinkedIn.';
COMMENT ON COLUMN public.prospects.instagram_url IS
  'Instagram pessoal do contato (perfil ou @).';
