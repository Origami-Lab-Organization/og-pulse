-- Transcrição de reunião: registro, fila e a URL de download que não pode vazar.
--
-- Dois caminhos chegam à mesma tabela e à mesma aba Reuniões do projeto:
--
--   * 'teams' (ADR-0052, principal): a transcrição do próprio Teams. A reunião é vinculada
--     ao projeto quando nasce (`project_online_meetings`) e a Edge Function
--     `teams-transcripts-sync`, pelo cron, traz o texto sozinha depois que a reunião acaba.
--   * 'gravacao' (ADR-0039, plano B): a pessoa escolhe uma gravação no OneDrive e um worker
--     fora do Supabase (VM própria, WhisperX) transcreve.
--
-- Nasceu como 20260924120000 na branch poc-meeting-record e nunca foi aplicada. Aquele
-- número já era de 20260924120000_prospect_tasks.sql, e o `db push` do build recusa versão
-- repetida e versão anterior à última aplicada — por isso a renumeração.
--
-- Pontos que não são detalhe de implementação:
--
--   * A GRAVAÇÃO NÃO É COPIADA. Guardamos ponteiro (`recording_drive_id` +
--     `recording_item_id`), como `projects.onedrive_*` já faz (ADR-0019). O item id do
--     Graph só resolve dentro do drive dele — por isso os dois andam sempre juntos.
--
--   * A URL DE DOWNLOAD É SEGREDO e mora em tabela separada, `meeting_transcription_sources`,
--     com RLS ligada, NENHUMA policy e sem GRANT para os papéis do cliente. Quem tem aquela
--     URL abre a gravação sem token. Só service role alcança: a Edge Function
--     `transcription-enqueue` grava, o worker lê.
--
--   * A FILA É ESTA TABELA. `status` + índice parcial em 'pendente' bastam; não existe
--     endpoint na VM para chamar (ADR-0039).
--
--   * O RESULTADO É DO WORKER. O cliente pede e dá nome às vozes; status, texto e falas só
--     mudam pela service role (trigger de guarda abaixo). Sem isso, quem pode pedir
--     transcrição poderia gravar uma "transcrição concluída" com o texto que quisesse.
--
-- Capacidade: `transcricao:ler` nasce SENSÍVEL — reunião de projeto carrega valor, margem
-- e às vezes salário, e o texto é pesquisável.
--
-- Matriz: .harness/capability-matrix.md, seção "5. Projeto, portfolio e alocacao".
-- Rollback: supabase/rollback/20261021200000_meeting_transcriptions_rollback.sql

-- ── 1. Capacidades ───────────────────────────────────────────────────────────────────────

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('transcricao:ler', 'projeto', 'Ler transcrição de reunião',
   'Vê o texto das reuniões transcritas do projeto, com quem falou e quando. Colaborador '
   'vê apenas os projetos onde está alocado. Sensível: a conversa de uma reunião costuma '
   'conter valor, margem e decisão sobre pessoas.',
   true),
  ('transcricao:solicitar', 'projeto', 'Pedir transcrição de reunião',
   'Envia uma gravação do OneDrive para transcrição e dá nome às vozes. Vale para os '
   'projetos que a pessoa gerencia ou onde está alocada. Não dá acesso ao texto: ler é '
   'transcricao:ler.',
   false)
ON CONFLICT (key) DO NOTHING;

