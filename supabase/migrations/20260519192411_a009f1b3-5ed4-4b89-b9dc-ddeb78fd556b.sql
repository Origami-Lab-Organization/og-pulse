ALTER TABLE public.employees DISABLE TRIGGER USER;

DO $$
DECLARE
  v_employee_id uuid;
  v_match_count integer;
  v_current_cargo text;
BEGIN
  SELECT id, cargo INTO v_employee_id, v_current_cargo
  FROM public.employees
  WHERE nome ILIKE 'Enzo Rodrigues Pieroni'
  ORDER BY id LIMIT 1;

  SELECT count(*) INTO v_match_count
  FROM public.employees WHERE nome ILIKE 'Enzo Rodrigues Pieroni';

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION 'Migration aborted: expected exactly 1 Enzo Rodrigues Pieroni, found %', v_match_count;
  END IF;

  DELETE FROM public.employee_versions
  WHERE employee_id = v_employee_id AND effective_from >= DATE '2026-01-05';

  INSERT INTO public.employee_versions (
    employee_id, effective_from, effective_until,
    salario_mensal, salario_liquido, beneficios, encargos, fgts, inss_empresa,
    decimo_terceiro, ferias, pro_labore, jornada_mensal, jornada_diaria,
    tipo_contratacao, cargo, total_monthly_cost_estimated
  )
  VALUES
    (v_employee_id, DATE '2026-01-05', DATE '2026-02-02', 800.000000, 800.000000, 0, 0, 0, 0, 66.666667, 0, 0, 88, 4, 'ESTAGIO', v_current_cargo, 882.416667),
    (v_employee_id, DATE '2026-02-02', DATE '2026-03-01', 1200.000000, 1200.000000, 0, 0, 0, 0, 100.000000, 0, 0, 132, 6, 'ESTAGIO', v_current_cargo, 1315.750000),
    (v_employee_id, DATE '2026-03-01', DATE '2026-03-20', 1200.000000, 1200.000000, 425.900000, 0, 0, 0, 100.000000, 0, 0, 132, 6, 'ESTAGIO', v_current_cargo, 1741.650000),
    (v_employee_id, DATE '2026-03-20', NULL, 1200.000000, 1200.000000, 425.900000, 0, 0, 0, 100.000000, 0, 0, 132, 6, 'ESTAGIO', v_current_cargo, 1877.650000);

  UPDATE public.employees
  SET
    data_admissao = DATE '2026-01-05',
    tipo_contratacao = 'ESTAGIO',
    salario_mensal = 0, salario_liquido = 0,
    bolsa_auxilio = 1200.000000,
    valor_contrato_pj = 0, dividendos = 0,
    jornada_diaria = 6, jornada_mensal = 132,
    beneficios = 425.900000,
    encargos = 0, fgts = 0, inss_empresa = 0,
    decimo_terceiro = 100.000000, ferias = 0, pro_labore = 0,
    provisao_13 = 0, provisao_ferias = 0, provisao_recesso = 100.000000,
    total_monthly_cost_estimated = 1877.650000,
    total_annual_cost_estimated = 22531.800000,
    breakdown_json = jsonb_build_object(
      'baseAmount', 1200.000000, 'chargesAmount', 0,
      'provisionsAmount', 100.000000, 'benefitsAmount', 425.900000,
      'toolsAmount', 151.750000, 'totalMonthlyCost', 1877.650000,
      'totalAnnualCost', 22531.800000,
      'details', jsonb_build_object(
        'fgts', 0, 'inss', 0, 'rat', 0, 'terceiros', 0, 'outros', 0,
        'provisao13', 0, 'provisaoFeriasBase', 0, 'provisaoFeriasTerco', 0,
        'provisaoFerias', 0, 'provisaoRecesso', 100.000000,
        'fgts13', 0, 'fgtsFerias', 0, 'encargos13', 0, 'encargosFerias', 0
      )
    ),
    updated_at = now()
  WHERE id = v_employee_id;

  UPDATE public.employee_benefits SET is_active = false, updated_at = now()
  WHERE employee_id = v_employee_id AND is_active = true;

  DELETE FROM public.employee_benefits
  WHERE employee_id = v_employee_id
    AND (lower(name) IN ('vr/va','colab+','gympass/wellhub','vale alimentação','vale alimentacao','vale refeição','vale refeicao')
         OR origin_key IN ('vr_va_2026_03','colab_plus_2026_03'));

  INSERT INTO public.employee_benefits (employee_id, name, description, monthly_value, is_active, origin, origin_key, created_at, updated_at)
  VALUES
    (v_employee_id, 'VR/VA', 'Vale refeição/alimentação estágio vigente desde 2026-03-01', 400.000000, true, 'MIGRATION', 'vr_va_2026_03', now(), now()),
    (v_employee_id, 'Colab+', 'Benefício Colab+ vigente desde 2026-03-01', 25.900000, true, 'MIGRATION', 'colab_plus_2026_03', now(), now());

  UPDATE public.employee_tools SET is_active = false, updated_at = now()
  WHERE employee_id = v_employee_id AND is_active = true;

  DELETE FROM public.employee_tools
  WHERE employee_id = v_employee_id AND lower(name) IN ('ms365','claude');

  INSERT INTO public.employee_tools (employee_id, name, description, monthly_cost, is_active, billing_cycle, annual_amount, created_at, updated_at)
  VALUES
    (v_employee_id, 'MS365', 'Microsoft 365 F1 desde a admissão', 15.750000, true, 'monthly', 0, now(), now()),
    (v_employee_id, 'Claude', 'Claude iniciado em 2026-03-20', 136.000000, true, 'monthly', 0, now(), now());

  PERFORM public.recalculate_employee_cost_snapshots(v_employee_id);

  SELECT count(*) INTO v_match_count
  FROM public.employee_versions
  WHERE employee_id = v_employee_id AND effective_from >= DATE '2026-01-05';

  IF v_match_count <> 4 THEN
    RAISE EXCEPTION 'Migration aborted: expected 4 Enzo versions after rewrite, found %', v_match_count;
  END IF;
END $$;

ALTER TABLE public.employees ENABLE TRIGGER USER;