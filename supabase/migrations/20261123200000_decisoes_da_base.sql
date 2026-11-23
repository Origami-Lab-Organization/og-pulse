-- Prospecção — descartar a empresa ou marcar "Não agora" na Base de empresas (US-0010, 23/11/2026).
--
-- Decisões do Victor: descartar direto na Base, sem criar oportunidade (motivo da lista própria
-- de 16/11); "Não agora" com data para voltar, na Base e como saída da Qualificação (a Perda
-- "Momento errado" pede a data); na data, aviso no sino e a marca "Retomar"; nada reabre sozinho.
--
-- A base da Receita mora na VPS (ADR-0053): a decisão mora aqui, chaveada pelo CNPJ da empresa
-- (a raiz, para valer para a empresa toda, como a relação da US-0019). O nome vai junto só para o
-- aviso do sino.
--
-- Regras:
--   * uma decisão valendo por empresa e tenant; desfazer grava quem e quando (não apaga);
--   * leitura com prospeccao:ler, gravação e desfazer com prospeccao:editar, no tenant;
--   * mover a empresa para qualificação de novo (oportunidade nova) ou reabrir a oportunidade
--     perdida encerra a decisão, pelo gatilho em prospects — vale para a tela e para o MCP;
--   * todo dia às 8h de Brasília, quem marcou "Não agora" (ou o responsável da oportunidade,
--     quando veio da Qualificação) recebe o aviso no sino no dia da data.
--
-- Rollback: supabase/rollback/20261123200000_decisoes_da_base_rollback.sql

CREATE TABLE IF NOT EXISTS public.prospect_decisoes_da_base (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cnpj          text        NOT NULL CHECK (cnpj ~ '^\d{14}$'),
  cnpj_raiz     text        GENERATED ALWAYS AS (left(cnpj, 8)) STORED,
  empresa_nome  text        NOT NULL CHECK (char_length(btrim(empresa_nome)) BETWEEN 1 AND 200),
  decisao       text        NOT NULL CHECK (decisao IN ('descartada', 'nao_agora')),
  motivo        text        CHECK (motivo IS NULL OR motivo IN ('sem_fit', 'cliente_ou_parceiro', 'concorrente', 'dados_invalidos', 'outro')),
  texto         text        CHECK (texto IS NULL OR char_length(texto) <= 500),
  voltar_em     date,
  prospect_id   uuid        REFERENCES public.prospects(id) ON DELETE SET NULL,
  decidida_por  uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  decidida_em   timestamptz NOT NULL DEFAULT now(),
  desfeita_por  uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  desfeita_em   timestamptz,
  avisada_em    timestamptz,
  CONSTRAINT prospect_decisoes_descarte_com_motivo CHECK (decisao <> 'descartada' OR motivo IS NOT NULL),
  CONSTRAINT prospect_decisoes_outro_com_texto CHECK (motivo IS DISTINCT FROM 'outro' OR nullif(btrim(texto), '') IS NOT NULL),
  CONSTRAINT prospect_decisoes_nao_agora_com_data CHECK (decisao <> 'nao_agora' OR voltar_em IS NOT NULL)
);

-- Uma decisão valendo por empresa e tenant.
CREATE UNIQUE INDEX IF NOT EXISTS prospect_decisoes_da_base_valendo_uidx
  ON public.prospect_decisoes_da_base (tenant_id, cnpj_raiz) WHERE desfeita_em IS NULL;

-- O aviso diário procura só os "Não agora" ainda não avisados.
CREATE INDEX IF NOT EXISTS prospect_decisoes_da_base_aviso_idx
  ON public.prospect_decisoes_da_base (voltar_em)
  WHERE decisao = 'nao_agora' AND desfeita_em IS NULL AND avisada_em IS NULL;

COMMENT ON TABLE public.prospect_decisoes_da_base IS
  'Descartada ou "Não agora" para uma empresa da Base de empresas, por tenant (US-0010). Desfazer grava quem e quando.';

-- ---------------------------------------------------------------------------
-- Quem decidiu e quem desfez vêm da sessão; o resto não muda depois de gravado
-- ---------------------------------------------------------------------------

