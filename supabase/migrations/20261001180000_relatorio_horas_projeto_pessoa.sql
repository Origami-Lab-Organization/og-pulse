-- Relatório de horas por projeto e pessoa: planejado (alocação) × lançado (timesheet) no período.
-- Pedido do time em 01/10/2026 ("ver as horas executadas por pessoa e por projeto").
--
-- Só HORAS, nunca custo-hora (ADR-0025): `project_timesheets` carrega `cost_per_hour`, e quem lê
-- hora de terceiro lê por RPC com projeção fixa. Cada projeto passa por `can_read_project_hours`
-- (financeiro:ler ou membro alocado), a mesma regra das outras leituras de hora.
--
-- Guarda de tenant em wrapper plpgsql + corpo SQL `_unguarded` (padrão da ADR-0021): em plpgsql,
-- as colunas do RETURNS TABLE viram variáveis e colidem com as colunas do SELECT.
--
-- O período é por mês: o planejado mora em (ano, mês), então o relatório pega os meses que tocam
-- o intervalo e o lançado pelos dias do intervalo. A tela sempre manda do 1º ao último dia.
--
-- Rollback: supabase/rollback/20261001180000_relatorio_horas_projeto_pessoa_rollback.sql

CREATE FUNCTION public.project_hours_by_person_unguarded(p_tenant_id uuid, p_from date, p_to date)
RETURNS TABLE (
  project_id uuid, project_name text, client_name text,
  employee_id uuid, employee_name text,
  planned_hours numeric, logged_hours numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH projetos AS (
    SELECT p.id, p.name, cl.company_name
      FROM public.projects p
      LEFT JOIN public.clients cl ON cl.id = p.client_id
     WHERE p.tenant_id = p_tenant_id
       AND public.can_read_project_hours(p.id)
  ), lancado AS (
    SELECT ts.project_id, pm.employee_id, sum(ts.hours) AS horas
      FROM public.project_timesheets ts
      JOIN projetos pr ON pr.id = ts.project_id
      LEFT JOIN public.project_members pm ON pm.id = ts.project_member_id
     WHERE ts.work_date BETWEEN p_from AND p_to
     GROUP BY ts.project_id, pm.employee_id
  ), planejado AS (
    SELECT a.project_id, a.employee_id, sum(a.planned_hours) AS horas
      FROM public.project_role_allocations a
      JOIN projetos pr ON pr.id = a.project_id
     WHERE make_date(a.year, a.month, 1) BETWEEN date_trunc('month', p_from)::date AND p_to
     GROUP BY a.project_id, a.employee_id
  ), chaves AS (
    SELECT l.project_id, l.employee_id FROM lancado l
    UNION
    SELECT pl.project_id, pl.employee_id FROM planejado pl
  )
  SELECT k.project_id, pr.name, pr.company_name, k.employee_id, e.nome,
         coalesce(pl.horas, 0), coalesce(la.horas, 0)
    FROM chaves k
    JOIN projetos pr ON pr.id = k.project_id
    LEFT JOIN public.employees e ON e.id = k.employee_id
    LEFT JOIN planejado pl ON pl.project_id = k.project_id AND pl.employee_id IS NOT DISTINCT FROM k.employee_id
    LEFT JOIN lancado la ON la.project_id = k.project_id AND la.employee_id IS NOT DISTINCT FROM k.employee_id
   WHERE coalesce(pl.horas, 0) > 0 OR coalesce(la.horas, 0) > 0
$$;

REVOKE ALL ON FUNCTION public.project_hours_by_person_unguarded(uuid, date, date) FROM public, anon, authenticated;

CREATE FUNCTION public.project_hours_by_person(p_tenant_id uuid, p_from date, p_to date)
RETURNS TABLE (
  project_id uuid, project_name text, client_name text,
  employee_id uuid, employee_name text,
  planned_hours numeric, logged_hours numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Escolha um período válido.' USING ERRCODE = 'PU001';
  END IF;
  RETURN QUERY SELECT * FROM public.project_hours_by_person_unguarded(p_tenant_id, p_from, p_to);
END;
$$;

REVOKE ALL ON FUNCTION public.project_hours_by_person(uuid, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.project_hours_by_person(uuid, date, date) TO authenticated;
