-- Transcrição de reunião — registro, fila e a URL de download que não pode vazar.
--
-- Decisão de 24/09/2026 (Italo): ADR-0039. A reunião é gravada pelo Teams, a gravação cai
-- no OneDrive, e um worker fora do Supabase (VM própria, WhisperX) transcreve. Esta
-- migration entrega o lado do banco; o worker e a tela vêm depois.
--
-- Três pontos que não são detalhe de implementação:
--
--   * A GRAVAÇÃO NÃO É COPIADA. Guardamos ponteiro (`recording_drive_id` +
--     `recording_item_id`), como `projects.onedrive_*` já faz (ADR-0019). O item id do
--     Graph só resolve dentro do drive dele — por isso os dois andam sempre juntos.
--
--   * A URL DE DOWNLOAD É SEGREDO e mora em tabela separada, `meeting_transcription_sources`,
--     com RLS ligada e NENHUMA policy. Quem tem aquela URL abre a gravação sem token.
--     Ela é pré-autenticada e de validade curta (ADR-0039): é assim que o worker baixa o
--     arquivo sem nunca receber credencial do Graph, e é por isso que ela não pode ser
--     legível por `authenticated` nem aparecer em log (`.harness/patterns/logging.md`).
--     Só service role alcança — Edge Function grava, worker lê.
--
--   * A FILA É ESTA TABELA. `status` + índice parcial em 'pendente' bastam; o worker puxa
--     com FOR UPDATE SKIP LOCKED. Não existe endpoint na VM para chamar (ADR-0039).
--
-- Capacidade: `transcricao:ler` nasce SENSÍVEL — reunião de projeto carrega valor, margem
-- e às vezes salário, e o texto é pesquisável. Predicado de RLS equivalente ao de
-- documento de projeto, como o checklist de review exige para capacidade sensível.
--
-- Matriz: .harness/capability-matrix.md, seção "5. Projeto, portfolio e alocacao".
-- Rollback: supabase/rollback/20260924120000_meeting_transcriptions_rollback.sql

-- ─── Capacidades ─────────────────────────────────────────────────────────────
INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('transcricao:ler', 'projeto', 'Ler transcrição de reunião',
   'Vê o texto das reuniões transcritas do projeto, com quem falou e quando. Colaborador '
   'vê apenas os projetos onde está alocado. Sensível: a conversa de uma reunião costuma '
   'conter valor, margem e decisão de pessoas.',
   true),
  ('transcricao:solicitar', 'projeto', 'Pedir transcrição de reunião',
   'Enfileira a transcrição de uma gravação do OneDrive e corrige o nome de quem falou. '
   'Não dá acesso ao texto: ler é transcricao:ler.',
   false)
ON CONFLICT (key) DO NOTHING;