-- Employee da sessão no tenant (nulo sem sessão, ex.: a tarefa agendada).
CREATE OR REPLACE FUNCTION public.prospect_employee_da_sessao(p_tenant uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id FROM public.employees e WHERE e.auth_id = auth.uid() AND e.tenant_id = p_tenant LIMIT 1;
$$;

-- Só devolve o próprio employee de quem chama; o gatilho de guarda (sem DEFINER) usa.
REVOKE ALL ON FUNCTION public.prospect_employee_da_sessao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prospect_employee_da_sessao(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prospect_decisoes_da_base_guarda()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.decidida_por := public.prospect_employee_da_sessao(NEW.tenant_id);
    NEW.decidida_em := now();
    NEW.desfeita_por := NULL;
    NEW.desfeita_em := NULL;
    NEW.avisada_em := NULL;
    RETURN NEW;
  END IF;

  IF OLD.desfeita_em IS NOT NULL THEN
    RAISE EXCEPTION 'Esta decisão já foi desfeita.' USING ERRCODE = 'PU001';
  END IF;
  IF (NEW.tenant_id, NEW.cnpj, NEW.empresa_nome, NEW.decisao, NEW.motivo, NEW.texto, NEW.voltar_em, NEW.prospect_id, NEW.decidida_por, NEW.decidida_em)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.cnpj, OLD.empresa_nome, OLD.decisao, OLD.motivo, OLD.texto, OLD.voltar_em, OLD.prospect_id, OLD.decidida_por, OLD.decidida_em) THEN
    RAISE EXCEPTION 'A decisão não muda depois de gravada: desfaça e marque de novo.' USING ERRCODE = 'PU001';
  END IF;
  -- O aviso é marcado só pela tarefa agendada (sem sessão).
  IF auth.uid() IS NOT NULL AND NEW.avisada_em IS DISTINCT FROM OLD.avisada_em THEN
    RAISE EXCEPTION 'O aviso é marcado pelo Pulse.' USING ERRCODE = 'PU001';
  END IF;
  IF NEW.desfeita_em IS NOT NULL THEN
    NEW.desfeita_em := now();
    NEW.desfeita_por := public.prospect_employee_da_sessao(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_decisoes_da_base_guarda ON public.prospect_decisoes_da_base;
CREATE TRIGGER prospect_decisoes_da_base_guarda
  BEFORE INSERT OR UPDATE ON public.prospect_decisoes_da_base
  FOR EACH ROW EXECUTE FUNCTION public.prospect_decisoes_da_base_guarda();

-- ---------------------------------------------------------------------------
-- RLS: como a Prospecção, por capacidade no tenant; sem DELETE
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospect_decisoes_da_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prospeccao readers can view base decisions"
  ON public.prospect_decisoes_da_base FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Prospeccao editors can insert base decisions"
  ON public.prospect_decisoes_da_base FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

-- USING e WITH CHECK: quem desfaz não move a linha para outro tenant.
CREATE POLICY "Prospeccao editors can undo base decisions"
  ON public.prospect_decisoes_da_base FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

GRANT SELECT, INSERT, UPDATE ON public.prospect_decisoes_da_base TO authenticated;

-- ---------------------------------------------------------------------------
-- A empresa volta ao fluxo: a decisão termina (oportunidade nova ou Perda reaberta)
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER: encerra a decisão da empresa mesmo quando quem move não tem a linha dela
-- em mãos; o tenant e a empresa vêm da oportunidade, que já passou pela RLS (ADR-0021).
CREATE OR REPLACE FUNCTION public.prospects_encerra_decisao_da_base()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raiz text;
BEGIN
  SELECT left(regexp_replace(c.cnpj, '\D', '', 'g'), 8) INTO v_raiz
    FROM public.prospect_companies c
   WHERE c.id = NEW.company_id AND c.tenant_id = NEW.tenant_id;
  IF v_raiz IS NULL OR length(v_raiz) <> 8 THEN
    RETURN NEW;
  END IF;
  UPDATE public.prospect_decisoes_da_base
     SET desfeita_em = now()
   WHERE tenant_id = NEW.tenant_id AND cnpj_raiz = v_raiz AND desfeita_em IS NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prospects_encerra_decisao_da_base() FROM PUBLIC;

DROP TRIGGER IF EXISTS prospects_encerra_decisao_criada ON public.prospects;
CREATE TRIGGER prospects_encerra_decisao_criada
  AFTER INSERT ON public.prospects
  FOR EACH ROW
  WHEN (NEW.stage NOT IN ('descartado', 'sem_resposta', 'ganho', 'convertido'))
  EXECUTE FUNCTION public.prospects_encerra_decisao_da_base();

DROP TRIGGER IF EXISTS prospects_encerra_decisao_reaberta ON public.prospects;
CREATE TRIGGER prospects_encerra_decisao_reaberta
  AFTER UPDATE OF stage ON public.prospects
  FOR EACH ROW
  WHEN (OLD.stage IN ('descartado', 'sem_resposta')
    AND NEW.stage NOT IN ('descartado', 'sem_resposta', 'ganho', 'convertido'))
  EXECUTE FUNCTION public.prospects_encerra_decisao_da_base();

-- ---------------------------------------------------------------------------
-- Aviso no sino na data do "Não agora"
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.avisar_empresas_para_retomar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH devidas AS (
    UPDATE public.prospect_decisoes_da_base d
       SET avisada_em = now()
     WHERE d.decisao = 'nao_agora'
       AND d.desfeita_em IS NULL
       AND d.avisada_em IS NULL
       AND d.voltar_em <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    RETURNING d.*
  )
  INSERT INTO public.notifications (tenant_id, recipient_id, type, category, title, message, action_url, reference_id)
  SELECT d.tenant_id,
         coalesce(p.owner_id, d.decidida_por),
         'prospeccao_retomar',
         'comercial',
         'Hora de retomar ' || d.empresa_nome,
         'Marcada como "Não agora" em ' || to_char(d.decidida_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY')
           || '. Veja se agora é o momento de qualificar.',
         '/comercial/empresas?cnpj=' || d.cnpj,
         d.id
    FROM devidas d
    LEFT JOIN public.prospects p ON p.id = d.prospect_id
   WHERE coalesce(p.owner_id, d.decidida_por) IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.avisar_empresas_para_retomar() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('prospeccao-avisar-retomadas-daily')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prospeccao-avisar-retomadas-daily');

-- 11:00 UTC = 08:00 em Brasília, no começo do dia.
SELECT cron.schedule('prospeccao-avisar-retomadas-daily', '0 11 * * *', $job$
  SELECT public.avisar_empresas_para_retomar()
$job$);
