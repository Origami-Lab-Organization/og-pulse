-- Reversão de 20260924120000_meeting_transcriptions.sql (ADR-0039).
--
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.
--
-- ATENÇÃO: derruba as transcrições já feitas junto com as tabelas. Depois que o Teams
-- expira a gravação, esse texto é o único registro que sobrou da reunião — exportar antes
-- de rodar isto em produção.

DROP TABLE IF EXISTS public.meeting_transcription_sources;
DROP TABLE IF EXISTS public.meeting_transcriptions;

DROP TYPE IF EXISTS public.meeting_transcription_status;

DELETE FROM public.user_capability_overrides
  WHERE capability IN ('transcricao:ler', 'transcricao:solicitar');
DELETE FROM public.default_role_capabilities
  WHERE capability IN ('transcricao:ler', 'transcricao:solicitar');
DELETE FROM public.role_capabilities
  WHERE capability IN ('transcricao:ler', 'transcricao:solicitar');
DELETE FROM public.capabilities
  WHERE key IN ('transcricao:ler', 'transcricao:solicitar');