-- As duas nascem com quem já vê os arquivos do projeto (`arquivo-projeto:ler`: Admin, Gerente
-- e Colaborador, este no escopo alocado): a transcrição é mais um documento daquele projeto,
-- e quem participou da reunião é quem pede o texto dela. Mudar quem tem depois é toggle de
-- perfil (ADR-0027), não migration nova.
--
-- Guarda do último admin desligada só neste trecho, pelo mesmo motivo de 20261021120000:
-- acrescentar capacidade não tira `pessoa:editar-papel` de ninguém, e a guarda pararia o
-- deploy nos tenants com teste encerrado.
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, e.nova, true
FROM public.role_capabilities rc
JOIN (VALUES
  ('transcricao:ler',       'arquivo-projeto:ler'),
  ('transcricao:solicitar', 'arquivo-projeto:ler')
) AS e(nova, origem) ON e.origem = rc.capability
WHERE rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, e.nova
FROM public.default_role_capabilities drc
JOIN (VALUES
  ('transcricao:ler',       'arquivo-projeto:ler'),
  ('transcricao:solicitar', 'arquivo-projeto:ler')
) AS e(nova, origem) ON e.origem = drc.capability
ON CONFLICT (role_name, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, e.nova, o.enabled,
       'espelhamento de ' || e.origem || ' (transcrição de reunião, 21/10/2026)'
FROM public.user_capability_overrides o
JOIN (VALUES
  ('transcricao:ler',       'arquivo-projeto:ler'),
  ('transcricao:solicitar', 'arquivo-projeto:ler')
) AS e(nova, origem) ON e.origem = o.capability
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

-- ── 2. Estado do trabalho ────────────────────────────────────────────────────────────────

-- 'falhou' é estado final com `last_error` preenchido: o worker desiste depois das
-- tentativas e a pessoa vê o motivo. URL expirada cai aqui e volta para 'pendente' só
-- quando alguém com o token do Graph gerar outra (Edge Function, caminho de reenvio).
CREATE TYPE public.meeting_transcription_status AS ENUM (
  'pendente', 'processando', 'concluida', 'falhou'
);

-- De onde veio o texto. 'teams' já nasce 'concluida'; só 'gravacao' passa pela fila.
CREATE TYPE public.meeting_transcription_source AS ENUM ('teams', 'gravacao');

-- ── 3. A reunião transcrita ──────────────────────────────────────────────────────────────

CREATE TABLE public.meeting_transcriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id  uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  source      public.meeting_transcription_source NOT NULL DEFAULT 'gravacao',

  -- Identidade da reunião entre caixas de correio (ADR-0011), quando ela veio de um rito do
  -- projeto. NULL quando a pessoa escolheu a gravação sozinha — aí o projeto foi escolhido
  -- por gente, nunca inferido do conteúdo da conversa (ADR-0039).
  ical_uid      text,
  event_subject text        NOT NULL,
  occurred_at   timestamptz,

  -- 'teams': a reunião (`onlineMeeting.id`) e a transcrição (`callTranscript.id`) no Graph.
  online_meeting_id    text,
  source_transcript_id text,

  -- 'gravacao': ponteiro para a gravação no OneDrive. Nunca copiada para cá.
  recording_drive_id text,
  recording_item_id  text,
  -- Link para abrir a gravação no OneDrive. Não é segredo: exige login e o acesso é do
  -- OneDrive (ADR-0019).
  recording_web_url  text,

  status      public.meeting_transcription_status NOT NULL DEFAULT 'pendente',
  attempts    integer     NOT NULL DEFAULT 0,
  last_error  text,
  -- Quem pegou o trabalho, para diagnosticar job preso sem precisar entrar na VM.
  claimed_by  text,
  claimed_at  timestamptz,
  finished_at timestamptz,

  language         text,
  duration_seconds integer,
  transcript_text  text,
  -- Falas com início, fim e rótulo de voz, como o WhisperX devolve:
  -- [{ start, end, speaker, text }].
  segments         jsonb,
  -- Nome de cada voz: [{ label: 'SPEAKER_00', name: 'Fulana' }]. O WhisperX separa vozes
  -- mas não sabe nomes (ADR-0039); o nome entra por quem participou, nunca por adivinhação.
  speakers         jsonb       NOT NULL DEFAULT '[]'::jsonb,

  requested_by uuid        NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Mesma gravação não vira duas transcrições: reenviar reaproveita a linha, e dois cliques
  -- no botão não geram trabalho duplicado na VM.
  CONSTRAINT meeting_transcriptions_unique_recording
    UNIQUE (tenant_id, recording_item_id),
  -- A sincronização roda de 10 em 10 minutos e relê os últimos dias: é isto que a torna
  -- idempotente. Uma reunião vinculada a dois projetos ganha uma cópia em cada.
  CONSTRAINT meeting_transcriptions_unique_teams_transcript
    UNIQUE (project_id, source_transcript_id),
  CONSTRAINT meeting_transcriptions_source_pointer CHECK (
    CASE source
      WHEN 'teams' THEN online_meeting_id IS NOT NULL AND source_transcript_id IS NOT NULL
      ELSE recording_drive_id IS NOT NULL AND recording_item_id IS NOT NULL
    END
  ),
  CONSTRAINT meeting_transcriptions_subject_valid
    CHECK (char_length(btrim(event_subject)) BETWEEN 1 AND 400),
  CONSTRAINT meeting_transcriptions_speakers_array
    CHECK (jsonb_typeof(speakers) = 'array'),
  CONSTRAINT meeting_transcriptions_segments_array
    CHECK (segments IS NULL OR jsonb_typeof(segments) = 'array')
);

