-- Reversão de 20261022140000_reunioes_resumo_e_previa.sql.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.
-- ATENÇÃO: apaga os resumos e as notas que a equipe trouxe. Exportar antes, se forem usados.
DROP POLICY IF EXISTS "project_online_meetings_update_notes" ON public.project_online_meetings;
REVOKE UPDATE (notes) ON public.project_online_meetings FROM authenticated;
DROP TRIGGER IF EXISTS project_online_meetings_notes_stamp ON public.project_online_meetings;
DROP FUNCTION IF EXISTS public.project_online_meetings_notes_stamp();
DROP TRIGGER IF EXISTS meeting_transcriptions_derive ON public.meeting_transcriptions;
DROP FUNCTION IF EXISTS public.meeting_transcriptions_derive();

ALTER TABLE public.project_online_meetings
  DROP CONSTRAINT IF EXISTS project_online_meetings_notes_size,
  DROP COLUMN IF EXISTS notes_updated_by,
  DROP COLUMN IF EXISTS notes_updated_at,
  DROP COLUMN IF EXISTS notes;

ALTER TABLE public.meeting_transcriptions
  DROP CONSTRAINT IF EXISTS meeting_transcriptions_summary_size,
  DROP COLUMN IF EXISTS preview,
  DROP COLUMN IF EXISTS participants,
  DROP COLUMN IF EXISTS summary_updated_by,
  DROP COLUMN IF EXISTS summary_updated_at,
  DROP COLUMN IF EXISTS summary;
