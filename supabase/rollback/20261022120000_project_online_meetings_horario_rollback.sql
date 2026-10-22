-- Reversão de 20261022120000_project_online_meetings_horario.sql.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.
ALTER TABLE public.project_online_meetings
  DROP CONSTRAINT IF EXISTS project_online_meetings_horario_valido,
  DROP COLUMN IF EXISTS is_series,
  DROP COLUMN IF EXISTS ends_at,
  DROP COLUMN IF EXISTS starts_at;
