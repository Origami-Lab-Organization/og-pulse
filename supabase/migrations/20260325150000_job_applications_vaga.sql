-- Adiciona referência de vaga às candidaturas
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS vaga_id uuid REFERENCES public.job_openings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vaga_titulo text;

-- Permite leitura anônima de vagas abertas (formulário público por link)
CREATE POLICY "Anyone can view open job openings"
  ON public.job_openings FOR SELECT
  USING (status = 'aberta');

CREATE INDEX IF NOT EXISTS idx_job_applications_vaga
  ON public.job_applications (vaga_id);
