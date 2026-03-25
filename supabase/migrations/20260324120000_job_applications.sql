-- Tabela de candidaturas para vagas (formulário público)
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  linkedin text,
  motivacao text NOT NULL,
  curriculo_url text,
  curriculo_nome text,
  status text NOT NULL DEFAULT 'triagem',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (incluindo anônimo) pode submeter candidatura
CREATE POLICY "Anyone can submit a job application"
  ON public.job_applications FOR INSERT
  WITH CHECK (true);

-- Apenas membros do tenant podem visualizar candidaturas
CREATE POLICY "Tenant members can view job applications"
  ON public.job_applications FOR SELECT
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Tenant members podem atualizar status de candidaturas
CREATE POLICY "Tenant members can update job applications"
  ON public.job_applications FOR UPDATE
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Bucket para armazenar currículos enviados
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculos', 'curriculos', false)
ON CONFLICT (id) DO NOTHING;

-- Qualquer pessoa pode fazer upload de currículo (anon)
CREATE POLICY "Anyone can upload curriculo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'curriculos');

-- Apenas usuários autenticados podem ler currículos
CREATE POLICY "Authenticated users can read curriculos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'curriculos'
    AND auth.role() = 'authenticated'
  );

CREATE INDEX IF NOT EXISTS idx_job_applications_tenant_created
  ON public.job_applications (tenant_id, created_at DESC);
