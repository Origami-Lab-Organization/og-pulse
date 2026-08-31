-- GP-J5 (CA-01): garante a tabela lead_follow_ups neste banco.
-- A tabela estava ausente (PGRST205) e as migrations antigas (20260316140000 / 20260319100000)
-- usavam coluna de RLS errada (employees.user_id, que não existe — é auth_id).
-- Esta migration é idempotente e corrige a RLS via helper SECURITY DEFINER do projeto.

CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES employees(id),
  description TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  notified BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES employees(id),
  completed_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Caso a tabela já exista sem completed_by
ALTER TABLE lead_follow_ups ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_lead_id ON lead_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_tenant_id ON lead_follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_assigned_to ON lead_follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_scheduled_at ON lead_follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_status ON lead_follow_ups(status);

ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view follow-ups for their tenant" ON lead_follow_ups;
CREATE POLICY "Users can view follow-ups for their tenant"
  ON lead_follow_ups FOR SELECT
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can insert follow-ups for their tenant" ON lead_follow_ups;
CREATE POLICY "Users can insert follow-ups for their tenant"
  ON lead_follow_ups FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can update follow-ups for their tenant" ON lead_follow_ups;
CREATE POLICY "Users can update follow-ups for their tenant"
  ON lead_follow_ups FOR UPDATE
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Users can delete follow-ups for their tenant" ON lead_follow_ups;
CREATE POLICY "Users can delete follow-ups for their tenant"
  ON lead_follow_ups FOR DELETE
  USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

COMMENT ON TABLE lead_follow_ups IS 'Ações de follow-up agendadas para oportunidades; alimenta o indicador de vencido no Pipeline (GP-J5)';

-- Força o PostgREST a recarregar o schema cache (resolve o PGRST205 imediatamente)
NOTIFY pgrst, 'reload schema';
