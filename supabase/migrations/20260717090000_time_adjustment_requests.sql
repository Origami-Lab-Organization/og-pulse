-- Módulo Jornada/Ponto — Fase 3: solicitação de ajuste de ponto e de hora extra,
-- com decisão exclusiva do administrador (sem etapa de gestor — ver ADR-0008).

CREATE TABLE public.time_adjustment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ajuste_ponto', 'hora_extra')),
  data_referencia DATE NOT NULL,
  tipo_marcacao public.time_entry_type,
  horario_solicitado TIMESTAMPTZ,
  entry_id_original UUID REFERENCES public.time_entries(id),
  horas_solicitadas NUMERIC(6,2),
  motivo TEXT NOT NULL,
  anexo_path TEXT,
  anexo_nome TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  decidido_por UUID REFERENCES public.employees(id),
  decidido_em TIMESTAMPTZ,
  motivo_decisao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_adjustment_requests_tenant_id ON public.time_adjustment_requests(tenant_id);
CREATE INDEX idx_time_adjustment_requests_employee_id ON public.time_adjustment_requests(employee_id);
CREATE INDEX idx_time_adjustment_requests_status ON public.time_adjustment_requests(status);

ALTER TABLE public.time_adjustment_requests ENABLE ROW LEVEL SECURITY;

-- Colaborador vê só as próprias solicitações; admin/rh veem todo o tenant.
-- Sem policy de INSERT/UPDATE para authenticated — toda escrita passa pelas
-- Edge Functions submit-time-adjustment e decide-time-adjustment (service role),
-- que validam período fechado, resolvem employee_id pelo auth_id e aplicam a
-- decisão de forma consistente (sem confiar em payload do cliente para status).
CREATE POLICY "time_adjustment_requests_select"
ON public.time_adjustment_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = time_adjustment_requests.employee_id AND e.auth_id = auth.uid()
  )
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

COMMENT ON TABLE public.time_adjustment_requests IS 'Solicitações de ajuste de ponto e de hora extra, decididas só pelo admin (sem etapa de gestor).';
