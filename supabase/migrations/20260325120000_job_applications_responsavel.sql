-- Adiciona campo de responsável para candidaturas
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
