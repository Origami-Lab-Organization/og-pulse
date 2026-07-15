-- ─────────────────────────────────────────────────────────────────────────────
-- Refatoração da aba Equipe sobre project_role_allocations (ADR-0006)
--
-- 1) Corrige RLS quebrada de project_role_allocations: a migration
--    20260526145410 recriou as policies soltas "Tenant members can
--    insert/update/delete" sem apagar as *_admin_or_pm criadas em
--    20260526110000. Policies permissivas do Postgres são combinadas por OR,
--    então hoje qualquer membro do tenant pode escrever na tabela. Corrigido
--    aqui removendo as policies soltas e adicionando membro-próprio ao SELECT.
-- 2) project_team_rows / project_team_row_months: vagas manuais (sem papel
--    orçado) e status de desalocação/reativação de membro. Vaga orçada
--    continua derivada client-side de budget_roles/filled — não persiste
--    nada até alguém ser atribuído.
-- 3) project_role_allocation_edit_logs: auditoria de edição retroativa de
--    horas PLANEJADAS (distinto de timesheet_edit_logs, que é sobre horas
--    realizadas).
-- 4) Triggers de defesa em profundidade: bloquear edição de mês passado por
--    não-admin, e bloquear exclusão de alocação com horas realizadas.
-- 5) RPC transacional de desalocação.
--
-- Idempotente: seguro rodar de novo caso uma execução anterior tenha parado
-- no meio (DROP ... IF EXISTS antes de cada CREATE POLICY/TRIGGER, IF NOT
-- EXISTS em TABLE/INDEX; CREATE OR REPLACE FUNCTION já é idempotente).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) RLS de project_role_allocations
DROP POLICY IF EXISTS "Tenant members can view project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "Tenant members can insert project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "Tenant members can update project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "Tenant members can delete project_role_allocations" ON public.project_role_allocations;

DROP POLICY IF EXISTS "project_role_allocations_select_admin_manager_or_member" ON public.project_role_allocations;
CREATE POLICY "project_role_allocations_select_admin_manager_or_member"
ON public.project_role_allocations FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.can_manage_project(auth.uid(), project_id)
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = project_role_allocations.employee_id AND e.auth_id = auth.uid()
  )
);

