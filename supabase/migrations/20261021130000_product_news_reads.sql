-- Novidades do produto: quem já viu cada edição (21/10/2026). Decisão: ADR-0048.
--
-- O anúncio de uma entrega aparece uma vez por pessoa e por edição. A leitura fica no banco,
-- não no navegador, para valer em outro computador e no app instalado. É da PESSOA (conta de
-- login), não da empresa: não guarda nada do tenant, e por isso não tem `tenant_id`.
--
-- Rollback: supabase/rollback/20261021130000_product_news_reads_rollback.sql

CREATE TABLE public.product_news_reads (
  user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Versão editorial da edição, definida em src/content/productNews.ts.
  version  text        NOT NULL,
  read_at  timestamptz NOT NULL DEFAULT now(),
  -- Confirmar duas vezes (duas abas, clique duplo) não duplica nem muda a primeira data.
  CONSTRAINT product_news_reads_pkey PRIMARY KEY (user_id, version),
  CONSTRAINT product_news_reads_version_valid CHECK (char_length(version) BETWEEN 1 AND 100)
);

COMMENT ON TABLE public.product_news_reads IS
  'Edições de novidade do produto que cada pessoa já viu (ADR-0048). Uma linha por conta e versão.';

ALTER TABLE public.product_news_reads ENABLE ROW LEVEL SECURITY;

-- Sem UPDATE nem DELETE: ver uma edição é fato, não se desfaz.
GRANT SELECT, INSERT ON public.product_news_reads TO authenticated;

-- `(SELECT auth.uid())` vira InitPlan: avaliado uma vez por consulta (ADR-0046).
CREATE POLICY "product_news_reads_select_own" ON public.product_news_reads
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "product_news_reads_insert_own" ON public.product_news_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
