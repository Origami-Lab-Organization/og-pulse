-- Módulo Jornada/Ponto — Fase 3: fechamento mensal (RH) e reprocessamento em
-- cascata do banco de horas quando um ajuste retroativo é aprovado.

CREATE TABLE public.time_tracking_period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fechado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_por UUID REFERENCES public.employees(id),
  UNIQUE (tenant_id, ano, mes)
);

ALTER TABLE public.time_tracking_period_locks ENABLE ROW LEVEL SECURITY;

-- Leitura para todo o tenant (UI precisa saber se o período está fechado);
-- fechar/reabrir é ação de admin ou rh.
CREATE POLICY "time_tracking_period_locks_select_tenant"
ON public.time_tracking_period_locks FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "time_tracking_period_locks_write_admin_rh"
ON public.time_tracking_period_locks FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
)
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.has_role(auth.uid(), tenant_id, 'rh')
);

COMMENT ON TABLE public.time_tracking_period_locks IS 'Fechamento mensal de jornada por tenant — bloqueia novas marcações/ajustes no período.';

-- Recalcula o dia corrigido e propaga o encadeamento de saldo do banco de
-- horas para frente, para todos os dias que já tinham resumo calculado.
-- Necessário porque time_bank_ledger.saldo_acumulado é uma soma corrida:
-- corrigir um dia no passado deixa o saldo dos dias seguintes desatualizado.
CREATE OR REPLACE FUNCTION public.reprocess_time_bank_from_date(p_employee_id UUID, p_data_inicio DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data DATE;
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
