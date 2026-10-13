-- Lei do Bem automática (13/10/2026) — sem PDF baixado à mão.
--
-- A Edge Function lei-do-bem-sync lê o índice de lotes do MCTI
-- (gov.br/mcti/.../lei-do-bem/paginas/lotes), baixa os PDFs do ano-base 2024 em diante que
-- ainda não entraram, extrai os CNPJs e carrega em fomento_publico pela mesma
-- import_fomento_publico do script. Depois, recalcula a Lei do Bem das empresas que já
-- tinham fomento consultado: a tela não espera alguém clicar "Atualizar" em cada uma.
--
-- Roda pelo cron de hora em hora e também a cada "Atualizar" do fomento
-- (company-funding-check). O índice do MCTI é lido no máximo a cada 6 horas; os lotes
-- pendentes andam de 4 em 4 por chamada (limite de CPU da Edge Function).
--
-- Antes daqui, fomento_publico com qualquer linha da Lei do Bem valia como "lista importada".
-- Com a carga em partes, isso diria "fora da lista" para quem está num lote ainda pendente.
-- Agora a lista só conta como carregada quando não há lote pendente nem falhando.
--
-- Rollback: supabase/rollback/20261013120000_lei_do_bem_automatica_rollback.sql

-- ── Lotes conhecidos ──────────────────────────────────────────────────────────

CREATE TABLE public.fomento_publico_arquivos (
  url           text        PRIMARY KEY,
  fonte         text        NOT NULL,
  ano           integer     NOT NULL,
  situacao      text        NOT NULL DEFAULT 'pendente',
  empresas      integer,
  tentativas    integer     NOT NULL DEFAULT 0,
  erro          text,
  descoberto_em timestamptz NOT NULL DEFAULT now(),
  importado_em  timestamptz,
  CONSTRAINT fomento_publico_arquivos_fonte_valid CHECK (fonte IN ('lei_do_bem')),
  CONSTRAINT fomento_publico_arquivos_situacao_valid
    CHECK (situacao IN ('pendente', 'importado', 'sem_cnpj', 'falhou')),
  CONSTRAINT fomento_publico_arquivos_ano_valid CHECK (ano BETWEEN 1990 AND 2100)
);

COMMENT ON TABLE public.fomento_publico_arquivos IS
  'Lotes publicados pelo MCTI (Lei do Bem) e se já entraram em fomento_publico. '
  'sem_cnpj = o PDF não trouxe nenhum CNPJ (formato mudou?); falhou = tenta de novo, até 5 vezes.';

-- Quando cada índice foi lido pela última vez: a trava das 6 horas.
CREATE TABLE public.fomento_publico_varreduras (
  fonte         text        PRIMARY KEY,
  verificada_em timestamptz NOT NULL,
  CONSTRAINT fomento_publico_varreduras_fonte_valid CHECK (fonte IN ('lei_do_bem'))
);

COMMENT ON TABLE public.fomento_publico_varreduras IS
  'Última leitura do índice de cada fonte de fomento (lei-do-bem-sync).';

-- Dado público, como fomento_publico: leitura para autenticados, escrita só pelo service role.
ALTER TABLE public.fomento_publico_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fomento_publico_varreduras ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fomento_publico_arquivos FROM anon;
REVOKE ALL ON public.fomento_publico_varreduras FROM anon, authenticated;
GRANT SELECT ON public.fomento_publico_arquivos TO authenticated;

CREATE POLICY "Autenticados leem lotes de fomento" ON public.fomento_publico_arquivos
  FOR SELECT TO authenticated
  USING (true);

-- ── A lista está completa? ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lei_do_bem_lista_completa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.fomento_publico_arquivos
                  WHERE fonte = 'lei_do_bem' AND situacao = 'importado')
     AND NOT EXISTS (SELECT 1 FROM public.fomento_publico_arquivos
                      WHERE fonte = 'lei_do_bem'
                        AND (situacao = 'pendente' OR (situacao = 'falhou' AND tentativas < 5)));
$$;

-- Lote que falhou 5 vezes (link quebrado, PDF corrompido) deixa de segurar a lista: fica
-- registrado em fomento_publico_arquivos para alguém olhar, e o resto passa a valer.
COMMENT ON FUNCTION public.lei_do_bem_lista_completa() IS
  'Todos os lotes conhecidos da Lei do Bem entraram: só então "fora da lista" é resposta.';

REVOKE ALL ON FUNCTION public.lei_do_bem_lista_completa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lei_do_bem_lista_completa() TO authenticated, service_role;

-- ── Recalcular as empresas já consultadas ─────────────────────────────────────

-- Só mexe em `leiDoBem` e `leiDoBemAno` dentro de `fomento`, e só nas empresas que já tinham
-- fomento consultado: as outras ainda mostram "Consultar", e o resto do JSON (FINEP, BNDES,
-- governo) é da consulta de cada uma. Com a lista incompleta, não faz nada.
CREATE OR REPLACE FUNCTION public.recalcular_lei_do_bem_nas_empresas()
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH sinal AS (
    SELECT c.id,
           (SELECT max(f.ano) FROM public.fomento_publico f
             WHERE f.fonte = 'lei_do_bem' AND f.cnpj = c.cnpj) AS ano
      FROM public.prospect_companies c
     WHERE c.fomento IS NOT NULL
       AND c.cnpj IS NOT NULL
       AND public.lei_do_bem_lista_completa()
  ), novo AS (
    SELECT id,
           CASE WHEN ano IS NULL THEN 'nunca_usou' ELSE 'ja_usa' END AS situacao,
           ano
      FROM sinal
  ), gravadas AS (
    UPDATE public.prospect_companies c
       SET fomento = c.fomento || jsonb_build_object('leiDoBem', n.situacao, 'leiDoBemAno', n.ano)
      FROM novo n
     WHERE c.id = n.id
       AND (c.fomento->>'leiDoBem' IS DISTINCT FROM n.situacao
            OR (c.fomento->>'leiDoBemAno')::integer IS DISTINCT FROM n.ano)
    RETURNING 1
  )
  SELECT count(*)::integer FROM gravadas;
$$;

COMMENT ON FUNCTION public.recalcular_lei_do_bem_nas_empresas() IS
  'Depois de cada carga da Lei do Bem (lei-do-bem-sync). Só service_role.';

REVOKE ALL ON FUNCTION public.recalcular_lei_do_bem_nas_empresas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_lei_do_bem_nas_empresas() TO service_role;

-- ── Agendamento ───────────────────────────────────────────────────────────────

-- De hora em hora, no minuto 17 (fora do pico dos outros crons). A maior parte das execuções
-- só confere a trava e sai; com lote pendente, carrega 4.
-- Mesmo padrão dos outros crons: URL e chave vêm do Vault (public.cron_secret, 20260831120000).
select cron.unschedule('lei-do-bem-sync-hourly')
 where exists (select 1 from cron.job where jobname = 'lei-do-bem-sync-hourly');

select cron.schedule('lei-do-bem-sync-hourly', '17 * * * *', $job$
  select net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/lei-do-bem-sync',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb
  ) as request_id
$job$);
