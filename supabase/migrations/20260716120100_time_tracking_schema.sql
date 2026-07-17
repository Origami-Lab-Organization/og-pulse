-- Módulo Jornada/Ponto — Fase 1: fundação de dados + registro de ponto.
-- Reaproveita employees.jornada_diaria (já existente) como carga horária de
-- referência. Sem hierarquia de gestor: aprovações (Fase 3) ficam só com o
-- admin, conforme decisão registrada no plano.

-- ─── Tipos ────────────────────────────────────────────────────────────────
CREATE TYPE public.time_entry_type AS ENUM (
  'entrada',
  'inicio_intervalo',
  'fim_intervalo',
  'saida'
);

-- ─── Configurações por tenant ───────────────────────────────────────────────
CREATE TABLE public.time_tracking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tolerancia_entrada_minutos INTEGER NOT NULL DEFAULT 10,
  tolerancia_saida_minutos INTEGER NOT NULL DEFAULT 10,
  intervalo_minimo_minutos INTEGER NOT NULL DEFAULT 60,
  limite_horas_extras_diarias NUMERIC(5,2) NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE TRIGGER update_time_tracking_settings_updated_at
BEFORE UPDATE ON public.time_tracking_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Marcações de ponto (log imutável) ─────────────────────────────────────
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo public.time_entry_type NOT NULL,
  horario TIMESTAMPTZ NOT NULL DEFAULT now(),
  origem TEXT NOT NULL DEFAULT 'web' CHECK (origem IN ('web', 'pwa')),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  ip_address TEXT,
  user_agent TEXT,
  is_ajuste BOOLEAN NOT NULL DEFAULT false,
  ajuste_de_id UUID REFERENCES public.time_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_tenant_id ON public.time_entries(tenant_id);
CREATE INDEX idx_time_entries_employee_horario ON public.time_entries(employee_id, horario);

-- ─── Resumo diário calculado ────────────────────────────────────────────────
CREATE TABLE public.time_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horas_trabalhadas NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_previstas NUMERIC(6,2) NOT NULL DEFAULT 0,
  saldo_dia NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_extras NUMERIC(6,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'incompleto' CHECK (status IN ('normal', 'atraso', 'falta', 'incompleto')),
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, data)
);

CREATE INDEX idx_time_daily_summary_tenant_id ON public.time_daily_summary(tenant_id);

-- ─── Banco de horas ─────────────────────────────────────────────────────────
CREATE TABLE public.time_bank_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  horas NUMERIC(6,2) NOT NULL,
  saldo_acumulado NUMERIC(8,2) NOT NULL,
  origem TEXT NOT NULL DEFAULT 'calculo_diario',
  referencia_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_bank_ledger_employee_data ON public.time_bank_ledger(employee_id, data DESC);

-- ─── Auditoria do módulo ────────────────────────────────────────────────────
CREATE TABLE public.time_tracking_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_tracking_audit_log_tenant_id ON public.time_tracking_audit_log(tenant_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.time_tracking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_bank_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_audit_log ENABLE ROW LEVEL SECURITY;

-- Settings: leitura para todo o tenant, escrita só admin.
CREATE POLICY "time_tracking_settings_select_tenant"
ON public.time_tracking_settings FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "time_tracking_settings_write_admin"
ON public.time_tracking_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'))
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'));

-- Marcações: colaborador vê só as próprias; admin/rh veem todo o tenant.
-- Sem policy de INSERT/UPDATE/DELETE para authenticated — toda escrita passa
-- pela Edge Function record-time-punch (service role), que valida sequência,
-- resolve employee_id pelo auth_id e não confia em payload do cliente para
-- employee_id/tenant_id.
CREATE POLICY "time_entries_select"
ON public.time_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = time_entries.employee_id AND e.auth_id = auth.uid()
  )
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

-- Resumo diário e banco de horas: só leitura via API (escrita apenas pela
-- função SECURITY DEFINER recompute_daily_summary).
CREATE POLICY "time_daily_summary_select"
ON public.time_daily_summary FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = time_daily_summary.employee_id AND e.auth_id = auth.uid()
  )
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

CREATE POLICY "time_bank_ledger_select"
ON public.time_bank_ledger FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = time_bank_ledger.employee_id AND e.auth_id = auth.uid()
  )
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

-- Auditoria: só admin/rh consultam; sem INSERT direto pelo cliente.
CREATE POLICY "time_tracking_audit_log_select_admin_rh"
ON public.time_tracking_audit_log FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

