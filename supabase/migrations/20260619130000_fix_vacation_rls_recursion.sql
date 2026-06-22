-- Corrige recursão infinita de RLS (Postgres 42P17) entre vacation_requests e
-- vacation_request_approvals: as policies originais se referenciavam mutuamente
-- (a de requests consultava approvals e vice-versa), o que o Postgres rejeita.
--
-- Solução (mesmo padrão de can_manage_project / has_role): mover as buscas
-- cruzadas para helpers SECURITY DEFINER, que ignoram RLS e quebram o ciclo.

-- =========================================================
-- Helpers SECURITY DEFINER
-- =========================================================

-- É aprovador (tem linha de aprovação) do pedido?  Usado pelas policies de vacation_requests.
CREATE OR REPLACE FUNCTION public.is_vacation_approver(_request_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vacation_request_approvals a
    JOIN public.employees e ON e.id = a.approver_id
    WHERE a.request_id = _request_id
      AND e.auth_id = _user_id
  );
$$;

COMMENT ON FUNCTION public.is_vacation_approver(uuid, uuid)
IS 'RLS helper: verdadeiro se o usuário é aprovador do pedido de férias. SECURITY DEFINER para evitar recursão de policy.';

-- É o solicitante OU admin do tenant do pedido?  Usado pelas policies de approvals (select/insert).
CREATE OR REPLACE FUNCTION public.vacation_request_owner_or_admin(_request_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vacation_requests r
    LEFT JOIN public.employees e ON e.id = r.employee_id
    WHERE r.id = _request_id
      AND (e.auth_id = _user_id OR public.has_role(_user_id, r.tenant_id, 'admin'))
  );
$$;

COMMENT ON FUNCTION public.vacation_request_owner_or_admin(uuid, uuid)
IS 'RLS helper: verdadeiro para o solicitante do pedido ou admin do tenant. SECURITY DEFINER para evitar recursão de policy.';

-- É admin do tenant do pedido?  Usado pela policy de UPDATE de approvals (decisão restrita).
CREATE OR REPLACE FUNCTION public.vacation_request_is_admin(_request_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vacation_requests r
    WHERE r.id = _request_id
      AND public.has_role(_user_id, r.tenant_id, 'admin')
  );
$$;

COMMENT ON FUNCTION public.vacation_request_is_admin(uuid, uuid)
IS 'RLS helper: verdadeiro se o usuário é admin do tenant do pedido. SECURITY DEFINER para evitar recursão de policy.';

-- =========================================================
-- vacation_requests — recriar policies sem auto-referência cruzada
-- =========================================================

DROP POLICY IF EXISTS "vacation_requests_select" ON public.vacation_requests;
CREATE POLICY "vacation_requests_select"
  ON public.vacation_requests FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = vacation_requests.tenant_id
    )
    OR public.has_role(auth.uid(), tenant_id, 'admin')
    OR public.is_vacation_approver(id, auth.uid())
  );

DROP POLICY IF EXISTS "vacation_requests_update" ON public.vacation_requests;
CREATE POLICY "vacation_requests_update"
  ON public.vacation_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), tenant_id, 'admin')
    OR employee_id IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = vacation_requests.tenant_id
    )
    OR public.is_vacation_approver(id, auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), tenant_id, 'admin')
    OR public.is_vacation_approver(id, auth.uid())
    OR (
      employee_id IN (
        SELECT id FROM public.employees
        WHERE auth_id = auth.uid() AND tenant_id = vacation_requests.tenant_id
      )
      AND status = 'cancelled'
    )
  );

-- vacation_requests_insert não referencia approvals — permanece como criado na migration anterior.

-- =========================================================
-- vacation_request_approvals — recriar policies sem auto-referência cruzada
-- =========================================================

DROP POLICY IF EXISTS "vacation_approvals_select" ON public.vacation_request_approvals;
CREATE POLICY "vacation_approvals_select"
  ON public.vacation_request_approvals FOR SELECT TO authenticated
  USING (
    approver_id IN (
      SELECT id FROM public.employees WHERE auth_id = auth.uid()
    )
    OR public.vacation_request_owner_or_admin(request_id, auth.uid())
  );

DROP POLICY IF EXISTS "vacation_approvals_insert" ON public.vacation_request_approvals;
CREATE POLICY "vacation_approvals_insert"
  ON public.vacation_request_approvals FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND public.vacation_request_owner_or_admin(request_id, auth.uid())
  );

DROP POLICY IF EXISTS "vacation_approvals_update" ON public.vacation_request_approvals;
CREATE POLICY "vacation_approvals_update"
  ON public.vacation_request_approvals FOR UPDATE TO authenticated
  USING (
    approver_id IN (
      SELECT id FROM public.employees WHERE auth_id = auth.uid()
    )
    OR public.vacation_request_is_admin(request_id, auth.uid())
  )
  WITH CHECK (
    approver_id IN (
      SELECT id FROM public.employees WHERE auth_id = auth.uid()
    )
    OR public.vacation_request_is_admin(request_id, auth.uid())
  );
