-- ==== allocation margin simulation ====
ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS margin_tolerance_pp numeric NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.financial_settings.margin_tolerance_pp IS
  'Tolerância (em pontos percentuais) que o veredito de impacto na margem usa como faixa em torno da baseline. Default 3pp.';

CREATE OR REPLACE FUNCTION public.simulate_allocation_margin_impact(
  p_project_id uuid,
  p_employee_id uuid,
  p_months jsonb
)
RETURNS TABLE (
  custo_estimado numeric, horas_total numeric, custo_hora_medio numeric,
  margem_atual numeric, margem_simulada numeric, margem_baseline numeric,
  delta_pp numeric, tol_pp numeric, verdict text, has_baseline boolean, is_non_revenue boolean
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_tenant_id uuid; v_revenue numeric; v_budget_id uuid;
  v_taxes_pct numeric; v_commission_pct numeric; v_tol numeric;
  v_taxes numeric; v_commissions numeric; v_other numeric := 0;
  v_current_labor numeric := 0; v_baseline_labor numeric := 0;
  v_est numeric := 0; v_hours numeric := 0;
  v_has_baseline boolean := false; v_is_non_revenue boolean := false;
  v_margem_atual numeric; v_margem_simulada numeric; v_margem_baseline numeric;
  v_delta numeric; v_verdict text;
BEGIN
  SELECT p.tenant_id, COALESCE(p.total_value, 0), p.budget_id
  INTO v_tenant_id, v_revenue, v_budget_id
  FROM public.projects p WHERE p.id = p_project_id;

  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Projeto não encontrado'; END IF;
  IF NOT (public.has_role(auth.uid(), v_tenant_id, 'admin')
          OR public.can_manage_project(auth.uid(), p_project_id)) THEN
    RAISE EXCEPTION 'Sem permissão para simular impacto na margem deste projeto';
  END IF;

  SELECT fs.taxes_percent, fs.commission_percent, fs.margin_tolerance_pp
  INTO v_taxes_pct, v_commission_pct, v_tol
  FROM public.financial_settings fs WHERE fs.tenant_id = v_tenant_id;

  v_taxes_pct := COALESCE(v_taxes_pct, 0);
  v_commission_pct := COALESCE(v_commission_pct, 0);
  v_tol := COALESCE(v_tol, 3);

  SELECT
    COALESCE(SUM((m->>'hours')::numeric
      * COALESCE(public.calculate_employee_hourly_cost_for_month(
          v_tenant_id, p_employee_id,
          make_date((m->>'year')::int, (m->>'month')::int, 1)), 0)), 0),
    COALESCE(SUM((m->>'hours')::numeric), 0)
  INTO v_est, v_hours
  FROM jsonb_array_elements(COALESCE(p_months, '[]'::jsonb)) AS m;

  v_is_non_revenue := (v_revenue <= 0);

  IF v_is_non_revenue THEN
    RETURN QUERY SELECT round(v_est, 2), v_hours,
      CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
      NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, v_tol,
      NULL::text, false, v_is_non_revenue;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(pc.planned_amount_brl), 0) INTO v_other
  FROM public.project_costs pc
  WHERE pc.project_id = p_project_id AND pc.deleted_at IS NULL;

  SELECT COALESCE(SUM(pra.planned_hours * COALESCE(pra.cost_per_hour,
    public.calculate_employee_hourly_cost_for_month(pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)), 0)), 0)
  INTO v_current_labor
  FROM public.project_role_allocations pra WHERE pra.project_id = p_project_id;

  IF v_budget_id IS NOT NULL THEN
    SELECT COALESCE(SUM(brm.hours * br.hourly_rate), 0) INTO v_baseline_labor
    FROM public.budget_roles br
    JOIN public.budget_role_months brm ON brm.budget_role_id = br.id
    WHERE br.budget_id = v_budget_id;
    v_has_baseline := EXISTS (SELECT 1 FROM public.budget_roles br WHERE br.budget_id = v_budget_id);
  END IF;

  v_taxes := (v_taxes_pct / 100.0) * v_revenue;
  v_commissions := (v_commission_pct / 100.0) * v_revenue;
  v_margem_atual := ((v_revenue - v_taxes - v_commissions - (v_current_labor + v_other)) / v_revenue) * 100;
  v_margem_simulada := ((v_revenue - v_taxes - v_commissions - (v_current_labor + v_other + v_est)) / v_revenue) * 100;

  IF v_has_baseline THEN
    v_margem_baseline := ((v_revenue - v_taxes - v_commissions - (v_baseline_labor + v_other)) / v_revenue) * 100;
    v_delta := v_margem_simulada - v_margem_baseline;
    v_verdict := CASE
      WHEN v_margem_simulada >= v_margem_baseline - v_tol THEN 'fits'
      WHEN v_margem_simulada >= v_margem_baseline - (2 * v_tol) THEN 'tightens'
      ELSE 'breaks' END;
  END IF;

  RETURN QUERY SELECT round(v_est, 2), v_hours,
    CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
    round(v_margem_atual, 2), round(v_margem_simulada, 2),
    round(v_margem_baseline, 2), round(v_delta, 2), v_tol,
    v_verdict, v_has_baseline, v_is_non_revenue;
