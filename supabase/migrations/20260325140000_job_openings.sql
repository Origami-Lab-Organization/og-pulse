-- Tabela de vagas em aberto para candidaturas internas e externas
CREATE TABLE public.job_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  area text NOT NULL,
  regime_contratacao text NOT NULL CHECK (regime_contratacao IN ('clt', 'pj', 'estagio')),
  modalidade text NOT NULL CHECK (modalidade IN ('presencial', 'hibrido', 'remoto')),
  localizacao text,
  salario_de numeric,
  salario_ate numeric,
  nao_divulgar_salario boolean NOT NULL DEFAULT false,
  beneficios text,
  sobre_a_vaga text NOT NULL,
  senioridade text,
  responsabilidades text NOT NULL,
  requisitos_obrigatorios text NOT NULL,
  diferenciais text,
  sobre_empresa text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('aberta', 'rascunho', 'encerrada')),
  prazo_candidaturas date,
  public_url text,
  created_by uuid REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

-- Membros do tenant podem visualizar vagas
CREATE POLICY "Tenant members can view job openings"
  ON public.job_openings FOR SELECT
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Membros do tenant podem criar vagas
CREATE POLICY "Tenant members can create job openings"
  ON public.job_openings FOR INSERT
  WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Membros do tenant podem atualizar vagas
CREATE POLICY "Tenant members can update job openings"
  ON public.job_openings FOR UPDATE
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Membros do tenant podem remover vagas
CREATE POLICY "Tenant members can delete job openings"
  ON public.job_openings FOR DELETE
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE INDEX IF NOT EXISTS idx_job_openings_tenant_status
  ON public.job_openings (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_job_openings_tenant_created
  ON public.job_openings (tenant_id, created_at DESC);
