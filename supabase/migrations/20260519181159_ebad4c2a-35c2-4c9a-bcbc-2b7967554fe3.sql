ALTER TABLE public.employees DISABLE TRIGGER USER;

DO $$
DECLARE
  v_employee_id uuid;
  v_tenant_id uuid;
  v_match_count integer;
  v_current_cargo text;
  v_current_salario_liquido numeric;
  v_current_pro_labore numeric;
  v_clt_fgts numeric := 176.000000;
  v_clt_decimo numeric := 183.333333;
  v_clt_ferias numeric := 244.444444;
  v_clt_encargos numeric := 210.222222;
  v_clt_total numeric := 3815.650000;
BEGIN
  SELECT count(*) INTO v_match_count
  FROM public.employees WHERE nome ILIKE 'Kauany Sebastiana Arantes';

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION 'Migration aborted: expected exactly 1 Kauany, found %', v_match_count;
  END IF;

  SELECT id, tenant_id, cargo, COALESCE(salario_liquido, 0), COALESCE(pro_labore, 0)
  INTO v_employee_id, v_tenant_id, v_current_cargo, v_current_salario_liquido, v_current_pro_labore
  FROM public.employees WHERE nome ILIKE 'Kauany Sebastiana Arantes';

  DELETE FROM public.employee_versions
  WHERE employee_id = v_employee_id AND effective_from >= DATE '2026-01-07';

  UPDATE public.employee_versions
  SET effective_until = DATE '2026-01-07'
  WHERE employee_id = v_employee_id
  AND effective_from < DATE '2026-01-07'
  AND (effective_until IS NULL OR effective_until > DATE '2026-01-07');

  INSERT INTO public.employee_versions (
    employee_id, effective_from, effective_until, salario_mensal, salario_liquido,
    beneficios, encargos, fgts, inss_empresa, decimo_terceiro, ferias, pro_labore,
    jornada_mensal, jornada_diaria, tipo_contratacao, cargo, total_monthly_cost_estimated
  ) VALUES
    (v_employee_id, DATE '2026-01-07', DATE '2026-03-01', 1200, 1200, 0, 0, 0, 0, 100, 0, 0, 132, 6, 'ESTAGIO', v_current_cargo, 1315.750000),
    (v_employee_id, DATE '2026-03-01', DATE '2026-03-20', 1200, 1200, 425.900000, 0, 0, 0, 100, 0, 0, 132, 6, 'ESTAGIO', v_current_cargo, 1741.650000),
    (v_employee_id, DATE '2026-03-20', DATE '2026-04-24', 1200, 1200, 425.900000, 0, 0, 0, 100, 0, 0, 132, 6, 'ESTAGIO', v_current_cargo, 1877.650000),
    (v_employee_id, DATE '2026-04-24', NULL, 2200, v_current_salario_liquido, 825.900000, v_clt_encargos, v_clt_fgts, 0, v_clt_decimo, v_clt_ferias, v_current_pro_labore, 176, 8, 'CLT', v_current_cargo, v_clt_total);

  UPDATE public.employees
  SET data_admissao = DATE '2026-01-07',
      tipo_contratacao = 'CLT',
      salario_mensal = 2200.000000,
      bolsa_auxilio = 0,
      valor_contrato_pj = 0,
      jornada_diaria = 8,
      jornada_mensal = 176,
      beneficios = 825.900000,
      encargos = v_clt_encargos,
      fgts = v_clt_fgts,
      inss_empresa = 0,
      decimo_terceiro = v_clt_decimo,
      ferias = v_clt_ferias,
      provisao_13 = v_clt_decimo,
      provisao_ferias = v_clt_ferias,
      provisao_recesso = 0,
      total_monthly_cost_estimated = v_clt_total,
      total_annual_cost_estimated = v_clt_total * 12,
      breakdown_json = jsonb_build_object(
        'baseAmount', 2200.000000,
        'chargesAmount', v_clt_encargos,
        'provisionsAmount', v_clt_decimo + v_clt_ferias,
        'benefitsAmount', 825.900000,
        'toolsAmount', 151.750000,
        'totalMonthlyCost', v_clt_total,
        'totalAnnualCost', v_clt_total * 12,
        'details', jsonb_build_object(
          'fgts', v_clt_fgts, 'inss', 0, 'rat', 0, 'terceiros', 0, 'outros', 0,
          'provisao13', v_clt_decimo, 'provisaoFeriasBase', v_clt_decimo,
          'provisaoFeriasTerco', 61.111111, 'provisaoFerias', v_clt_ferias,
          'provisaoRecesso', 0, 'fgts13', 14.666667, 'fgtsFerias', 19.555556,
          'encargos13', 14.666667, 'encargosFerias', 19.555556
        )
      ),
      updated_at = now()
  WHERE id = v_employee_id;

  UPDATE public.employee_benefits
  SET is_active = false, updated_at = now()
  WHERE employee_id = v_employee_id AND is_active = true
  AND lower(name) NOT IN ('vr/va', 'colab+');

  DELETE FROM public.employee_benefits
  WHERE employee_id = v_employee_id AND lower(name) IN ('vr/va', 'colab+');

  INSERT INTO public.employee_benefits (
    employee_id, name, description, monthly_value, is_active, origin, origin_key, created_at, updated_at
  )
  SELECT v_employee_id, b.name, b.description, b.monthly_value, true, 'MIGRATION', b.origin_key, now(), now()
  FROM (VALUES
    ('VR/VA'::text, 'Vale refeição/alimentação CLT vigente desde 2026-03-01'::text, 800.000000::numeric, 'vr_va_2026_03'::text),
    ('Colab+'::text, 'Benefício Colab+ vigente desde 2026-03-01'::text, 25.900000::numeric, 'colab_plus_2026_03'::text)
  ) AS b(name, description, monthly_value, origin_key);

  UPDATE public.employee_tools
  SET is_active = false, updated_at = now()
  WHERE employee_id = v_employee_id AND is_active = true
  AND lower(name) NOT IN ('ms365', 'claude');

  DELETE FROM public.employee_tools
  WHERE employee_id = v_employee_id AND lower(name) IN ('ms365', 'claude');

  INSERT INTO public.employee_tools (
    employee_id, name, description, monthly_cost, is_active, billing_cycle, annual_amount, created_at, updated_at
  )
  SELECT v_employee_id, t.name, t.description, t.monthly_cost, true, 'monthly', 0, now(), now()
  FROM (VALUES
    ('MS365'::text, 'Microsoft 365'::text, 15.750000::numeric),
    ('Claude'::text, 'Claude iniciado em 2026-03-20'::text, 136.000000::numeric)
  ) AS t(name, description, monthly_cost);

  WITH member_month_dates AS (
    SELECT pmm.id,
      make_date(
        EXTRACT(YEAR FROM (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month')))::integer,
        EXTRACT(MONTH FROM (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month')))::integer,
        1
      ) AS month_start,
      pm.employee_id
    FROM public.project_member_months pmm
    JOIN public.project_members pm ON pm.id = pmm.project_member_id
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.employee_id = v_employee_id
  ),
  member_month_costs AS (
    SELECT mmd.id,
      ev.total_monthly_cost_estimated / NULLIF(capacity.working_days * ev.jornada_diaria, 0) AS cost_per_hour
    FROM member_month_dates mmd
    JOIN LATERAL (
      SELECT ev.*
      FROM public.employee_versions ev
      WHERE ev.employee_id = mmd.employee_id
      AND ev.effective_from <= mmd.month_start
      AND (ev.effective_until IS NULL OR ev.effective_until > mmd.month_start)
      ORDER BY ev.effective_from DESC LIMIT 1
    ) ev ON true
    CROSS JOIN LATERAL (
      SELECT count(*)::numeric AS working_days
      FROM generate_series(mmd.month_start, (mmd.month_start + interval '1 month - 1 day')::date, interval '1 day') AS gs(day)
      WHERE EXTRACT(ISODOW FROM gs.day) BETWEEN 1 AND 5
      AND NOT EXISTS (
        SELECT 1 FROM public.company_holidays ch
        WHERE ch.tenant_id = v_tenant_id AND ch.is_active = true
        AND ((ch.holiday_type = 'fixed' AND ch.fixed_day = EXTRACT(DAY FROM gs.day)::integer AND ch.fixed_month = EXTRACT(MONTH FROM gs.day)::integer)
          OR (ch.holiday_type IN ('floating', 'one_time') AND ch.specific_date = gs.day::date))
      )
    ) capacity
  )
  UPDATE public.project_member_months pmm
  SET cost_per_hour = mmc.cost_per_hour
  FROM member_month_costs mmc
  WHERE pmm.id = mmc.id AND mmc.cost_per_hour IS NOT NULL;

  WITH timesheet_costs AS (
    SELECT pt.id,
      ev.total_monthly_cost_estimated / NULLIF(capacity.working_days * ev.jornada_diaria, 0) AS cost_per_hour
    FROM public.project_timesheets pt
    JOIN public.project_members pm ON pm.id = pt.project_member_id
    JOIN LATERAL (
      SELECT ev.*
      FROM public.employee_versions ev
      WHERE ev.employee_id = pm.employee_id
      AND ev.effective_from <= pt.work_date
      AND (ev.effective_until IS NULL OR ev.effective_until > pt.work_date)
      ORDER BY ev.effective_from DESC LIMIT 1
    ) ev ON true
    CROSS JOIN LATERAL (
      SELECT count(*)::numeric AS working_days
      FROM generate_series(
        date_trunc('month', pt.work_date)::date,
        (date_trunc('month', pt.work_date)::date + interval '1 month - 1 day')::date,
        interval '1 day'
      ) AS gs(day)
      WHERE EXTRACT(ISODOW FROM gs.day) BETWEEN 1 AND 5
      AND NOT EXISTS (
        SELECT 1 FROM public.company_holidays ch
        WHERE ch.tenant_id = v_tenant_id AND ch.is_active = true
        AND ((ch.holiday_type = 'fixed' AND ch.fixed_day = EXTRACT(DAY FROM gs.day)::integer AND ch.fixed_month = EXTRACT(MONTH FROM gs.day)::integer)
          OR (ch.holiday_type IN ('floating', 'one_time') AND ch.specific_date = gs.day::date))
      )
    ) capacity
    WHERE pm.employee_id = v_employee_id
  )
  UPDATE public.project_timesheets pt
  SET cost_per_hour = tc.cost_per_hour
  FROM timesheet_costs tc
  WHERE pt.id = tc.id AND tc.cost_per_hour IS NOT NULL;

  SELECT count(*) INTO v_match_count
  FROM public.employee_versions
  WHERE employee_id = v_employee_id AND effective_from >= DATE '2026-01-07';

  IF v_match_count <> 4 THEN
    RAISE EXCEPTION 'Migration aborted: expected 4 Kauany versions after rewrite, found %', v_match_count;
  END IF;
END $$;

ALTER TABLE public.employees ENABLE TRIGGER USER;