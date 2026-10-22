-- Reversão de 20261021200000_meeting_transcriptions.sql (ADR-0039).
--
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.
--
-- ATENÇÃO: derruba as transcrições já feitas junto com as tabelas. Depois que o Teams
-- expira a gravação, esse texto é o único registro que sobrou da reunião — exportar antes
-- de rodar isto em produção. As notificações já enviadas ficam no sino de quem recebeu.
select cron.unschedule('teams-transcripts-sync-10min')
 where exists (select 1 from cron.job where jobname = 'teams-transcripts-sync-10min');

DROP TABLE IF EXISTS public.project_online_meetings;
DROP TABLE IF EXISTS public.meeting_transcription_sources;
DROP TABLE IF EXISTS public.meeting_transcriptions;
DROP FUNCTION IF EXISTS public.project_online_meetings_guard();
DROP FUNCTION IF EXISTS public.notify_meeting_transcription_finished();
DROP FUNCTION IF EXISTS public.meeting_transcriptions_guard();
DROP FUNCTION IF EXISTS public.can_request_meeting_transcription(uuid, uuid);
DROP FUNCTION IF EXISTS public.transcription_readable_project_ids();
DROP TYPE IF EXISTS public.meeting_transcription_source;
DROP TYPE IF EXISTS public.meeting_transcription_status;

ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

DELETE FROM public.user_capability_overrides
 WHERE capability IN ('transcricao:ler', 'transcricao:solicitar');
DELETE FROM public.role_capabilities
 WHERE capability IN ('transcricao:ler', 'transcricao:solicitar');
DELETE FROM public.default_role_capabilities
 WHERE capability IN ('transcricao:ler', 'transcricao:solicitar');
DELETE FROM public.capabilities
 WHERE key IN ('transcricao:ler', 'transcricao:solicitar');

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;