-- 2) project_team_rows / project_team_row_months
CREATE TABLE IF NOT EXISTS public.project_team_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  row_type text NOT NULL CHECK (row_type IN ('vacancy', 'member_status')),
  budget_role_id uuid REFERENCES public.budget_roles(id),
  custom_role_name text,
  employee_id uuid REFERENCES public.employees(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deallocated')),
  deallocated_at timestamptz,
  deallocated_by uuid REFERENCES auth.users(id),
  reactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_team_rows_shape CHECK (
    (row_type = 'vacancy' AND employee_id IS NULL)
    OR (row_type = 'member_status' AND employee_id IS NOT NULL AND budget_role_id IS NULL AND custom_role_name IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS project_team_rows_member_unique
  ON public.project_team_rows(project_id, employee_id) WHERE row_type = 'member_status';

CREATE INDEX IF NOT EXISTS idx_project_team_rows_project ON public.project_team_rows(project_id);

DROP TRIGGER IF EXISTS update_project_team_rows_updated_at ON public.project_team_rows;
CREATE TRIGGER update_project_team_rows_updated_at
BEFORE UPDATE ON public.project_team_rows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.project_team_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_team_rows_select_admin_manager_or_member" ON public.project_team_rows;
CREATE POLICY "project_team_rows_select_admin_manager_or_member"
ON public.project_team_rows FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), tenant_id, 'admin')
  OR public.can_manage_project(auth.uid(), project_id)
  OR EXISTS (
    SELECT 1 FROM public.project_role_allocations pra
    JOIN public.employees e ON e.id = pra.employee_id
    WHERE pra.project_id = project_team_rows.project_id AND e.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "project_team_rows_insert_admin_or_pm" ON public.project_team_rows;
CREATE POLICY "project_team_rows_insert_admin_or_pm"
ON public.project_team_rows FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_team_rows_update_admin_or_pm" ON public.project_team_rows;
CREATE POLICY "project_team_rows_update_admin_or_pm"
ON public.project_team_rows FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_team_rows_delete_admin_or_pm" ON public.project_team_rows;
CREATE POLICY "project_team_rows_delete_admin_or_pm"
ON public.project_team_rows FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

CREATE TABLE IF NOT EXISTS public.project_team_row_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES public.project_team_rows(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_hours numeric(6,1) NOT NULL DEFAULT 0 CHECK (planned_hours >= 0),
  UNIQUE (row_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_project_team_row_months_row ON public.project_team_row_months(row_id);

ALTER TABLE public.project_team_row_months ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_team_row_months_select_admin_manager_or_member" ON public.project_team_row_months;
CREATE POLICY "project_team_row_months_select_admin_manager_or_member"
ON public.project_team_row_months FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team_rows r
    WHERE r.id = project_team_row_months.row_id
      AND (
        public.has_role(auth.uid(), r.tenant_id, 'admin')
        OR public.can_manage_project(auth.uid(), r.project_id)
        OR EXISTS (
          SELECT 1 FROM public.project_role_allocations pra
          JOIN public.employees e ON e.id = pra.employee_id
          WHERE pra.project_id = r.project_id AND e.auth_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "project_team_row_months_insert_admin_or_pm" ON public.project_team_row_months;
CREATE POLICY "project_team_row_months_insert_admin_or_pm"
ON public.project_team_row_months FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_team_rows r WHERE r.id = row_id AND public.can_manage_project(auth.uid(), r.project_id))
);

DROP POLICY IF EXISTS "project_team_row_months_update_admin_or_pm" ON public.project_team_row_months;
CREATE POLICY "project_team_row_months_update_admin_or_pm"
ON public.project_team_row_months FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.project_team_rows r WHERE r.id = row_id AND public.can_manage_project(auth.uid(), r.project_id))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.project_team_rows r WHERE r.id = row_id AND public.can_manage_project(auth.uid(), r.project_id))
);

DROP POLICY IF EXISTS "project_team_row_months_delete_admin_or_pm" ON public.project_team_row_months;
CREATE POLICY "project_team_row_months_delete_admin_or_pm"
ON public.project_team_row_months FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.project_team_rows r WHERE r.id = row_id AND public.can_manage_project(auth.uid(), r.project_id))
);

-- 3) Auditoria de edição retroativa de horas planejadas
CREATE TABLE IF NOT EXISTS public.project_role_allocation_edit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES public.project_role_allocations(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL REFERENCES auth.users(id),
  previous_hours numeric(6,1) NOT NULL,
  new_hours numeric(6,1) NOT NULL,
  reason_code text,
  justification text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_role_allocation_edit_logs_allocation ON public.project_role_allocation_edit_logs(allocation_id);

ALTER TABLE public.project_role_allocation_edit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_role_allocation_edit_logs_select_admin_or_pm" ON public.project_role_allocation_edit_logs;
CREATE POLICY "project_role_allocation_edit_logs_select_admin_or_pm"
ON public.project_role_allocation_edit_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_role_allocations pra
    WHERE pra.id = project_role_allocation_edit_logs.allocation_id
      AND public.can_manage_project(auth.uid(), pra.project_id)
  )
);

DROP POLICY IF EXISTS "project_role_allocation_edit_logs_insert_admin_or_pm" ON public.project_role_allocation_edit_logs;
CREATE POLICY "project_role_allocation_edit_logs_insert_admin_or_pm"
ON public.project_role_allocation_edit_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_role_allocations pra
    WHERE pra.id = project_role_allocation_edit_logs.allocation_id
      AND public.can_manage_project(auth.uid(), pra.project_id)
  )
);

-- 4a) Bloqueia edição de horas planejadas em mês passado por não-admin
CREATE OR REPLACE FUNCTION public.enforce_past_month_allocation_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.planned_hours IS DISTINCT FROM OLD.planned_hours
     AND make_date(OLD.year, OLD.month, 1) < date_trunc('month', now())::date
     AND NOT public.has_role(auth.uid(), OLD.tenant_id, 'admin')
  THEN
    RAISE EXCEPTION 'Apenas admin pode editar horas planejadas de meses passados';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_past_month_allocation_edit ON public.project_role_allocations;