CREATE INDEX meeting_transcriptions_project_idx
  ON public.meeting_transcriptions (project_id, created_at DESC);

-- A fila. Índice parcial: só a cauda pendente interessa ao worker.
CREATE INDEX meeting_transcriptions_queue_idx
  ON public.meeting_transcriptions (created_at)
  WHERE status = 'pendente';

COMMENT ON TABLE public.meeting_transcriptions IS
  'Reunião gravada no Teams e transcrita por worker próprio (ADR-0039). Guarda ponteiro '
  'para a gravação no OneDrive, o texto resultante e o estado do trabalho — esta tabela é '
  'a própria fila.';
COMMENT ON COLUMN public.meeting_transcriptions.speakers IS
  'Nome de cada voz, dado por quem participou. O WhisperX entrega SPEAKER_00 e não sabe '
  'nomes; ligar voz a pessoa por inferência produz registro errado com cara de oficial '
  '(ADR-0039).';

-- ── 4. Guarda: tenant herdado e resultado só do worker ───────────────────────────────────

-- O tenant vem SEMPRE do projeto (ADR-0021). Pelo cliente só entra gravação, e do começo da
-- fila: ele não escolhe status nem traz texto pronto. A transcrição do Teams entra pronta,
-- pela service role. No UPDATE, o cliente só muda o título e o nome das vozes; o resto é do
-- worker e das Edge Functions.
CREATE OR REPLACE FUNCTION public.meeting_transcriptions_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT p.tenant_id INTO NEW.tenant_id FROM public.projects p WHERE p.id = NEW.project_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Projeto não encontrado.' USING ERRCODE = 'PU001';
    END IF;
    IF public.caller_is_service_role() THEN
      RETURN NEW;
    END IF;
    NEW.source := 'gravacao';
    NEW.online_meeting_id := NULL;
    NEW.source_transcript_id := NULL;
    NEW.status := 'pendente';
    NEW.attempts := 0;
    NEW.last_error := NULL;
    NEW.claimed_by := NULL;
    NEW.claimed_at := NULL;
    NEW.finished_at := NULL;
    NEW.language := NULL;
    NEW.duration_seconds := NULL;
    NEW.transcript_text := NULL;
    NEW.segments := NULL;
    NEW.speakers := '[]'::jsonb;
    RETURN NEW;
  END IF;

  IF NOT public.caller_is_service_role()
     AND (NEW.tenant_id, NEW.project_id, NEW.source, NEW.ical_uid, NEW.occurred_at,
          NEW.online_meeting_id, NEW.source_transcript_id, NEW.recording_drive_id,
          NEW.recording_item_id, NEW.recording_web_url, NEW.status, NEW.attempts,
          NEW.last_error, NEW.claimed_by, NEW.claimed_at, NEW.finished_at, NEW.language,
          NEW.duration_seconds, NEW.transcript_text, NEW.segments, NEW.requested_by,
          NEW.created_at)
         IS DISTINCT FROM
         (OLD.tenant_id, OLD.project_id, OLD.source, OLD.ical_uid, OLD.occurred_at,
          OLD.online_meeting_id, OLD.source_transcript_id, OLD.recording_drive_id,
          OLD.recording_item_id, OLD.recording_web_url, OLD.status, OLD.attempts,
          OLD.last_error, OLD.claimed_by, OLD.claimed_at, OLD.finished_at, OLD.language,
          OLD.duration_seconds, OLD.transcript_text, OLD.segments, OLD.requested_by,
          OLD.created_at) THEN
    RAISE EXCEPTION 'Na transcrição, só o título e o nome das vozes mudam pela tela.'
      USING ERRCODE = 'PU001';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.meeting_transcriptions_guard() IS
  'Herda o tenant do projeto; INSERT do cliente vira gravação na fila, do começo. Fora da '
  'service role, só título e vozes mudam no UPDATE. ERRCODE PU001. ADR-0039, ADR-0052.';

