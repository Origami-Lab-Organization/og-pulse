-- Módulo Jornada/Ponto — férias e atestado refletidos no ponto.
--
-- Férias: sem solicitação do colaborador — o admin lança diretamente o
-- período (decisão do dev: já existe módulo de férias próprio com saldo e
-- aprovação em cascata; aqui só refletimos no ponto, sem duplicar aquele
-- fluxo). Entra já como 'aprovado', decidido pelo próprio admin que lançou.
--
-- Atestado: novo tipo de solicitação do colaborador (com anexo do
-- comprovante obrigatório), decidido só pelo admin — mesmo fluxo já usado
-- para ajuste de ponto/hora extra.
--
-- Ambos podem cobrir um período (data_referencia = início, data_fim = fim).

ALTER TABLE public.time_adjustment_requests
  ADD COLUMN IF NOT EXISTS data_fim DATE;

ALTER TABLE public.time_adjustment_requests
  DROP CONSTRAINT IF EXISTS time_adjustment_requests_tipo_check;
ALTER TABLE public.time_adjustment_requests
  ADD CONSTRAINT time_adjustment_requests_tipo_check
  CHECK (tipo IN ('ajuste_ponto', 'hora_extra', 'ferias', 'atestado'));

ALTER TABLE public.time_daily_summary
  DROP CONSTRAINT IF EXISTS time_daily_summary_status_check;
ALTER TABLE public.time_daily_summary
  ADD CONSTRAINT time_daily_summary_status_check
  CHECK (status IN ('normal', 'atraso', 'falta', 'incompleto', 'ferias', 'atestado'));

COMMENT ON COLUMN public.time_adjustment_requests.data_fim IS 'Fim do período (férias/atestado). Nulo para ajuste_ponto/hora_extra, que são de um único dia.';

-- Marca um período (férias/atestado) diretamente no resumo diário — sem
-- passar pelas marcações de ponto. Sem impacto no banco de horas (dia
-- neutro: não gera crédito nem débito), diferente do fechamento normal via
-- recompute_daily_summary.
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
BEGIN
  IF p_status NOT IN ('ferias', 'atestado') THEN
    RAISE EXCEPTION 'Status de ausência inválido: %', p_status;
  END IF;

  v_data := p_data_inicio;
  WHILE v_data <= p_data_fim LOOP
    INSERT INTO public.time_daily_summary (
      tenant_id, employee_id, data, horas_trabalhadas, horas_previstas,
      saldo_dia, horas_extras, status, calculado_em
    )
    VALUES (
      p_tenant_id, p_employee_id, v_data, 0, 0, 0, 0, p_status, now()
    )
    ON CONFLICT (employee_id, data) DO UPDATE SET
      horas_trabalhadas = 0,
      horas_previstas = 0,
      saldo_dia = 0,
      horas_extras = 0,
      status = p_status,
      calculado_em = now();

    -- Remove eventual lançamento de banco de horas do dia (ex.: recompute
    -- anterior) — dia de férias/atestado é neutro, não é crédito nem débito.
    DELETE FROM public.time_bank_ledger
    WHERE employee_id = p_employee_id AND data = v_data AND origem = 'calculo_diario';

    v_data := v_data + 1;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.apply_absence_period IS 'Marca um período como férias/atestado no resumo diário do ponto — dia neutro, sem crédito/débito no banco de horas.';
