-- Adiciona responsável pela vaga (gerente ou admin do tenant)
ALTER TABLE public.job_openings
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_openings_responsavel
  ON public.job_openings (responsavel_id);
