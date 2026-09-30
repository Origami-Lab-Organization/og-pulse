-- Fomento público cruzado por CNPJ (29/09/2026) — frente "financiamento de inovação".
--
-- Duas peças:
--
-- 1. `fomento_publico`: REFERÊNCIA de dados abertos, igual para todos os tenants, carregada
--    por importação (scripts/import-fomento.mjs):
--      - FINEP: planilha de projetos contratados (download.finep.gov.br/Contratacao.xlsx,
--        atualização semanal) — crédito, subvenção, subvenção descentralizada via FAPs,
--        investimento em startups;
--      - Lei do Bem: lista do MCTI de empresas analisadas por ano-base. O gov.br bloqueia
--        robô (CAPTCHA), então o arquivo é baixado à mão e o script o carrega.
--    O BNDES não entra aqui: a API aberta dele responde por CNPJ na hora (Edge Function
--    company-funding-check), e a base inteira passa de 1 GB.
--    É dado público de empresa: leitura para qualquer autenticado, escrita só pela importação
--    (service role), sem policy de escrita.
--
-- 2. `prospect_companies.fomento`: o cruzamento da empresa — Lei do Bem (já declara ou nunca
--    apareceu), captações FINEP/BNDES e, com a chave do Portal da Transparência configurada,
--    contratos com o governo federal. Gravado pela Edge Function com o JWT de quem chama.
--
-- Rollback: supabase/rollback/20260929160000_fomento_publico_rollback.sql

CREATE TABLE public.fomento_publico (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte        text        NOT NULL,
  cnpj         text        NOT NULL,
  razao_social text,
  ano          integer,
  valor        numeric(18, 2),
  instrumento  text,
  descricao    text,
  referencia   text,
  importado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fomento_publico_fonte_valid CHECK (fonte IN ('finep', 'lei_do_bem')),
  CONSTRAINT fomento_publico_cnpj_digits CHECK (cnpj ~ '^[0-9]{14}$'),
  CONSTRAINT fomento_publico_ano_valid CHECK (ano IS NULL OR ano BETWEEN 1990 AND 2100)
);

COMMENT ON TABLE public.fomento_publico IS
  'Dados abertos de fomento por CNPJ (FINEP e Lei do Bem/MCTI), iguais para todos os tenants. '
  'Carga por scripts/import-fomento.mjs; sem escrita pela API.';

-- Reimportar não duplica: a mesma linha da mesma fonte é a mesma operação.
CREATE UNIQUE INDEX fomento_publico_linha_key
  ON public.fomento_publico (fonte, cnpj, coalesce(referencia, ''), coalesce(ano, 0));
CREATE INDEX fomento_publico_cnpj_idx ON public.fomento_publico (cnpj);

ALTER TABLE public.fomento_publico ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fomento_publico FROM anon;
GRANT SELECT ON public.fomento_publico TO authenticated;

CREATE POLICY "Autenticados leem fomento publico" ON public.fomento_publico
  FOR SELECT TO authenticated
  USING (true);

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS fomento              jsonb,
  ADD COLUMN IF NOT EXISTS fomento_consultado_em timestamptz;

COMMENT ON COLUMN public.prospect_companies.fomento IS
  'Cruzamento de fomento público da empresa (FundingSignals de src/types/receita.ts): Lei do '
  'Bem, captações FINEP/BNDES e contratos com o governo. Gravado por company-funding-check.';

-- Carga da referência: upsert pela chave do índice único (que é por expressão e não serve ao
-- upsert do PostgREST). Só o service role executa — é o script de importação.
CREATE OR REPLACE FUNCTION public.import_fomento_publico(p_linhas jsonb)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH linhas AS (
    SELECT * FROM jsonb_to_recordset(p_linhas) AS x(
      fonte text, cnpj text, razao_social text, ano integer, valor numeric,
      instrumento text, descricao text, referencia text
    )
  ), gravadas AS (
    INSERT INTO public.fomento_publico AS f
      (fonte, cnpj, razao_social, ano, valor, instrumento, descricao, referencia, importado_em)
    SELECT fonte, cnpj, razao_social, ano, valor, instrumento, descricao, referencia, now()
      FROM linhas
    ON CONFLICT (fonte, cnpj, coalesce(referencia, ''), coalesce(ano, 0)) DO UPDATE
      SET razao_social = EXCLUDED.razao_social,
          valor        = EXCLUDED.valor,
          instrumento  = EXCLUDED.instrumento,
          descricao    = EXCLUDED.descricao,
          importado_em = now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM gravadas;
$$;

COMMENT ON FUNCTION public.import_fomento_publico(jsonb) IS
  'Carga de fomento_publico pelo scripts/import-fomento.mjs. Só service_role.';

REVOKE ALL ON FUNCTION public.import_fomento_publico(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_fomento_publico(jsonb) TO service_role;