-- Quem já alcança documento do projeto alcança a transcrição: ela é mais um documento
-- daquele projeto, e quem participou da reunião é quem pede o texto dela.
-- Mudar isso é toggle de perfil (ADR-0027), não migration nova.
INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, c.capability, true
FROM public.role_capabilities rc
CROSS JOIN (VALUES ('transcricao:ler'), ('transcricao:solicitar')) AS c(capability)
WHERE rc.capability = 'arquivo-projeto:ler' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, c.capability
FROM public.default_role_capabilities drc
CROSS JOIN (VALUES ('transcricao:ler'), ('transcricao:solicitar')) AS c(capability)
WHERE drc.capability = 'arquivo-projeto:ler'
ON CONFLICT (role_name, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, c.capability, o.enabled,
       'espelhamento de arquivo-projeto:ler (transcrição de reunião, 24/09/2026)'
FROM public.user_capability_overrides o
CROSS JOIN (VALUES ('transcricao:ler'), ('transcricao:solicitar')) AS c(capability)
WHERE o.capability = 'arquivo-projeto:ler'
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

-- ─── Estado do trabalho ──────────────────────────────────────────────────────
-- 'falhou' é estado final com `last_error` preenchido: o worker desiste depois das
-- tentativas e a pessoa vê o motivo. URL expirada cai aqui e volta para 'pendente' só
-- quando alguém com o token do Graph gerar outra.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_transcription_status') THEN
    CREATE TYPE public.meeting_transcription_status AS ENUM (
      'pendente', 'processando', 'concluida', 'falhou'
    );
  END IF;
END $$;

-- ─── A reunião transcrita ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_transcriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Identidade da reunião entre caixas de correio (ADR-0011). NULL quando a gravação não
  -- veio de evento conhecido — aí o projeto foi escolhido por pessoa, nunca inferido do
  -- conteúdo da conversa (ADR-0039).
  ical_uid      text,
  event_subject text NOT NULL,
  occurred_at   timestamptz,

  -- Ponteiro para a gravação no OneDrive. Nunca copiada para cá.
  recording_drive_id text NOT NULL,
  recording_item_id  text NOT NULL,

  status      public.meeting_transcription_status NOT NULL DEFAULT 'pendente',
  attempts    integer NOT NULL DEFAULT 0,
  last_error  text,
  -- Quem pegou o trabalho, para diagnosticar job preso sem precisar entrar na VM.
  claimed_by  text,
  claimed_at  timestamptz,
  finished_at timestamptz,

  language         text,
  duration_seconds integer,
  transcript_text  text,
  -- Falas com início, fim e rótulo de voz, como o WhisperX devolve.
  segments         jsonb,
  -- Mapa 'SPEAKER_00' -> pessoa. O WhisperX separa vozes mas não sabe nomes (ADR-0039);
  -- o nome entra por confirmação de quem participou, nunca por adivinhação automática.
  speakers         jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Ponteiro para o arquivo de transcrição publicado na pasta do projeto.
  output_drive_id text,
  output_item_id  text,

  requested_by uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Mesma gravação não vira duas transcrições: reenfileirar reaproveita a linha, e dois
  -- cliques no botão não geram trabalho duplicado na VM.
  CONSTRAINT meeting_transcriptions_unique_recording
    UNIQUE (tenant_id, recording_item_id),

  -- Meio ponteiro quebra a chamada ao Graph longe da origem do erro — mesmo motivo do
  -- CHECK projects_onedrive_root_complete.
  CONSTRAINT meeting_transcriptions_output_complete CHECK (
    (output_drive_id IS NULL) = (output_item_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS meeting_transcriptions_project_idx
  ON public.meeting_transcriptions (project_id, created_at DESC);

-- A fila. Índice parcial: só a cauda pendente interessa ao worker.
CREATE INDEX IF NOT EXISTS meeting_transcriptions_queue_idx
  ON public.meeting_transcriptions (created_at)
  WHERE status = 'pendente';

COMMENT ON TABLE public.meeting_transcriptions IS
  'Reunião gravada no Teams e transcrita por worker próprio (ADR-0039). Guarda ponteiro '
  'para a gravação no OneDrive, o texto resultante e o estado do trabalho — esta tabela é '
  'a própria fila.';
COMMENT ON COLUMN public.meeting_transcriptions.speakers IS
  'Mapa de voz para pessoa, confirmado por quem participou. O WhisperX entrega SPEAKER_00 '
  'e não sabe nomes; ligar voz a pessoa por inferência produz registro errado com cara de '
  'oficial (ADR-0039).';

DROP TRIGGER IF EXISTS meeting_transcriptions_set_updated_at ON public.meeting_transcriptions;
CREATE TRIGGER meeting_transcriptions_set_updated_at
  BEFORE UPDATE ON public.meeting_transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── O segredo: URL pré-autenticada da gravação ──────────────────────────────
-- Tabela à parte porque RLS é por linha, não por coluna: deixar a URL em
-- meeting_transcriptions daria a gravação inteira a quem pode ver o status do job.
CREATE TABLE IF NOT EXISTS public.meeting_transcription_sources (
  transcription_id uuid PRIMARY KEY
    REFERENCES public.meeting_transcriptions(id) ON DELETE CASCADE,
  -- Vem de @microsoft.graph.downloadUrl, resolvida com o token DELEGADO de quem pediu.
  -- Vale por si só: quem tem a string baixa o arquivo. Nunca em log, nunca no cliente.
  download_url text NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.meeting_transcription_sources IS
  'URL pré-autenticada da gravação, de validade curta. SEM POLICY POR DECISÃO: só service '
  'role alcança (Edge Function grava, worker lê). É o que permite o worker baixar sem '
  'receber credencial do Graph — ver ADR-0039.';

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.meeting_transcriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_transcriptions_select" ON public.meeting_transcriptions;
DROP POLICY IF EXISTS "meeting_transcriptions_insert" ON public.meeting_transcriptions;
DROP POLICY IF EXISTS "meeting_transcriptions_update" ON public.meeting_transcriptions;
DROP POLICY IF EXISTS "meeting_transcriptions_delete" ON public.meeting_transcriptions;

-- Capacidade E alcance ao projeto. A capacidade responde "esse perfil lê transcrição?";
-- can_view_project_document responde "desse projeto?".
CREATE POLICY "meeting_transcriptions_select"
ON public.meeting_transcriptions FOR SELECT TO authenticated
USING (
  public.has_capability(auth.uid(), tenant_id, 'transcricao:ler')
  AND public.can_view_project_document(auth.uid(), project_id)
);

CREATE POLICY "meeting_transcriptions_insert"
ON public.meeting_transcriptions FOR INSERT TO authenticated
WITH CHECK (
  public.has_capability(auth.uid(), tenant_id, 'transcricao:solicitar')
  AND public.can_view_project_document(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

-- Corrigir o mapa de falantes e reenfileirar. O worker não passa por aqui: escreve
-- resultado com service role.
CREATE POLICY "meeting_transcriptions_update"
ON public.meeting_transcriptions FOR UPDATE TO authenticated
USING (
  public.has_capability(auth.uid(), tenant_id, 'transcricao:solicitar')
  AND public.can_view_project_document(auth.uid(), project_id)
)
WITH CHECK (
  public.has_capability(auth.uid(), tenant_id, 'transcricao:solicitar')
  AND public.can_view_project_document(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

-- Apagar é mais restrito que pedir: a transcrição costuma ser o único registro que sobra
-- da reunião depois que o Teams expira a gravação (ADR-0039).
CREATE POLICY "meeting_transcriptions_delete"
ON public.meeting_transcriptions FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

-- Nenhuma policy aqui, de propósito: ver COMMENT da tabela.
ALTER TABLE public.meeting_transcription_sources ENABLE ROW LEVEL SECURITY;