END;
$$;

GRANT EXECUTE ON FUNCTION public.simulate_allocation_margin_impact(uuid, uuid, jsonb) TO authenticated;

-- ==== time tracking schema ====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_entry_type') THEN
    CREATE TYPE public.time_entry_type AS ENUM ('entrada','inicio_intervalo','fim_intervalo','saida');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.time_tracking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tolerancia_entrada_minutos INTEGER NOT NULL DEFAULT 10,
  tolerancia_saida_minutos INTEGER NOT NULL DEFAULT 10,
  intervalo_minimo_minutos INTEGER NOT NULL DEFAULT 60,
  limite_horas_extras_diarias NUMERIC(5,2) NOT NULL DEFAULT 2,
  exigir_selfie BOOLEAN NOT NULL DEFAULT false,
  exigir_reconhecimento_facial BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_tracking_settings TO authenticated;
GRANT ALL ON public.time_tracking_settings TO service_role;

DROP TRIGGER IF EXISTS update_time_tracking_settings_updated_at ON public.time_tracking_settings;
CREATE TRIGGER update_time_tracking_settings_updated_at
BEFORE UPDATE ON public.time_tracking_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo public.time_entry_type NOT NULL,
  horario TIMESTAMPTZ NOT NULL DEFAULT now(),
  origem TEXT NOT NULL DEFAULT 'web' CHECK (origem IN ('web','pwa')),
  latitude NUMERIC(9,6), longitude NUMERIC(9,6),
  ip_address TEXT, user_agent TEXT,
  is_ajuste BOOLEAN NOT NULL DEFAULT false,
  ajuste_de_id UUID REFERENCES public.time_entries(id),
  selfie_path TEXT,
  face_match_status TEXT CHECK (face_match_status IN ('confirmado','nao_confirmado','sem_verificacao')),
  face_match_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_id ON public.time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_horario ON public.time_entries(employee_id, horario);

CREATE TABLE IF NOT EXISTS public.time_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horas_trabalhadas NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_previstas NUMERIC(6,2) NOT NULL DEFAULT 0,
  saldo_dia NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_extras NUMERIC(6,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'incompleto' CHECK (status IN ('normal','atraso','falta','incompleto','ferias','atestado')),
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, data)
);
GRANT SELECT ON public.time_daily_summary TO authenticated;
GRANT ALL ON public.time_daily_summary TO service_role;
CREATE INDEX IF NOT EXISTS idx_time_daily_summary_tenant_id ON public.time_daily_summary(tenant_id);

CREATE TABLE IF NOT EXISTS public.time_bank_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito','debito')),
  horas NUMERIC(6,2) NOT NULL,
  saldo_acumulado NUMERIC(8,2) NOT NULL,
  origem TEXT NOT NULL DEFAULT 'calculo_diario',
  referencia_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.time_bank_ledger TO authenticated;
GRANT ALL ON public.time_bank_ledger TO service_role;
CREATE INDEX IF NOT EXISTS idx_time_bank_ledger_employee_data ON public.time_bank_ledger(employee_id, data DESC);

CREATE TABLE IF NOT EXISTS public.time_tracking_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, entity_id UUID,
  action TEXT NOT NULL, description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.time_tracking_audit_log TO authenticated;
GRANT ALL ON public.time_tracking_audit_log TO service_role;
CREATE INDEX IF NOT EXISTS idx_time_tracking_audit_log_tenant_id ON public.time_tracking_audit_log(tenant_id);

ALTER TABLE public.time_tracking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_bank_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_tracking_settings_select_tenant" ON public.time_tracking_settings;
CREATE POLICY "time_tracking_settings_select_tenant" ON public.time_tracking_settings FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "time_tracking_settings_write_admin" ON public.time_tracking_settings;
CREATE POLICY "time_tracking_settings_write_admin" ON public.time_tracking_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'))
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'));

