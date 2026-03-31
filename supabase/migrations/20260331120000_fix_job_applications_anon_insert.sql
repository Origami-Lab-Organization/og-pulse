-- Garante que o role anon tem permissão de INSERT na tabela job_applications
-- (necessário para o formulário público de candidatura funcionar sem autenticação)
GRANT INSERT ON public.job_applications TO anon;

-- Recria a policy de INSERT caso tenha sido removida ou não aplicada
DROP POLICY IF EXISTS "Anyone can submit a job application" ON public.job_applications;

CREATE POLICY "Anyone can submit a job application"
  ON public.job_applications FOR INSERT
  WITH CHECK (true);
