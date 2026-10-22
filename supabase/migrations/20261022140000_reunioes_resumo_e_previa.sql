-- Resumo e notas por reunião, e prévia no cartão da aba Reuniões (22/10/2026, ADR-0052).
--
-- Pedido do Italo: "em cada reunião, quero poder editar e colocar notas/resumo — o pessoal
-- gera com a IA deles e sobe". O Pulse não resume nada: guarda o resumo que a equipe trouxe e
-- diz quem trouxe e quando.
--
--   * `meeting_transcriptions.summary`: resumo da reunião transcrita (uma ocorrência).
--   * `project_online_meetings.notes`: notas da reunião vinculada que ainda não tem
--     transcrição — pauta antes, ata manual se o Teams não transcreveu.
--   * `participants` e `preview`: quem falou e as primeiras falas, para o cartão reconhecer a
--     reunião sem abrir. Derivados das falas por trigger, nos dois caminhos (Teams e gravação),
--     e recalculados a cada escrita — o cliente não consegue forjar.
--
-- Quem edita: a mesma regra de pedir transcrição (`can_request_meeting_transcription`). Quem
-- e quando ficam gravados pelo trigger, nunca pelo cliente.
--
-- Rollback: supabase/rollback/20261022140000_reunioes_resumo_e_previa_rollback.sql

-- ── 1. Colunas ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.meeting_transcriptions
  ADD COLUMN summary            text,
  ADD COLUMN summary_updated_at timestamptz,
  ADD COLUMN summary_updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN participants       text[] NOT NULL DEFAULT '{}',
  ADD COLUMN preview            text,
  ADD CONSTRAINT meeting_transcriptions_summary_size
    CHECK (summary IS NULL OR char_length(summary) <= 50000);

ALTER TABLE public.project_online_meetings
  ADD COLUMN notes            text,
  ADD COLUMN notes_updated_at timestamptz,
  ADD COLUMN notes_updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD CONSTRAINT project_online_meetings_notes_size
    CHECK (notes IS NULL OR char_length(notes) <= 50000);

COMMENT ON COLUMN public.meeting_transcriptions.summary IS
  'Resumo trazido pela equipe (gerado na IA de cada um e colado ou importado). O Pulse não resume.';
COMMENT ON COLUMN public.meeting_transcriptions.participants IS
  'Quem falou, derivado das falas por trigger. No Teams são nomes; na gravação, rótulos SPEAKER_NN.';

-- ── 2. Prévia, participantes e autoria do resumo ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.meeting_transcriptions_derive()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_segments jsonb := coalesce(NEW.segments, '[]'::jsonb);
BEGIN
  NEW.participants := coalesce((
    SELECT array_agg(DISTINCT s->>'speaker' ORDER BY s->>'speaker')
    FROM jsonb_array_elements(v_segments) AS s
    WHERE coalesce(btrim(s->>'speaker'), '') <> ''
  ), '{}');

  NEW.preview := coalesce((
    SELECT left(string_agg(f.texto, ' ' ORDER BY f.ordem), 280)
    FROM (
      SELECT btrim(e.s->>'text') AS texto, e.ordem
      FROM jsonb_array_elements(v_segments) WITH ORDINALITY AS e(s, ordem)
      WHERE coalesce(btrim(e.s->>'text'), '') <> ''
      ORDER BY e.ordem
      LIMIT 4
    ) AS f
  ), left(NEW.transcript_text, 280));

  -- Autoria do resumo: só muda quando o resumo muda, e quem escreve é quem está logado.
  IF NEW.summary IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.summary END) THEN
    NEW.summary_updated_at := now();
    NEW.summary_updated_by := public.employee_id_for(auth.uid(), NEW.tenant_id);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.summary_updated_at := OLD.summary_updated_at;
    NEW.summary_updated_by := OLD.summary_updated_by;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.meeting_transcriptions_derive() IS
  'Deriva participantes e prévia das falas e carimba a autoria do resumo. Recalcula a cada '
  'escrita para o cliente não forjar. ADR-0052.';

-- Roda antes do guard (ordem alfabética dos triggers BEFORE): o guard não compara estas colunas.
CREATE TRIGGER meeting_transcriptions_derive
  BEFORE INSERT OR UPDATE ON public.meeting_transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_transcriptions_derive();

-- Transcrições que já existem ganham participantes e prévia.
UPDATE public.meeting_transcriptions SET segments = segments;

CREATE OR REPLACE FUNCTION public.project_online_meetings_notes_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    NEW.notes_updated_at := now();
    NEW.notes_updated_by := public.employee_id_for(auth.uid(), NEW.tenant_id);
  ELSE
    NEW.notes_updated_at := OLD.notes_updated_at;
    NEW.notes_updated_by := OLD.notes_updated_by;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_online_meetings_notes_stamp
  BEFORE UPDATE ON public.project_online_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.project_online_meetings_notes_stamp();

-- ── 3. Quem edita ────────────────────────────────────────────────────────────────────────

-- `meeting_transcriptions`: a policy de UPDATE já é `can_request_meeting_transcription`, e o
-- guard só compara as colunas do resultado — o resumo fica liberado sem mexer nele.

-- `project_online_meetings`: até aqui só a service role escrevia. Pela tela, só as notas: o
-- GRANT por coluna impede mexer no organizador ou na reunião vinculada.
GRANT UPDATE (notes) ON public.project_online_meetings TO authenticated;

CREATE POLICY "project_online_meetings_update_notes" ON public.project_online_meetings
  FOR UPDATE TO authenticated
  USING (public.can_request_meeting_transcription(auth.uid(), project_id))
  WITH CHECK (public.can_request_meeting_transcription(auth.uid(), project_id));