DROP POLICY IF EXISTS "time_entries_select" ON public.time_entries;
CREATE POLICY "time_entries_select" ON public.time_entries FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_entries.employee_id AND e.auth_id = auth.uid())
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

DROP POLICY IF EXISTS "time_daily_summary_select" ON public.time_daily_summary;
CREATE POLICY "time_daily_summary_select" ON public.time_daily_summary FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_daily_summary.employee_id AND e.auth_id = auth.uid())
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

DROP POLICY IF EXISTS "time_bank_ledger_select" ON public.time_bank_ledger;
CREATE POLICY "time_bank_ledger_select" ON public.time_bank_ledger FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_bank_ledger.employee_id AND e.auth_id = auth.uid())
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

DROP POLICY IF EXISTS "time_tracking_audit_log_select_admin_rh" ON public.time_tracking_audit_log;
CREATE POLICY "time_tracking_audit_log_select_admin_rh" ON public.time_tracking_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin') OR public.has_role(auth.uid(), tenant_id, 'rh'));

CREATE OR REPLACE FUNCTION public.recompute_daily_summary(p_employee_id UUID, p_data DATE)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID; v_jornada_diaria NUMERIC;
  v_horas_trabalhadas NUMERIC := 0; v_intervalo_horas NUMERIC := 0;
  v_saldo_anterior NUMERIC := 0; v_saldo_dia NUMERIC; v_horas_extras NUMERIC; v_status TEXT;
  v_entrada TIMESTAMPTZ; v_inicio_intervalo TIMESTAMPTZ; v_fim_intervalo TIMESTAMPTZ; v_saida TIMESTAMPTZ;
  v_summary_id UUID;
BEGIN
  SELECT e.tenant_id, e.jornada_diaria INTO v_tenant_id, v_jornada_diaria
  FROM public.employees e WHERE e.id = p_employee_id;
  IF v_tenant_id IS NULL THEN RETURN; END IF;

  SELECT MIN(horario) FILTER (WHERE tipo = 'entrada'),
         MIN(horario) FILTER (WHERE tipo = 'inicio_intervalo'),
         MAX(horario) FILTER (WHERE tipo = 'fim_intervalo'),
         MAX(horario) FILTER (WHERE tipo = 'saida')
  INTO v_entrada, v_inicio_intervalo, v_fim_intervalo, v_saida
  FROM public.time_entries WHERE employee_id = p_employee_id AND horario::date = p_data;

  IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
    v_horas_trabalhadas := EXTRACT(EPOCH FROM (v_saida - v_entrada)) / 3600.0;
    IF v_inicio_intervalo IS NOT NULL AND v_fim_intervalo IS NOT NULL THEN
      v_intervalo_horas := EXTRACT(EPOCH FROM (v_fim_intervalo - v_inicio_intervalo)) / 3600.0;
      v_horas_trabalhadas := v_horas_trabalhadas - v_intervalo_horas;
    END IF;
    v_status := 'normal';
  ELSIF v_entrada IS NOT NULL THEN v_status := 'incompleto';
  ELSE v_status := 'falta';
  END IF;

  v_horas_trabalhadas := GREATEST(v_horas_trabalhadas, 0);
  v_saldo_dia := v_horas_trabalhadas - COALESCE(v_jornada_diaria, 0);
  v_horas_extras := GREATEST(v_saldo_dia, 0);

  INSERT INTO public.time_daily_summary (
    tenant_id, employee_id, data, horas_trabalhadas, horas_previstas,
    saldo_dia, horas_extras, status, calculado_em
  ) VALUES (
    v_tenant_id, p_employee_id, p_data, v_horas_trabalhadas, COALESCE(v_jornada_diaria, 0),
    v_saldo_dia, v_horas_extras, v_status, now()
  )
  ON CONFLICT (employee_id, data) DO UPDATE SET
    horas_trabalhadas = EXCLUDED.horas_trabalhadas,
    horas_previstas = EXCLUDED.horas_previstas,
    saldo_dia = EXCLUDED.saldo_dia,
    horas_extras = EXCLUDED.horas_extras,
    status = EXCLUDED.status, calculado_em = now()
  RETURNING id INTO v_summary_id;

  IF v_status = 'normal' THEN
    SELECT COALESCE(saldo_acumulado, 0) INTO v_saldo_anterior
    FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data < p_data
    ORDER BY data DESC, created_at DESC LIMIT 1;

    DELETE FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data = p_data AND origem = 'calculo_diario';

    INSERT INTO public.time_bank_ledger (
      tenant_id, employee_id, data, tipo, horas, saldo_acumulado, origem, referencia_id
    ) VALUES (
      v_tenant_id, p_employee_id, p_data,
      CASE WHEN v_saldo_dia >= 0 THEN 'credito' ELSE 'debito' END,
      v_saldo_dia, v_saldo_anterior + v_saldo_dia, 'calculo_diario', v_summary_id
    );
  END IF;
