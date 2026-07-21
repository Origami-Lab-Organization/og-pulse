-- Corrige erro de sintaxe em recalculate_employee_cost_snapshots_for_active_projects()
-- (criada em 20260721160000_employee_cost_snapshot_admission_termination_window.sql):
-- o UPDATE de project_timesheets referenciava a própria tabela-alvo (pt) dentro do ON de
-- um JOIN do FROM — "invalid reference to FROM-clause entry for table pt" (42P01). Em
-- UPDATE ... FROM, a tabela-alvo só pode ser referenciada no WHERE/SET, nunca dentro do
-- ON de um JOIN da cláusula FROM. Move o filtro de projeto ativo para o WHERE.
CREATE OR REPLACE FUNCTION public.recalculate_employee_cost_snapshots_for_active_projects()
RETURNS TABLE(updated_member_months integer, updated_role_allocations integer, updated_timesheets integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_months integer;
  v_role_allocations integer;
  v_timesheets integer;
BEGIN
  UPDATE public.project_member_months pmm
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    p.tenant_id, pm.employee_id,
    (date_trunc('month', p.start_date)::date + ((pmm.month_number - 1) * interval '1 month'))::date
  )
  FROM public.project_members pm
  JOIN public.projects p ON p.id = pm.project_id
  WHERE pmm.project_member_id = pm.id
    AND p.status = 'active';
  GET DIAGNOSTICS v_member_months = ROW_COUNT;

  UPDATE public.project_role_allocations pra
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)
  )
  FROM public.projects p
  WHERE pra.project_id = p.id
    AND p.status = 'active';
  GET DIAGNOSTICS v_role_allocations = ROW_COUNT;

  UPDATE public.project_timesheets pt
  SET cost_per_hour = public.calculate_employee_hourly_cost_for_month(
    e.tenant_id, e.id, date_trunc('month', pt.work_date)::date
  )
  FROM public.project_members pm,
       public.employees e,
       public.projects p
  WHERE pt.project_member_id = pm.id
    AND e.id = pm.employee_id
    AND p.id = pt.project_id
    AND p.status = 'active';
  GET DIAGNOSTICS v_timesheets = ROW_COUNT;

  RETURN QUERY SELECT v_member_months, v_role_allocations, v_timesheets;
END;
$$;
