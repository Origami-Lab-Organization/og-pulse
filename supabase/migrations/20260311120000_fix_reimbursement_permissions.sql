-- Fix reimbursement permissions:
-- 1. Restrict manager (is_gerente) visibility to projects they belong to
-- 2. Admin sees everything
-- 3. Employees see only their own requests
-- 4. Anyone who reviewed a request can still see it

-- =========================================================
-- reimbursement_requests: SELECT + UPDATE
-- =========================================================

DROP POLICY IF EXISTS "Users can view own reimbursements" ON public.reimbursement_requests;
DROP POLICY IF EXISTS "Managers can update reimbursements" ON public.reimbursement_requests;

CREATE POLICY "reimbursement_requests_select"
  ON public.reimbursement_requests FOR SELECT
  USING (
    -- Solicitante vê seus próprios pedidos
    requested_by IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id
    )
    -- Admin vê tudo
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND tenant_id = reimbursement_requests.tenant_id
        AND role = 'admin'
    )
    -- Gerente vê pedidos de projetos em que está alocado (qualquer role em project_members)
    OR (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.auth_id = auth.uid()
          AND e.is_gerente = true
          AND e.tenant_id = reimbursement_requests.tenant_id
      )
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        JOIN public.employees e ON pm.employee_id = e.id
        WHERE e.auth_id = auth.uid()
          AND pm.project_id = reimbursement_requests.project_id
      )
    )
    -- Gerente vê pedidos que já revisou (aprovados/rejeitados por ele)
    OR reviewed_by IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id
    )
  );

CREATE POLICY "reimbursement_requests_update"
  ON public.reimbursement_requests FOR UPDATE
  USING (
    -- Admin pode atualizar tudo
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND tenant_id = reimbursement_requests.tenant_id
        AND role = 'admin'
    )
    -- Gerente pode atualizar pedidos de projetos em que está alocado
    OR (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.auth_id = auth.uid()
          AND e.is_gerente = true
          AND e.tenant_id = reimbursement_requests.tenant_id
      )
      AND EXISTS (
        SELECT 1 FROM public.project_members pm
        JOIN public.employees e ON pm.employee_id = e.id
        WHERE e.auth_id = auth.uid()
          AND pm.project_id = reimbursement_requests.project_id
      )
    )
  );

-- =========================================================
-- reimbursement_attachments: SELECT
-- =========================================================

DROP POLICY IF EXISTS "Users can view own reimbursement attachments" ON public.reimbursement_attachments;

CREATE POLICY "reimbursement_attachments_select"
  ON public.reimbursement_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_attachments.reimbursement_id
        AND (
          rr.requested_by IN (
            SELECT id FROM public.employees
            WHERE auth_id = auth.uid() AND tenant_id = rr.tenant_id
          )
          OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND tenant_id = rr.tenant_id AND role = 'admin'
          )
          OR (
            rr.project_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.employees e
              WHERE e.auth_id = auth.uid() AND e.is_gerente = true AND e.tenant_id = rr.tenant_id
            )
            AND EXISTS (
              SELECT 1 FROM public.project_members pm
              JOIN public.employees e ON pm.employee_id = e.id
              WHERE e.auth_id = auth.uid() AND pm.project_id = rr.project_id
            )
          )
          OR rr.reviewed_by IN (
            SELECT id FROM public.employees
            WHERE auth_id = auth.uid() AND tenant_id = rr.tenant_id
          )
        )
    )
  );

-- =========================================================
-- reimbursement_items: SELECT
-- =========================================================

DROP POLICY IF EXISTS "Users can view items of their reimbursements" ON public.reimbursement_items;

CREATE POLICY "reimbursement_items_select"
  ON public.reimbursement_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_items.reimbursement_id
        AND (
          rr.requested_by IN (
            SELECT id FROM public.employees
            WHERE auth_id = auth.uid() AND tenant_id = rr.tenant_id
          )
          OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND tenant_id = rr.tenant_id AND role = 'admin'
          )
          OR (
            rr.project_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.employees e
              WHERE e.auth_id = auth.uid() AND e.is_gerente = true AND e.tenant_id = rr.tenant_id
            )
            AND EXISTS (
              SELECT 1 FROM public.project_members pm
              JOIN public.employees e ON pm.employee_id = e.id
              WHERE e.auth_id = auth.uid() AND pm.project_id = rr.project_id
            )
          )
          OR rr.reviewed_by IN (
            SELECT id FROM public.employees
            WHERE auth_id = auth.uid() AND tenant_id = rr.tenant_id
          )
        )
    )
  );
