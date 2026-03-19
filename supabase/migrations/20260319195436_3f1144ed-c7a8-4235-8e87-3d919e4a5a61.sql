-- Reimbursement: permissões por projeto para gerentes
-- Idempotente — usa DROP IF EXISTS antes de recriar

-- =========================================================
-- reimbursement_requests: SELECT + UPDATE
-- =========================================================

DROP POLICY IF EXISTS "Users can view own reimbursements"      ON public.reimbursement_requests;
DROP POLICY IF EXISTS "Managers can update reimbursements"     ON public.reimbursement_requests;
DROP POLICY IF EXISTS "reimbursement_requests_select"          ON public.reimbursement_requests;
DROP POLICY IF EXISTS "reimbursement_requests_update"          ON public.reimbursement_requests;

CREATE POLICY "reimbursement_requests_select"
  ON public.reimbursement_requests FOR SELECT
  USING (
    requested_by IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND tenant_id = reimbursement_requests.tenant_id
        AND role = 'admin'
    )
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
    OR reviewed_by IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id
    )
  );

CREATE POLICY "reimbursement_requests_update"
  ON public.reimbursement_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND tenant_id = reimbursement_requests.tenant_id
        AND role = 'admin'
    )
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
    OR requested_by IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid()
        AND tenant_id = reimbursement_requests.tenant_id
        AND is_gerente = true
    )
  );

-- =========================================================
-- reimbursement_attachments: SELECT
-- =========================================================

DROP POLICY IF EXISTS "Users can view own reimbursement attachments" ON public.reimbursement_attachments;
DROP POLICY IF EXISTS "reimbursement_attachments_select"             ON public.reimbursement_attachments;

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
DROP POLICY IF EXISTS "reimbursement_items_select"                   ON public.reimbursement_items;

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