CREATE TRIGGER enforce_past_month_allocation_edit
BEFORE UPDATE OF planned_hours ON public.project_role_allocations
FOR EACH ROW EXECUTE FUNCTION public.enforce_past_month_allocation_edit();

-- 4b) Bloqueia exclusão de alocação com horas realizadas
CREATE OR REPLACE FUNCTION public.project_employee_has_actual_hours(
  p_project_id uuid,
  p_employee_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_timesheets pt
    JOIN public.project_members pm ON pm.id = pt.project_member_id
    WHERE pm.project_id = p_project_id
      AND pm.employee_id = p_employee_id
      AND pt.hours > 0
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_no_delete_with_actual_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.project_employee_has_actual_hours(OLD.project_id, OLD.employee_id) THEN
    RAISE EXCEPTION 'Não é possível excluir: existem horas realizadas. Desative em vez de excluir.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS enforce_no_delete_with_actual_hours ON public.project_role_allocations;
CREATE TRIGGER enforce_no_delete_with_actual_hours
BEFORE DELETE ON public.project_role_allocations
FOR EACH ROW EXECUTE FUNCTION public.enforce_no_delete_with_actual_hours();

-- 5) RPC transacional de desalocação: zera meses futuros + marca status
CREATE OR REPLACE FUNCTION public.deallocate_project_member(
  p_project_id uuid,
  p_employee_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF NOT public.can_manage_project(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Sem permissão para desalocar neste projeto';
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.projects WHERE id = p_project_id;

  UPDATE public.project_role_allocations
  SET planned_hours = 0
  WHERE project_id = p_project_id
    AND employee_id = p_employee_id
    AND make_date(year, month, 1) > date_trunc('month', now())::date;

  INSERT INTO public.project_team_rows (project_id, tenant_id, row_type, employee_id, status, deallocated_at, deallocated_by)
  VALUES (p_project_id, v_tenant_id, 'member_status', p_employee_id, 'deallocated', now(), auth.uid())
  ON CONFLICT (project_id, employee_id) WHERE row_type = 'member_status'
  DO UPDATE SET status = 'deallocated', deallocated_at = now(), deallocated_by = auth.uid(), reactivated_at = NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_project_member(
  p_project_id uuid,
  p_employee_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_project(auth.uid(), p_project_id) THEN
    RAISE EXCEPTION 'Sem permissão para reativar neste projeto';
  END IF;

  UPDATE public.project_team_rows
  SET status = 'active', reactivated_at = now()
  WHERE project_id = p_project_id
    AND employee_id = p_employee_id
    AND row_type = 'member_status';
END;
$$;

-- 6) Atribuir pessoa a uma vaga MANUAL (sem papel orçado): copia as horas
-- planejadas da vaga para project_role_allocations e apaga a vaga, numa
-- única transação (evita vaga e alocação coexistindo se uma etapa falhar).
CREATE OR REPLACE FUNCTION public.assign_employee_to_vacancy_row(
  p_row_id uuid,
  p_employee_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.project_team_rows%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.project_team_rows WHERE id = p_row_id AND row_type = 'vacancy';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vaga não encontrada';
  END IF;

  IF NOT public.can_manage_project(auth.uid(), v_row.project_id) THEN
    RAISE EXCEPTION 'Sem permissão para atribuir pessoa neste projeto';
  END IF;

  INSERT INTO public.project_role_allocations (project_id, tenant_id, employee_id, budget_role_id, custom_role_name, year, month, planned_hours)
  SELECT v_row.project_id, v_row.tenant_id, p_employee_id, v_row.budget_role_id, v_row.custom_role_name, rm.year, rm.month, rm.planned_hours
  FROM public.project_team_row_months rm
  WHERE rm.row_id = p_row_id
  ON CONFLICT (employee_id, project_id, year, month)
  DO UPDATE SET planned_hours = EXCLUDED.planned_hours;

  DELETE FROM public.project_team_rows WHERE id = p_row_id;
END;
$$;
