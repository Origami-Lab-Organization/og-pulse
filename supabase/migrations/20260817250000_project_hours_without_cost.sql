-- PUL-164 (3a onda) — cost_per_hour deixa de ser legível por colega.
--
-- Problema:
--   `project_member_months.cost_per_hour` e `project_timesheets.cost_per_hour` são
--   custo por hora do colaborador (derivado de salário e encargos). As duas tabelas
--   tinham SELECT tenant-wide porque o funcionário precisa ler HORAS delas — as suas
--   e as dos colegas, para a aba Alocação de /my-projects/:id e os totais de projeto.
--   Como RLS é row-level, liberar a linha liberava o custo junto.
--
-- Por que não mover a coluna (como foi feito com projects.total_value no ADR-0024):
--   `cost_per_hour` é preenchido por triggers BEFORE INSERT/UPDATE
--   (set_project_member_month_cost_per_hour, set_project_timesheet_cost_per_hour) e
--   recalculado em lote por recalculate_employee_cost_snapshots. Mover a coluna
--   exigiria cirurgia nesses triggers — matemática de custo. Erro ali é silencioso e
--   contamina margem de projeto. Optou-se por restringir a linha e servir as horas
--   por RPC, que não toca no cálculo.
--
-- Decisão:
--   1. SELECT nas duas tabelas passa a exigir admin/gerente OU a própria linha.
--      Funcionário ver o PRÓPRIO cost_per_hour não é vazamento: é dado dele,
--      derivado do salário que ele já conhece. O que fecha é ver o do colega.
--   2. As horas de terceiros passam a vir de RPCs SECURITY DEFINER com projeção
--      fixa, que devolvem exatamente o mesmo shape que as consultas atuais usavam,
--      menos cost_per_hour — assim a agregação do frontend não muda.
--
-- Ver ADR-0025.

-- 1. Autorização única para leitura de horas de projeto -------------------------
CREATE OR REPLACE FUNCTION public.can_read_project_hours(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND (
        public.is_admin_or_manager(auth.uid(), p.tenant_id)
        OR EXISTS (
          SELECT 1
          FROM public.project_members pm
          JOIN public.employees e ON e.id = pm.employee_id
          WHERE pm.project_id = p.id
            AND e.auth_id = auth.uid()
        )
      )
  );
$$;

COMMENT ON FUNCTION public.can_read_project_hours(uuid) IS
  'Quem pode ver as horas de um projeto: admin, gerente do tenant ou membro alocado. '
  'Base das RPCs de horas que substituem a leitura direta das tabelas (PUL-164).';

GRANT EXECUTE ON FUNCTION public.can_read_project_hours(uuid) TO authenticated;

-- 2. Horas planejadas por membro (project_member_months, sem custo) -------------
CREATE OR REPLACE FUNCTION public.get_member_planned_hours(p_member_ids uuid[])
RETURNS TABLE (
  project_member_id uuid,
  month_number      integer,
  hours             numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mm.project_member_id, mm.month_number, mm.hours
  FROM public.project_member_months mm
  JOIN public.project_members pm ON pm.id = mm.project_member_id
  WHERE mm.project_member_id = ANY(p_member_ids)
    AND public.can_read_project_hours(pm.project_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_member_planned_hours(uuid[]) TO authenticated;

-- 3. Horas lançadas por membro (project_timesheets, sem custo) -----------------
CREATE OR REPLACE FUNCTION public.get_member_actual_hours(p_member_ids uuid[])
RETURNS TABLE (
  project_member_id uuid,
  work_date         date,
  hours             numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ts.project_member_id, ts.work_date, ts.hours
  FROM public.project_timesheets ts
  JOIN public.project_members pm ON pm.id = ts.project_member_id
  WHERE ts.project_member_id = ANY(p_member_ids)
    AND public.can_read_project_hours(pm.project_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_member_actual_hours(uuid[]) TO authenticated;

-- 4. Total lançado por projeto -------------------------------------------------
--
-- Existe separado das duas acima porque /my-projects soma o realizado por
-- project_id, e um lançamento pode ter project_id sem project_member_id. Agregar
-- por membro mudaria o número exibido.
CREATE OR REPLACE FUNCTION public.get_project_actual_hours(p_project_ids uuid[])
RETURNS TABLE (
  project_id uuid,
  hours      numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ts.project_id, SUM(ts.hours) AS hours
  FROM public.project_timesheets ts
  WHERE ts.project_id = ANY(p_project_ids)
    AND public.can_read_project_hours(ts.project_id)
  GROUP BY ts.project_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_actual_hours(uuid[]) TO authenticated;

-- 5. SELECT das tabelas: admin/gerente ou a própria linha ----------------------
--
-- project_member_months tinha DUAS policies SELECT sobrepostas, de migrations
-- diferentes. Como policies somam por OR, bastava a mais permissiva valer — as duas
-- são removidas.
DROP POLICY IF EXISTS "Users can view project member months in their tenant" ON public.project_member_months;
DROP POLICY IF EXISTS "Tenant members can view project_member_months" ON public.project_member_months;

CREATE POLICY "Managers or the person can view member months"
ON public.project_member_months
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.projects p ON p.id = pm.project_id
    LEFT JOIN public.employees e ON e.id = pm.employee_id
    WHERE pm.id = project_member_months.project_member_id
      AND (
        public.is_admin_or_manager(auth.uid(), p.tenant_id)
        OR e.auth_id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "Users can view project timesheets in their tenant" ON public.project_timesheets;

CREATE POLICY "Managers or the person can view project timesheets"
ON public.project_timesheets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = project_timesheets.project_id
      AND public.is_admin_or_manager(auth.uid(), p.tenant_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.employees e ON e.id = pm.employee_id
    WHERE pm.id = project_timesheets.project_member_id
      AND e.auth_id = auth.uid()
  )
);
