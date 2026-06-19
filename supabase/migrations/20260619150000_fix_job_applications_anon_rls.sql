-- Garante que o role anon pode inserir candidaturas (formulário público sem auth)
-- Re-aplica grant e policy de forma idempotente, pois o banco pode ter ficado
-- desincronizado com as migrations anteriores.

GRANT INSERT ON public.job_applications TO anon;

DROP POLICY IF EXISTS "Anyone can submit a job application" ON public.job_applications;

CREATE POLICY "Anyone can submit a job application"
  ON public.job_applications FOR INSERT
  WITH CHECK (true);
