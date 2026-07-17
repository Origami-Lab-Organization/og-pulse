-- Módulo Jornada/Ponto — admin lança "Falta" diretamente, igual já existe
-- para férias/atestado. Diferente destes (neutros), falta é ausência não
-- justificada: desconta a jornada_diaria do colaborador no banco de horas.

ALTER TABLE public.time_adjustment_requests
  DROP CONSTRAINT IF EXISTS time_adjustment_requests_tipo_check;
ALTER TABLE public.time_adjustment_requests
  ADD CONSTRAINT time_adjustment_requests_tipo_check
  CHECK (tipo IN ('ajuste_ponto', 'hora_extra', 'ferias', 'atestado', 'falta'));

CREATE OR REPLACE FUNCTION public.apply_absence_period(
  p_employee_id UUID,
  p_tenant_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data DATE;
  v_jornada_diaria NUMERIC;
  v_horas_previstas NUMERIC;
  v_saldo_dia NUMERIC;
  v_saldo_anterior NUMERIC;
  v_summary_id UUID;
  v_running_saldo NUMERIC;
  ledger_row RECORD;
BEGIN
  IF p_status NOT IN ('ferias', 'atestado', 'falta') THEN
    RAISE EXCEPTION 'Status de ausência inválido: %', p_status;
  END IF;

  SELECT jornada_diaria INTO v_jornada_diaria FROM public.employees WHERE id = p_employee_id;

  v_data := p_data_inicio;
  WHILE v_data <= p_data_fim LOOP
    IF p_status = 'falta' THEN
      v_horas_previstas := COALESCE(v_jornada_diaria, 0);
      v_saldo_dia := -v_horas_previstas;
    ELSE
      v_horas_previstas := 0;
      v_saldo_dia := 0;
    END IF;

    INSERT INTO public.time_daily_summary (
      tenant_id, employee_id, data, horas_trabalhadas, horas_previstas,
      saldo_dia, horas_extras, status, calculado_em
    )
    VALUES (
      p_tenant_id, p_employee_id, v_data, 0, v_horas_previstas, v_saldo_dia, 0, p_status, now()
    )
    ON CONFLICT (employee_id, data) DO UPDATE SET
      horas_trabalhadas = 0,
      horas_previstas = v_horas_previstas,
      saldo_dia = v_saldo_dia,
      horas_extras = 0,
      status = p_status,
      calculado_em = now()
    RETURNING id INTO v_summary_id;

    DELETE FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data = v_data AND origem IN ('calculo_diario', 'falta_lancada');

    IF p_status = 'falta' THEN
      SELECT COALESCE(saldo_acumulado, 0) INTO v_saldo_anterior
      FROM public.time_bank_ledger
      WHERE employee_id = p_employee_id AND data < v_data
      ORDER BY data DESC, created_at DESC
      LIMIT 1;

      INSERT INTO public.time_bank_ledger (
        tenant_id, employee_id, data, tipo, horas, saldo_acumulado, origem, referencia_id
      )
      VALUES (
        p_tenant_id, p_employee_id, v_data, 'debito', v_saldo_dia, v_saldo_anterior + v_saldo_dia,
        'falta_lancada', v_summary_id
      );
    END IF;

    v_data := v_data + 1;
  END LOOP;

  -- Falta lançada retroativamente desalinha a soma corrida de dias já
  -- calculados depois do período — recalcula o saldo_acumulado em cascata
  -- (só a soma corrida; não mexe em status/horas de dias já fechados).
  IF p_status = 'falta' THEN
    SELECT COALESCE(saldo_acumulado, 0) INTO v_running_saldo
    FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data <= p_data_fim
    ORDER BY data DESC, created_at DESC
    LIMIT 1;

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

COMMENT ON FUNCTION public.apply_absence_period IS 'Marca um período como férias/atestado (neutro) ou falta (debita jornada_diaria do banco de horas, com cascata para dias posteriores já calculados).';