-- ─── Fechamento diário (SECURITY DEFINER, chamada pela Edge Function) ──────
CREATE OR REPLACE FUNCTION public.recompute_daily_summary(p_employee_id UUID, p_data DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_jornada_diaria NUMERIC;
  v_horas_trabalhadas NUMERIC := 0;
  v_intervalo_horas NUMERIC := 0;
  v_saldo_anterior NUMERIC := 0;
  v_saldo_dia NUMERIC;
  v_horas_extras NUMERIC;
  v_status TEXT;
  v_entrada TIMESTAMPTZ;
  v_inicio_intervalo TIMESTAMPTZ;
  v_fim_intervalo TIMESTAMPTZ;
  v_saida TIMESTAMPTZ;
  v_summary_id UUID;
BEGIN
  SELECT e.tenant_id, e.jornada_diaria
  INTO v_tenant_id, v_jornada_diaria
  FROM public.employees e
  WHERE e.id = p_employee_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    MIN(horario) FILTER (WHERE tipo = 'entrada'),
    MIN(horario) FILTER (WHERE tipo = 'inicio_intervalo'),
    MAX(horario) FILTER (WHERE tipo = 'fim_intervalo'),
    MAX(horario) FILTER (WHERE tipo = 'saida')
  INTO v_entrada, v_inicio_intervalo, v_fim_intervalo, v_saida
  FROM public.time_entries
  WHERE employee_id = p_employee_id AND horario::date = p_data;

  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_trabalhadas := EXTRACT(EPOCH FROM (v_saida - v_entrada)) / 3600.0;
    IF v_inicio_intervalo IS NOT NULL AND v_fim_intervalo IS NOT NULL THEN
      v_intervalo_horas := EXTRACT(EPOCH FROM (v_fim_intervalo - v_inicio_intervalo)) / 3600.0;
      v_horas_trabalhadas := v_horas_trabalhadas - v_intervalo_horas;
    END IF;
    v_status := 'normal';
  ELSIF v_entrada IS NOT NULL THEN
    v_status := 'incompleto';
  ELSE
    v_status := 'falta';
  END IF;

  v_horas_trabalhadas := GREATEST(v_horas_trabalhadas, 0);
  v_saldo_dia := v_horas_trabalhadas - COALESCE(v_jornada_diaria, 0);
  v_horas_extras := GREATEST(v_saldo_dia, 0);

  INSERT INTO public.time_daily_summary (
    tenant_id, employee_id, data, horas_trabalhadas, horas_previstas,
    saldo_dia, horas_extras, status, calculado_em
  )
  VALUES (
    v_tenant_id, p_employee_id, p_data, v_horas_trabalhadas, COALESCE(v_jornada_diaria, 0),
    v_saldo_dia, v_horas_extras, v_status, now()
  )
  ON CONFLICT (employee_id, data) DO UPDATE SET
    horas_trabalhadas = EXCLUDED.horas_trabalhadas,
    horas_previstas = EXCLUDED.horas_previstas,
    saldo_dia = EXCLUDED.saldo_dia,
    horas_extras = EXCLUDED.horas_extras,
    status = EXCLUDED.status,
    calculado_em = now()
  RETURNING id INTO v_summary_id;

  -- Só lança banco de horas quando o dia está fechado (entrada + saída).
  IF v_status = 'normal' THEN
    SELECT COALESCE(saldo_acumulado, 0)
    INTO v_saldo_anterior
    FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data < p_data
    ORDER BY data DESC, created_at DESC
    LIMIT 1;

    DELETE FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data = p_data AND origem = 'calculo_diario';

    INSERT INTO public.time_bank_ledger (
      tenant_id, employee_id, data, tipo, horas, saldo_acumulado, origem, referencia_id
    )
    VALUES (
      v_tenant_id, p_employee_id, p_data,
      CASE WHEN v_saldo_dia >= 0 THEN 'credito' ELSE 'debito' END,
      v_saldo_dia, v_saldo_anterior + v_saldo_dia, 'calculo_diario', v_summary_id
    );
  END IF;
END;
$$;

COMMENT ON TABLE public.time_entries IS 'Log imutável de marcações de ponto (entrada/intervalo/saída). Escrita só via Edge Function record-time-punch.';
COMMENT ON TABLE public.time_daily_summary IS 'Resumo diário calculado (horas trabalhadas, saldo, extras) — escrita só via recompute_daily_summary.';
COMMENT ON TABLE public.time_bank_ledger IS 'Ledger de banco de horas com saldo acumulado por lançamento.';
COMMENT ON TABLE public.time_tracking_audit_log IS 'Auditoria do módulo de jornada/ponto — eventos de marcação e configuração.';