CREATE TRIGGER meeting_transcriptions_guard
  BEFORE INSERT OR UPDATE ON public.meeting_transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_transcriptions_guard();

-- ── 5. O segredo: URL pré-autenticada da gravação ────────────────────────────────────────

-- Tabela à parte porque RLS é por linha, não por coluna: deixar a URL em
-- meeting_transcriptions daria a gravação inteira a quem pode ver o status do trabalho.
CREATE TABLE public.meeting_transcription_sources (
  transcription_id uuid        PRIMARY KEY
    REFERENCES public.meeting_transcriptions(id) ON DELETE CASCADE,
  -- Vem de @microsoft.graph.downloadUrl, resolvida com o token DELEGADO de quem pediu.
  -- Vale por si só: quem tem a string baixa o arquivo. Nunca em log, nunca no cliente.
  download_url     text        NOT NULL,
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.meeting_transcription_sources IS
  'URL pré-autenticada da gravação, de validade curta. SEM POLICY E SEM GRANT PARA O CLIENTE '
  'POR DECISÃO: só service role alcança (Edge Function grava, worker lê e apaga). É o que '
  'permite o worker baixar sem receber credencial do Graph — ver ADR-0039.';

ALTER TABLE public.meeting_transcription_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_transcription_sources FROM anon, authenticated;
GRANT ALL ON public.meeting_transcription_sources TO service_role;

-- ── 6. Predicados ────────────────────────────────────────────────────────────────────────

-- Leitura em forma de CONJUNTO (ADR-0046), com o mesmo alcance dos e-mails do projeto
-- (ADR-0047): tem a capacidade E alcança o projeto — o portfólio inteiro (`portfolio:ler`,
-- ADR-0002), quem gere qualquer projeto, o gerente do projeto, ou quem está alocado nele.
-- O tenant vem do próprio usuário, nunca de argumento (ADR-0021).
CREATE OR REPLACE FUNCTION public.transcription_readable_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT e.id AS employee_id,
           e.tenant_id,
           public.has_capability(auth.uid(), e.tenant_id, 'portfolio:ler')
             OR public.has_capability(auth.uid(), e.tenant_id, 'projeto:gerir-qualquer') AS sees_all
    FROM public.employees e
    WHERE e.auth_id = auth.uid()
      AND public.has_capability(auth.uid(), e.tenant_id, 'transcricao:ler')
  )
  SELECT p.id
  FROM me
  JOIN public.projects p ON p.tenant_id = me.tenant_id
  WHERE me.sees_all
     OR p.manager_id = me.employee_id
     OR public.is_project_team_member(auth.uid(), p.id);
$$;

-- Pedir e nomear vozes: quem tem a capacidade E faz parte do projeto. Ver o portfólio não
-- basta: mandar gravação para o projeto alheio não é o mesmo que ler a ata dele. A Edge
-- Function chama esta mesma função antes de reenviar — uma regra só para policy e servidor.
CREATE OR REPLACE FUNCTION public.can_request_meeting_transcription(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND public.user_belongs_to_tenant(_user_id, p.tenant_id)
      AND public.has_capability(_user_id, p.tenant_id, 'transcricao:solicitar')
      AND (
        public.can_manage_project(_user_id, p.id)
        OR public.is_project_team_member(_user_id, p.id)
      )
  );
$$;

