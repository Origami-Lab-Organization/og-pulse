-- Reimbursement approval rules v2
-- Visibility and approval rights now depend on projects.manager_id, not project_members
--
-- Rules:
--   Employee  → sees own requests only
--   Admin     → sees all tenant requests
--   Gerente   → sees own + requests from projects where projects.manager_id = employee.id
--
-- Approval routing (application layer):
--   Employee + project   → approved by project manager (projects.manager_id)
--   Employee + internal  → approved by admin
--   Manager  + project   → auto-approved (status='approved' on insert)
--   Manager  + internal  → approved by admin
--
-- Payment: admin only (unchanged)

-- =========================================================
-- reimbursement_requests: SELECT
-- =========================================================

DROP POLICY IF EXISTS "Users can view own reimbursements"      ON public.reimbursement_requests;
DROP POLICY IF EXISTS "reimbursement_requests_select"          ON public.reimbursement_requests;

CREATE POLICY "reimbursement_requests_select"
  ON public.reimbursement_requests FOR SELECT
  USING (
    -- Solicitante vê seus próprios pedidos
    requested_by IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id
    )
    -- Admin vê tudo no tenant
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND tenant_id = reimbursement_requests.tenant_id
        AND role = 'admin'
    )
    -- Gerente vê pedidos de projetos onde ele é o gerente (manager_id)
    OR (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.auth_id = auth.uid()
          AND e.is_gerente = true
          AND e.tenant_id = reimbursement_requests.tenant_id
      )
      AND EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.employees e ON p.manager_id = e.id
        WHERE e.auth_id = auth.uid()
          AND p.id = reimbursement_requests.project_id
      )
    )
    -- Quem revisou ainda pode ver (para histórico)
    OR reviewed_by IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id
    )
  );

-- =========================================================
-- reimbursement_requests: UPDATE
-- =========================================================

DROP POLICY IF EXISTS "Managers can update reimbursements"     ON public.reimbursement_requests;
DROP POLICY IF EXISTS "reimbursement_requests_update"          ON public.reimbursement_requests;

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
    -- Gerente pode atualizar pedidos de projetos que gerencia
    OR (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.auth_id = auth.uid()
          AND e.is_gerente = true
          AND e.tenant_id = reimbursement_requests.tenant_id
      )
      AND EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.employees e ON p.manager_id = e.id
        WHERE e.auth_id = auth.uid()
          AND p.id = reimbursement_requests.project_id
      )
    )
    -- Gerente pode atualizar seus próprios pedidos (ex: correção)
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
              SELECT 1 FROM public.projects p
              JOIN public.employees e ON p.manager_id = e.id
              WHERE e.auth_id = auth.uid() AND p.id = rr.project_id
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
              SELECT 1 FROM public.projects p
              JOIN public.employees e ON p.manager_id = e.id
              WHERE e.auth_id = auth.uid() AND p.id = rr.project_id
            )
          )
          OR rr.reviewed_by IN (
            SELECT id FROM public.employees
            WHERE auth_id = auth.uid() AND tenant_id = rr.tenant_id
          )
        )
    )
  );