END;
$$;

-- ==== time adjustment requests ====
CREATE TABLE IF NOT EXISTS public.time_adjustment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ajuste_ponto','hora_extra','ferias','atestado','falta')),
  data_referencia DATE NOT NULL,
  data_fim DATE,
  tipo_marcacao public.time_entry_type,
  horario_solicitado TIMESTAMPTZ,
  entry_id_original UUID REFERENCES public.time_entries(id),
  horas_solicitadas NUMERIC(6,2),
  motivo TEXT NOT NULL,
  anexo_path TEXT, anexo_nome TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  decidido_por UUID REFERENCES public.employees(id),
  decidido_em TIMESTAMPTZ,
  motivo_decisao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.time_adjustment_requests TO authenticated;
GRANT ALL ON public.time_adjustment_requests TO service_role;
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_tenant_id ON public.time_adjustment_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_employee_id ON public.time_adjustment_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_adjustment_requests_status ON public.time_adjustment_requests(status);

ALTER TABLE public.time_adjustment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "time_adjustment_requests_select" ON public.time_adjustment_requests;
CREATE POLICY "time_adjustment_requests_select" ON public.time_adjustment_requests FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_adjustment_requests.employee_id AND e.auth_id = auth.uid())
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

-- ==== period locks ====
CREATE TABLE IF NOT EXISTS public.time_tracking_period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fechado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_por UUID REFERENCES public.employees(id),
  UNIQUE (tenant_id, ano, mes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_tracking_period_locks TO authenticated;
GRANT ALL ON public.time_tracking_period_locks TO service_role;

ALTER TABLE public.time_tracking_period_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "time_tracking_period_locks_select_tenant" ON public.time_tracking_period_locks;
CREATE POLICY "time_tracking_period_locks_select_tenant" ON public.time_tracking_period_locks FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "time_tracking_period_locks_write_admin_rh" ON public.time_tracking_period_locks;
CREATE POLICY "time_tracking_period_locks_write_admin_rh" ON public.time_tracking_period_locks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin') OR public.has_role(auth.uid(), tenant_id, 'rh'))
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin') OR public.has_role(auth.uid(), tenant_id, 'rh'));

CREATE OR REPLACE FUNCTION public.reprocess_time_bank_from_date(p_employee_id UUID, p_data_inicio DATE)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_data DATE;
BEGIN
  PERFORM public.recompute_daily_summary(p_employee_id, p_data_inicio);
  FOR v_data IN
    SELECT data FROM public.time_daily_summary
    WHERE employee_id = p_employee_id AND data > p_data_inicio
    ORDER BY data ASC
  LOOP
    PERFORM public.recompute_daily_summary(p_employee_id, v_data);
  END LOOP;
END;
$$;

-- ==== storage policies for attachments and selfies (buckets already exist) ====
DROP POLICY IF EXISTS "time-adjustment-attachments: tenant can read" ON storage.objects;
CREATE POLICY "time-adjustment-attachments: tenant can read" ON storage.objects FOR SELECT
USING (bucket_id = 'time-adjustment-attachments'
  AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "time-adjustment-attachments: tenant can upload" ON storage.objects;
CREATE POLICY "time-adjustment-attachments: tenant can upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'time-adjustment-attachments'
  AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "time-adjustment-attachments: tenant can delete" ON storage.objects;
CREATE POLICY "time-adjustment-attachments: tenant can delete" ON storage.objects FOR DELETE
USING (bucket_id = 'time-adjustment-attachments'
  AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "time-punch-selfies: tenant can read" ON storage.objects;
CREATE POLICY "time-punch-selfies: tenant can read" ON storage.objects FOR SELECT
USING (bucket_id = 'time-punch-selfies'
  AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "time-punch-selfies: tenant can upload" ON storage.objects;
CREATE POLICY "time-punch-selfies: tenant can upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'time-punch-selfies'
  AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "time-punch-selfies: tenant can delete" ON storage.objects;
CREATE POLICY "time-punch-selfies: tenant can delete" ON storage.objects FOR DELETE
USING (bucket_id = 'time-punch-selfies'
  AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- ==== reminders cron ====
DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'notify-time-tracking-reminders-daily') THEN
    PERFORM cron.unschedule('notify-time-tracking-reminders-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-time-tracking-reminders-daily',
  '0 9 * * *',
  $CRON$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notify-time-tracking-reminders',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('app.service_role_key')),
      body    := '{}'::jsonb
    ) AS request_id
  $CRON$
);

-- ==== face recognition ====
CREATE TABLE IF NOT EXISTS public.time_punch_face_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  descriptor JSONB NOT NULL,
  consentimento_versao TEXT NOT NULL,
  consentimento_aceito_em TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id)
);
GRANT SELECT ON public.time_punch_face_profiles TO authenticated;
GRANT ALL ON public.time_punch_face_profiles TO service_role;

DROP TRIGGER IF EXISTS update_time_punch_face_profiles_updated_at ON public.time_punch_face_profiles;
CREATE TRIGGER update_time_punch_face_profiles_updated_at
BEFORE UPDATE ON public.time_punch_face_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.time_punch_face_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "time_punch_face_profiles_select" ON public.time_punch_face_profiles;
CREATE POLICY "time_punch_face_profiles_select" ON public.time_punch_face_profiles FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees e WHERE e.id = time_punch_face_profiles.employee_id AND e.auth_id = auth.uid())
  OR public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

