-- Prospecção — faturamento anual da empresa, estimado ou apurado.
--
-- Pedido de 01/10/2026 (Guilherme): o cadastro de empresa ganha o faturamento anual e a
-- base dele. A Receita não informa faturamento — o capital social não é faturamento —, então
-- o número vem do time, e quem lê precisa saber se é palpite ou dado:
--
--   * `estimado`: inferido pelo time (porte, conversa, mercado);
--   * `apurado`: veio de fonte confiável (a própria empresa, balanço publicado).
--
-- Os dois andam juntos: valor sem base seria lido como apurado por quem não sabe, e base
-- sem valor não diz nada. O banco recusa um sem o outro.
--
-- Sem policy nova: as colunas herdam as policies de linha de `prospect_companies`
-- (prospeccao:ler / prospeccao:editar). Não entra na nota de fit (ADR-0042) — mudar a regra
-- de fit é decisão à parte.
--
-- Rollback: supabase/rollback/20261001200000_prospect_company_faturamento_rollback.sql

ALTER TABLE public.prospect_companies
  ADD COLUMN faturamento_anual numeric(16, 2),
  ADD COLUMN faturamento_anual_base text,
  ADD CONSTRAINT prospect_companies_faturamento_nao_negativo
    CHECK (faturamento_anual IS NULL OR faturamento_anual >= 0),
  ADD CONSTRAINT prospect_companies_faturamento_base_valida
    CHECK (faturamento_anual_base IS NULL OR faturamento_anual_base IN ('estimado', 'apurado')),
  ADD CONSTRAINT prospect_companies_faturamento_com_base
    CHECK ((faturamento_anual IS NULL) = (faturamento_anual_base IS NULL));

COMMENT ON COLUMN public.prospect_companies.faturamento_anual IS
  'Faturamento anual em reais, informado pelo time. A base (estimado/apurado) é obrigatória junto.';
COMMENT ON COLUMN public.prospect_companies.faturamento_anual_base IS
  'De onde vem o faturamento: estimado (inferido pelo time) ou apurado (fonte confiável).';
