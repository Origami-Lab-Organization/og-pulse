-- Módulo Jornada/Ponto — selfie opcional no registro de ponto (item de roadmap
-- do ADR-0008). Sem reconhecimento facial: só registro visual da marcação.

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS selfie_path TEXT;

ALTER TABLE public.time_tracking_settings
  ADD COLUMN IF NOT EXISTS exigir_selfie BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.time_entries.selfie_path IS 'Path no bucket time-punch-selfies com a foto capturada na marcação (opcional).';
COMMENT ON COLUMN public.time_tracking_settings.exigir_selfie IS 'Quando true, a UI exige a captura de selfie antes de confirmar a marcação (soft — falha de câmera não bloqueia o registro).';
