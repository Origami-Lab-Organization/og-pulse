DO $$
DECLARE
  v_employee_id uuid;
  v_tenant_id uuid;
  v_match_count integer;
  v_current_cargo text;
  v_existing_termination_id uuid;
  v_termination_id uuid;
BEGIN
  SELECT count(*) INTO v_match_count
  FROM public.employees WHERE nome ILIKE 'Rafael Bruno Andrade';

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION 'Migration aborted: expected exactly 1 Rafael Bruno Andrade, found %', v_match_count;
  END IF;

  SELECT id, tenant_id, cargo
  INTO v_employee_id, v_tenant_id, v_current_cargo
  FROM public.employees WHERE nome ILIKE 'Rafael Bruno Andrade' LIMIT 1;

  SELECT termination_id INTO v_existing_termination_id
  FROM public.employees WHERE id = v_employee_id;

  IF v_existing_termination_id IS NOT NULL THEN
    UPDATE public.employee_terminations
    SET
      termination_date = DATE '2026-04-17',
      notification_date = COALESCE(notification_date, DATE '2026-04-17'),
      termination_type = 'contract_end',
      reason = COALESCE(reason, 'Correção histórica de desligamento PJ em 2026-04-17'),
      reason_category = 'contract_expiration',
      notice_period_days = COALESCE(notice_period_days, 0),
      notice_worked = COALESCE(notice_worked, false),
      status = 'completed',
      updated_at = now()
    WHERE id = v_existing_termination_id
    RETURNING id INTO v_termination_id;
  END IF;

  IF v_termination_id IS NULL THEN
    SELECT id INTO v_termination_id
    FROM public.employee_terminations
    WHERE employee_id = v_employee_id AND termination_date = DATE '2026-04-17'
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_termination_id IS NULL THEN
    INSERT INTO public.employee_terminations (
      employee_id, termination_date, notification_date, termination_type,
      reason, reason_category, notice_period_days, notice_worked,
      status, created_at, updated_at
    )
    VALUES (
      v_employee_id, DATE '2026-04-17', DATE '2026-04-17', 'contract_end',
      'Correção histórica de desligamento PJ em 2026-04-17', 'contract_expiration',
      0, false, 'completed', now(), now()
    )
    RETURNING id INTO v_termination_id;
  END IF;

  DELETE FROM public.employee_versions
  WHERE employee_id = v_employee_id AND effective_from >= DATE '2026-02-18';

  INSERT INTO public.employee_versions (
    employee_id, effective_from, effective_until,
    salario_mensal, salario_liquido, beneficios, encargos, fgts, inss_empresa,
    decimo_terceiro, ferias, pro_labore, jornada_mensal, jornada_diaria,
    tipo_contratacao, cargo, total_monthly_cost_estimated
  )
  VALUES
    (v_employee_id, DATE '2026-02-18', DATE '2026-03-01', 13000, 13000, 0, 0, 0, 0, 0, 0, 0, 176, 8, 'PJ', v_current_cargo, 13098),
    (v_employee_id, DATE '2026-03-01', DATE '2026-03-20', 13000, 13000, 25.9, 0, 0, 0, 0, 0, 0, 176, 8, 'PJ', v_current_cargo, 13123.9),
    (v_employee_id, DATE '2026-03-20', DATE '2026-04-01', 13000, 13000, 25.9, 0, 0, 0, 0, 0, 0, 176, 8, 'PJ', v_current_cargo, 13259.9),
    (v_employee_id, DATE '2026-04-01', DATE '2026-04-18', 13000, 13000, 25.9, 0, 0, 0, 0, 0, 0, 88, 4, 'PJ', v_current_cargo, 13259.9);

  ALTER TABLE public.employees DISABLE TRIGGER prevent_employee_self_escalation;

  UPDATE public.employees
  SET
    data_admissao = DATE '2026-02-18',
    termination_id = v_termination_id,
    status = 'desligado',
    tipo_contratacao = 'PJ',
    salario_mensal = 0, salario_liquido = 0, bolsa_auxilio = 0,
    valor_contrato_pj = 0, dividendos = 0,
    jornada_diaria = 0, jornada_mensal = 0,
    beneficios = 0, encargos = 0, fgts = 0, inss_empresa = 0,
    decimo_terceiro = 0, ferias = 0, pro_labore = 0,
    provisao_13 = 0, provisao_ferias = 0, provisao_recesso = 0,
    total_monthly_cost_estimated = 0, total_annual_cost_estimated = 0,
    breakdown_json = jsonb_build_object(
      'baseAmount', 0, 'chargesAmount', 0, 'provisionsAmount', 0,
      'benefitsAmount', 0, 'toolsAmount', 0,
      'totalMonthlyCost', 0, 'totalAnnualCost', 0,
      'details', jsonb_build_object(
        'fgts', 0, 'inss', 0, 'rat', 0, 'terceiros', 0, 'outros', 0,
        'provisao13', 0, 'provisaoFeriasBase', 0, 'provisaoFeriasTerco', 0,
        'provisaoFerias', 0, 'provisaoRecesso', 0,
        'fgts13', 0, 'fgtsFerias', 0, 'encargos13', 0, 'encargosFerias', 0
      )
    ),
    updated_at = now()
  WHERE id = v_employee_id;

  ALTER TABLE public.employees ENABLE TRIGGER prevent_employee_self_escalation;

  UPDATE public.employee_benefits
  SET is_active = false, updated_at = now()
  WHERE employee_id = v_employee_id AND is_active = true;

  DELETE FROM public.employee_benefits
  WHERE employee_id = v_employee_id
    AND (
      lower(name) IN ('vr/va', 'colab+', 'gympass/wellhub', 'vale alimentação', 'vale alimentacao', 'vale refeição', 'vale refeicao')
      OR origin_key IN ('vr_va_2026_03', 'colab_plus_2026_03')
    );

  UPDATE public.employee_tools
  SET is_active = false, updated_at = now()
  WHERE employee_id = v_employee_id AND is_active = true;

  DELETE FROM public.employee_tools
  WHERE employee_id = v_employee_id
    AND lower(name) IN ('ms365', 'microsoft 365 standard', 'ms365 standard', 'claude');

  PERFORM public.recalculate_employee_cost_snapshots(v_employee_id);

  WITH member_months AS (
    SELECT
      pmm.id,
      (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date AS month_start
    FROM public.project_member_months pmm
    JOIN public.project_members pm ON pm.id = pmm.project_member_id
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.employee_id = v_employee_id
  )
  UPDATE public.project_member_months pmm
  SET cost_per_hour = 0
  FROM member_months mm
  WHERE pmm.id = mm.id AND mm.month_start > DATE '2026-04-17';

  UPDATE public.project_timesheets pt
  SET cost_per_hour = 0
  FROM public.project_members pm
  WHERE pm.id = pt.project_member_id
    AND pm.employee_id = v_employee_id
    AND pt.work_date > DATE '2026-04-17';

  SELECT count(*) INTO v_match_count
  FROM public.employee_versions
  WHERE employee_id = v_employee_id AND effective_from >= DATE '2026-02-18';

  IF v_match_count <> 4 THEN
    RAISE EXCEPTION 'Migration aborted: expected 4 Rafael versions after rewrite, found %', v_match_count;
  END IF;

  IF EXISTS (SELECT 1 FROM public.employee_benefits WHERE employee_id = v_employee_id AND is_active = true) THEN
    RAISE EXCEPTION 'Migration aborted: Rafael still has active benefits after termination cleanup';
  END IF;

  IF EXISTS (SELECT 1 FROM public.employee_tools WHERE employee_id = v_employee_id AND is_active = true) THEN
    RAISE EXCEPTION 'Migration aborted: Rafael still has active tools after termination cleanup';
  END IF;
END $$;