-- ==== apply_absence_period (ferias/atestado/falta) ====
CREATE OR REPLACE FUNCTION public.apply_absence_period(
  p_employee_id UUID, p_tenant_id UUID,
  p_data_inicio DATE, p_data_fim DATE, p_status TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_data DATE; v_jornada_diaria NUMERIC;
  v_horas_previstas NUMERIC; v_saldo_dia NUMERIC;
  v_saldo_anterior NUMERIC; v_summary_id UUID;
  v_running_saldo NUMERIC; ledger_row RECORD;
BEGIN
  IF p_status NOT IN ('ferias','atestado','falta') THEN
    RAISE EXCEPTION 'Status de ausência inválido: %', p_status;
  END IF;

  SELECT jornada_diaria INTO v_jornada_diaria FROM public.employees WHERE id = p_employee_id;

  v_data := p_data_inicio;
  WHILE v_data <= p_data_fim LOOP
    IF p_status = 'falta' THEN
      v_horas_previstas := COALESCE(v_jornada_diaria, 0);
      v_saldo_dia := -v_horas_previstas;
    ELSE
      v_horas_previstas := 0; v_saldo_dia := 0;
    END IF;

    INSERT INTO public.time_daily_summary (
      tenant_id, employee_id, data, horas_trabalhadas, horas_previstas,
      saldo_dia, horas_extras, status, calculado_em
    ) VALUES (
      p_tenant_id, p_employee_id, v_data, 0, v_horas_previstas, v_saldo_dia, 0, p_status, now()
    )
    ON CONFLICT (employee_id, data) DO UPDATE SET
      horas_trabalhadas = 0, horas_previstas = v_horas_previstas,
      saldo_dia = v_saldo_dia, horas_extras = 0,
      status = p_status, calculado_em = now()
    RETURNING id INTO v_summary_id;

    DELETE FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data = v_data AND origem IN ('calculo_diario','falta_lancada');

    IF p_status = 'falta' THEN
      SELECT COALESCE(saldo_acumulado, 0) INTO v_saldo_anterior
      FROM public.time_bank_ledger
      WHERE employee_id = p_employee_id AND data < v_data
      ORDER BY data DESC, created_at DESC LIMIT 1;

      INSERT INTO public.time_bank_ledger (
        tenant_id, employee_id, data, tipo, horas, saldo_acumulado, origem, referencia_id
      ) VALUES (
        p_tenant_id, p_employee_id, v_data, 'debito', v_saldo_dia, v_saldo_anterior + v_saldo_dia,
        'falta_lancada', v_summary_id
      );
    END IF;

    v_data := v_data + 1;
  END LOOP;

  IF p_status = 'falta' THEN
    SELECT COALESCE(saldo_acumulado, 0) INTO v_running_saldo
    FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data <= p_data_fim
    ORDER BY data DESC, created_at DESC LIMIT 1;

    FOR ledger_row IN
      SELECT id, horas FROM public.time_bank_ledger
      WHERE employee_id = p_employee_id AND data > p_data_fim
      ORDER BY data ASC, created_at ASC
    LOOP
      v_running_saldo := v_running_saldo + ledger_row.horas;
      UPDATE public.time_bank_ledger SET saldo_acumulado = v_running_saldo WHERE id = ledger_row.id;
    END LOOP;
  END IF;
END;
$$;