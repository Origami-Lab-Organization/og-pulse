-- Horário da reunião do Teams vinculada ao projeto (22/10/2026, ADR-0052).
--
-- A aba Reuniões passou a listar as reuniões vinculadas com a situação da transcrição de
-- cada uma — agendada, aguardando, transcrita ou sem transcrição. Sem o horário, uma reunião
-- que aconteceu e não foi transcrita parecia não ter acontecido.
--
-- Vem de quem vincula (a Agenda conhece o evento). Numa série recorrente é o horário da
-- ocorrência usada para vincular; `is_series` diz que haverá outras. Vínculos anteriores a
-- esta migration ficam sem horário e a tela os mostra só pela transcrição.
--
-- Rollback: supabase/rollback/20261022120000_project_online_meetings_horario_rollback.sql

ALTER TABLE public.project_online_meetings
  ADD COLUMN starts_at timestamptz,
  ADD COLUMN ends_at   timestamptz,
  ADD COLUMN is_series boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT project_online_meetings_horario_valido
    CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at);

COMMENT ON COLUMN public.project_online_meetings.starts_at IS
  'Início da reunião (numa série, da ocorrência usada para vincular). Diz à tela se ela já aconteceu.';
COMMENT ON COLUMN public.project_online_meetings.is_series IS
  'Reunião recorrente: cada ocorrência transcrita chega como uma transcrição própria.';