COMMENT ON FUNCTION public.transcription_readable_project_ids() IS
  'Projetos cujas transcrições o usuário logado lê: transcricao:ler + (portfólio, quem gere '
  'qualquer projeto, GP do projeto ou alocado). Forma de conjunto para a RLS — ADR-0046, ADR-0039.';
COMMENT ON FUNCTION public.can_request_meeting_transcription(uuid, uuid) IS
  'transcricao:solicitar + (GP do projeto, quem gere qualquer projeto ou alocado). Usada pela '
  'policy e pela Edge Function transcription-enqueue. ADR-0039.';

REVOKE ALL ON FUNCTION public.transcription_readable_project_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_request_meeting_transcription(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transcription_readable_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_request_meeting_transcription(uuid, uuid)
  TO authenticated, service_role;

-- ── 7. RLS ───────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.meeting_transcriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_transcriptions TO authenticated;
GRANT ALL ON public.meeting_transcriptions TO service_role;

CREATE POLICY "meeting_transcriptions_select" ON public.meeting_transcriptions
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.transcription_readable_project_ids()));

-- Quem pede assina: `requested_by` é a própria pessoa, nunca outra.
CREATE POLICY "meeting_transcriptions_insert" ON public.meeting_transcriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_request_meeting_transcription(auth.uid(), project_id)
    AND requested_by = public.employee_id_for(auth.uid(), tenant_id)
  );

-- Título e nome das vozes (o resto a guarda recusa). O worker não passa por aqui.
CREATE POLICY "meeting_transcriptions_update" ON public.meeting_transcriptions
  FOR UPDATE TO authenticated
  USING (public.can_request_meeting_transcription(auth.uid(), project_id))
  WITH CHECK (public.can_request_meeting_transcription(auth.uid(), project_id));

-- Apagar é mais restrito que pedir: a transcrição costuma ser o único registro que sobra
-- da reunião depois que o Teams expira a gravação (ADR-0039).
CREATE POLICY "meeting_transcriptions_delete" ON public.meeting_transcriptions
  FOR DELETE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

-- ── 8. Reuniões do Teams acompanhadas pelo projeto ───────────────────────────────────────

-- Vínculo estrutural entre a reunião do Teams e o projeto (ADR-0052). É ele que decide para
-- onde vai a transcrição: a sincronização só importa texto de reunião que está aqui, e nunca
-- classifica pelo conteúdo (ADR-0039).
--
-- O ORGANIZADOR NÃO VEM DO CLIENTE. `organizer_entra_id` é o `oid` de um id token do Entra
-- validado na Edge Function `teams-meeting-register`, do mesmo e-mail do funcionário que
-- vinculou. A sincronização busca as transcrições só das reuniões desse organizador — então
-- vincular a reunião de outra pessoa ao próprio projeto não traz nada. Por isso não há
-- policy de INSERT nem de UPDATE: só a service role escreve.
CREATE TABLE public.project_online_meetings (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id         uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- `onlineMeeting.id` do Graph. Numa série recorrente é o mesmo para todas as ocorrências.
  online_meeting_id  text        NOT NULL,
  organizer_entra_id text        NOT NULL,
  join_web_url       text,
  ical_uid           text,
  event_subject      text        NOT NULL,
  registered_by      uuid        NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  -- Diagnóstico da sincronização, escrito para a tela (a Edge Function traduz o erro).
  last_checked_at    timestamptz,
  last_error         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_online_meetings_unique UNIQUE (project_id, online_meeting_id),
  CONSTRAINT project_online_meetings_subject_valid
    CHECK (char_length(btrim(event_subject)) BETWEEN 1 AND 400)
);

CREATE INDEX project_online_meetings_organizer_idx
  ON public.project_online_meetings (organizer_entra_id);

COMMENT ON TABLE public.project_online_meetings IS
  'Reunião do Teams vinculada ao projeto: a transcrição dela vem sozinha para a aba Reuniões '
  '(ADR-0052). Só a service role escreve; o organizador vem de id token validado.';

