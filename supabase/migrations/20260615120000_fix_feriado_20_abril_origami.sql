-- Corrige capacidade do dia 20/04/2026 para o tenant Origami Lab.
--
-- Problema: project_timesheets com horas reais no dia 20/04 (feriado/ponto facultativo)
-- ainda estão contando no somatório mensal.
--
-- IMPORTANTE: rodar como postgres/service role (supabase db push ou SQL Editor → Admin).
-- RLS em project_timesheets bloqueia DELETE silenciosamente se rodado como usuário comum.

-- Desabilita RLS para garantir que o DELETE funciona independente do role da sessão
SET LOCAL row_security = OFF;

-- ============================================================
-- 1. Garantir 20/04/2026 como feriado ativo no tenant Origami
-- ============================================================
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE name ILIKE '%origami%'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant Origami não encontrado — verifique o nome na tabela tenants';
  END IF;

  -- Ativa se já existe mas está inativo
  UPDATE public.company_holidays
  SET is_active  = true,
      updated_at = now()
  WHERE tenant_id     = v_tenant_id
    AND holiday_type  IN ('one_time', 'floating')
    AND specific_date = '2026-04-20';

  -- Insere se não existir nenhuma entrada para essa data
  IF NOT EXISTS (
    SELECT 1
    FROM public.company_holidays
    WHERE tenant_id     = v_tenant_id
      AND holiday_type  IN ('one_time', 'floating')
      AND specific_date = '2026-04-20'
  ) THEN
    INSERT INTO public.company_holidays
      (tenant_id, name, holiday_type, specific_date, reference_year, is_active)
    VALUES
      (v_tenant_id, 'Ponto Facultativo (Tiradentes)', 'one_time', '2026-04-20', 2026, true);
    RAISE NOTICE '[1/3] Feriado 20/04/2026 inserido para tenant %', v_tenant_id;
  ELSE
    RAISE NOTICE '[1/3] Feriado 20/04/2026 já existe — ativado para tenant %', v_tenant_id;
  END IF;

  -- Garante que Tiradentes (fixed 21/04) não foi desativado por engano
  UPDATE public.company_holidays
  SET is_active  = true,
      updated_at = now()
  WHERE tenant_id    = v_tenant_id
    AND holiday_type = 'fixed'
    AND fixed_day    = 21
    AND fixed_month  = 4
    AND is_active    = false;

  RAISE NOTICE '[1/3] Tiradentes (fixed 21/04) verificado para tenant %', v_tenant_id;
END $$;

-- ============================================================
-- 2. Remover entradas de timesheet do dia 20/04 (feriado)
-- ============================================================
DO $$
DECLARE
  v_tenant_id        UUID;
  v_deleted_project  INT;
  v_deleted_activity INT;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE name ILIKE '%origami%'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant Origami não encontrado';
  END IF;

  -- Deleta via subquery para evitar ambiguidade com JOIN no USING
  DELETE FROM public.project_timesheets
  WHERE work_date = '2026-04-20'
    AND project_member_id IN (
      SELECT pm.id
      FROM public.project_members pm
      JOIN public.projects p ON p.id = pm.project_id
      WHERE p.tenant_id = v_tenant_id
    );
  GET DIAGNOSTICS v_deleted_project = ROW_COUNT;

  DELETE FROM public.activity_timesheets
  WHERE tenant_id = v_tenant_id
    AND work_date = '2026-04-20';
  GET DIAGNOSTICS v_deleted_activity = ROW_COUNT;

  RAISE NOTICE '[2/3] Deletadas % entradas de project_timesheets e % de activity_timesheets para 20/04/2026',
    v_deleted_project, v_deleted_activity;
END $$;

-- ============================================================
-- 3. Recalcular cost snapshots dos funcionários ativos
-- ============================================================
DO $$
DECLARE
  v_tenant_id UUID;
  v_emp       RECORD;
  v_count     INT := 0;
BEGIN
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE name ILIKE '%origami%'
  LIMIT 1;

  FOR v_emp IN
    SELECT id
    FROM public.employees
    WHERE tenant_id = v_tenant_id
      AND status    = 'ativo'
  LOOP
    PERFORM public.recalculate_employee_cost_snapshots(v_emp.id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '[3/3] Cost snapshots recalculados para % funcionários do tenant %',
    v_count, v_tenant_id;
END $$;
