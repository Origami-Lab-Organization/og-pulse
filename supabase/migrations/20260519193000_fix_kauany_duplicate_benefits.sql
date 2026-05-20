DO $$
DECLARE
  v_employee_id uuid;
  v_match_count integer;
BEGIN
  SELECT count(*), min(id)
  INTO v_match_count, v_employee_id
  FROM public.employees
  WHERE nome ILIKE 'Kauany Sebastiana Arantes';

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION 'Migration aborted: expected exactly 1 Kauany Sebastiana Arantes, found %', v_match_count;
  END IF;

  -- employee_benefits is the current auxiliary table, not the historical source.
  -- Keep only the canonical active benefits for Kauany's current CLT state.
  DELETE FROM public.employee_benefits
  WHERE employee_id = v_employee_id
    AND (
      lower(name) IN ('vr/va', 'colab+', 'gympass/wellhub', 'vale alimentação', 'vale alimentacao')
      OR origin_key IN ('vr_va_2026_03', 'colab_plus_2026_03')
    );

  INSERT INTO public.employee_benefits (
    employee_id,
    name,
    description,
    monthly_value,
    is_active,
    origin,
    origin_key,
    created_at,
    updated_at
  )
  VALUES
    (
      v_employee_id,
      'VR/VA',
      'Vale refeição/alimentação CLT vigente desde 2026-03-01',
      800.000000,
      true,
      'MIGRATION',
      'vr_va_2026_03',
      now(),
      now()
    ),
    (
      v_employee_id,
      'Colab+',
      'Benefício Colab+ vigente desde 2026-03-01',
      25.900000,
      true,
      'MIGRATION',
      'colab_plus_2026_03',
      now(),
      now()
    );

  UPDATE public.employees
  SET
    beneficios = 825.900000,
    total_monthly_cost_estimated = 3815.650000,
    total_annual_cost_estimated = 45787.800000,
    breakdown_json = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(breakdown_json, '{}'::jsonb),
          '{benefitsAmount}',
          to_jsonb(825.900000::numeric),
          true
        ),
        '{totalMonthlyCost}',
        to_jsonb(3815.650000::numeric),
        true
      ),
      '{totalAnnualCost}',
      to_jsonb(45787.800000::numeric),
      true
    ),
    updated_at = now()
  WHERE id = v_employee_id;

  UPDATE public.employee_versions
  SET
    beneficios = 825.900000,
    total_monthly_cost_estimated = 3815.650000
  WHERE employee_id = v_employee_id
    AND effective_from = DATE '2026-04-24'
    AND effective_until IS NULL;

  PERFORM public.recalculate_employee_cost_snapshots(v_employee_id);
END $$;