CREATE OR REPLACE FUNCTION public.project_online_meetings_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT p.tenant_id INTO NEW.tenant_id FROM public.projects p WHERE p.id = NEW.project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto não encontrado.' USING ERRCODE = 'PU001';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_online_meetings_guard
  BEFORE INSERT OR UPDATE ON public.project_online_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.project_online_meetings_guard();

ALTER TABLE public.project_online_meetings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, DELETE ON public.project_online_meetings TO authenticated;
GRANT ALL ON public.project_online_meetings TO service_role;

CREATE POLICY "project_online_meetings_select" ON public.project_online_meetings
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.transcription_readable_project_ids()));

-- Parar de acompanhar: quem vinculou, ou quem gere o projeto. As transcrições já trazidas
-- ficam; só as próximas deixam de vir.
CREATE POLICY "project_online_meetings_delete" ON public.project_online_meetings
  FOR DELETE TO authenticated
  USING (
    registered_by = public.employee_id_for(auth.uid(), tenant_id)
    OR public.can_manage_project(auth.uid(), project_id)
  );

-- ── 9. Aviso no sino ─────────────────────────────────────────────────────────────────────

-- Ninguém fica olhando a tela esperando (ADR-0039): quem pediu — ou, no Teams, quem
-- vinculou a reunião — é avisado quando a transcrição fica pronta ou quando o worker
-- desiste. Só estado final avisa — 'falhou' com tentativa sobrando volta para 'pendente'
-- sem ruído. A do Teams já entra pronta, por isso o aviso também sai no INSERT.
CREATE OR REPLACE FUNCTION public.notify_meeting_transcription_finished()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ready boolean := NEW.status = 'concluida';
BEGIN
  INSERT INTO public.notifications
    (tenant_id, recipient_id, type, category, priority, title, message, reference_id, action_url)
  VALUES
    (NEW.tenant_id, NEW.requested_by,
     CASE WHEN v_ready THEN 'meeting_transcription_ready' ELSE 'meeting_transcription_failed' END,
     'projeto', 'normal',
     CASE WHEN v_ready THEN 'Transcrição pronta' ELSE 'Transcrição não concluída' END,
     CASE WHEN v_ready
       THEN 'A reunião "' || NEW.event_subject || '" já pode ser lida na aba Reuniões do projeto.'
       ELSE 'Não foi possível transcrever "' || NEW.event_subject || '". Veja o motivo na aba Reuniões do projeto.'
     END,
     NEW.id,
     '/projects/' || NEW.project_id::text || '?tab=reunioes');
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_meeting_transcription_finished() IS
  'Avisa no sino quem pediu a transcrição quando ela chega a estado final. ADR-0039, ADR-0052.';

CREATE TRIGGER meeting_transcriptions_notify_finished
  AFTER UPDATE OF status ON public.meeting_transcriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('concluida', 'falhou'))
  EXECUTE FUNCTION public.notify_meeting_transcription_finished();

CREATE TRIGGER meeting_transcriptions_notify_arrived
  AFTER INSERT ON public.meeting_transcriptions
  FOR EACH ROW
  WHEN (NEW.status IN ('concluida', 'falhou'))
  EXECUTE FUNCTION public.notify_meeting_transcription_finished();

-- ── 10. Agendamento ──────────────────────────────────────────────────────────────────────

-- De 10 em 10 minutos, deslocado do minuto zero dos outros crons. A transcrição do Teams fica
-- disponível alguns minutos depois do fim da reunião; a sincronização relê os últimos dias e
-- a UNIQUE (project_id, source_transcript_id) descarta o que já veio. Sem as credenciais do
-- app no ambiente da função, ela responde sem fazer nada.
-- Mesmo padrão dos outros crons: URL e chave vêm do Vault (public.cron_secret, 20260831120000).
select cron.unschedule('teams-transcripts-sync-10min')
 where exists (select 1 from cron.job where jobname = 'teams-transcripts-sync-10min');

select cron.schedule('teams-transcripts-sync-10min', '3-59/10 * * * *', $job$
  select net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/teams-transcripts-sync',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb
  ) as request_id
$job$);
