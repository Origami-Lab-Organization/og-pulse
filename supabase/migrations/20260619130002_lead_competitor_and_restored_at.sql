-- GP-J7: arquivamento/exclusão de oportunidades.
-- competitor_name (CA-01/CA-06): concorrente quando archive_reason = 'competitor'; alimenta GP-J11.
-- restored_at (CA-04): timestamp da última restauração; badge "Reativada" 48h derivado em runtime.
-- Colunas nullable herdam as RLS policies existentes de `leads`.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS competitor_name TEXT,
  ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ;

COMMENT ON COLUMN public.leads.competitor_name IS
  'Concorrente que venceu a oportunidade. Preenchido apenas quando archive_reason = ''competitor'' (GP-J7). NULL caso contrário.';
COMMENT ON COLUMN public.leads.restored_at IS
  'Momento da última restauração (unarchive). Setado no unarchive, NULL no arquivamento. Badge "Reativada" 48h derivado em runtime.';
