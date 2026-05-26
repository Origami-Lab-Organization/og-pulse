-- Seguindo .harness/patterns/security.md e mitigando OWASP A01:
-- RLS continua sendo a fonte de verdade para acesso ao modulo Estrategia.
-- Managers podem manter iniciativas; OKRs, ciclos, check-ins e guardrails seguem admin-only para escrita.

-- ─── Drop existing strategy policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "tenant isolation" ON public.strategy_cycles;
DROP POLICY IF EXISTS "tenant_read_cycles" ON public.strategy_cycles;
DROP POLICY IF EXISTS "tenant_insert_cycles" ON public.strategy_cycles;
DROP POLICY IF EXISTS "tenant_update_cycles" ON public.strategy_cycles;
DROP POLICY IF EXISTS "tenant_delete_cycles" ON public.strategy_cycles;
DROP POLICY IF EXISTS "strategy_cycles_select_tenant" ON public.strategy_cycles;
DROP POLICY IF EXISTS "strategy_cycles_insert_admin" ON public.strategy_cycles;
DROP POLICY IF EXISTS "strategy_cycles_update_admin" ON public.strategy_cycles;
DROP POLICY IF EXISTS "strategy_cycles_delete_admin" ON public.strategy_cycles;

DROP POLICY IF EXISTS "tenant isolation" ON public.strategy_objectives;
DROP POLICY IF EXISTS "tenant_read_objectives" ON public.strategy_objectives;
DROP POLICY IF EXISTS "tenant_insert_objectives" ON public.strategy_objectives;
DROP POLICY IF EXISTS "tenant_update_objectives" ON public.strategy_objectives;
DROP POLICY IF EXISTS "tenant_delete_objectives" ON public.strategy_objectives;
DROP POLICY IF EXISTS "strategy_objectives_select_tenant" ON public.strategy_objectives;
DROP POLICY IF EXISTS "strategy_objectives_insert_admin" ON public.strategy_objectives;
DROP POLICY IF EXISTS "strategy_objectives_update_admin" ON public.strategy_objectives;
DROP POLICY IF EXISTS "strategy_objectives_delete_admin" ON public.strategy_objectives;

DROP POLICY IF EXISTS "tenant isolation" ON public.strategy_key_results;
DROP POLICY IF EXISTS "tenant_read_krs" ON public.strategy_key_results;
DROP POLICY IF EXISTS "tenant_insert_krs" ON public.strategy_key_results;
DROP POLICY IF EXISTS "tenant_update_krs" ON public.strategy_key_results;
DROP POLICY IF EXISTS "tenant_delete_krs" ON public.strategy_key_results;
DROP POLICY IF EXISTS "strategy_key_results_select_tenant" ON public.strategy_key_results;
DROP POLICY IF EXISTS "strategy_key_results_insert_admin" ON public.strategy_key_results;
DROP POLICY IF EXISTS "strategy_key_results_update_admin" ON public.strategy_key_results;
DROP POLICY IF EXISTS "strategy_key_results_delete_admin" ON public.strategy_key_results;

DROP POLICY IF EXISTS "tenant isolation" ON public.strategy_checkins;
DROP POLICY IF EXISTS "tenant_read_checkins" ON public.strategy_checkins;
DROP POLICY IF EXISTS "tenant_insert_checkins" ON public.strategy_checkins;
DROP POLICY IF EXISTS "tenant_update_checkins" ON public.strategy_checkins;
DROP POLICY IF EXISTS "tenant_delete_checkins" ON public.strategy_checkins;
DROP POLICY IF EXISTS "strategy_checkins_select_tenant" ON public.strategy_checkins;
DROP POLICY IF EXISTS "strategy_checkins_insert_admin" ON public.strategy_checkins;
DROP POLICY IF EXISTS "strategy_checkins_update_admin" ON public.strategy_checkins;
DROP POLICY IF EXISTS "strategy_checkins_delete_admin" ON public.strategy_checkins;

DROP POLICY IF EXISTS "tenant isolation" ON public.strategy_initiatives;
DROP POLICY IF EXISTS "tenant_read_initiatives" ON public.strategy_initiatives;
DROP POLICY IF EXISTS "tenant_insert_initiatives" ON public.strategy_initiatives;
DROP POLICY IF EXISTS "tenant_update_initiatives" ON public.strategy_initiatives;
DROP POLICY IF EXISTS "tenant_delete_initiatives" ON public.strategy_initiatives;
DROP POLICY IF EXISTS "strategy_initiatives_select_tenant" ON public.strategy_initiatives;
DROP POLICY IF EXISTS "strategy_initiatives_insert_manager_admin" ON public.strategy_initiatives;
DROP POLICY IF EXISTS "strategy_initiatives_update_manager_admin" ON public.strategy_initiatives;
DROP POLICY IF EXISTS "strategy_initiatives_delete_manager_admin" ON public.strategy_initiatives;

DROP POLICY IF EXISTS "tenant_isolation" ON public.strategy_guardrails;
DROP POLICY IF EXISTS "strategy_guardrails_select_tenant" ON public.strategy_guardrails;
DROP POLICY IF EXISTS "strategy_guardrails_insert_admin" ON public.strategy_guardrails;
DROP POLICY IF EXISTS "strategy_guardrails_update_admin" ON public.strategy_guardrails;
DROP POLICY IF EXISTS "strategy_guardrails_delete_admin" ON public.strategy_guardrails;

-- ─── Strategy cycles: tenant read, admin write ───────────────────────────────
CREATE POLICY "strategy_cycles_select_tenant"
ON public.strategy_cycles
FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "strategy_cycles_insert_admin"
ON public.strategy_cycles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

CREATE POLICY "strategy_cycles_update_admin"
ON public.strategy_cycles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

CREATE POLICY "strategy_cycles_delete_admin"
ON public.strategy_cycles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

-- ─── Strategy objectives: tenant read, admin write ───────────────────────────
CREATE POLICY "strategy_objectives_select_tenant"
ON public.strategy_objectives
FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "strategy_objectives_insert_admin"
ON public.strategy_objectives
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_cycles c
    WHERE c.id = cycle_id
      AND c.tenant_id = strategy_objectives.tenant_id
  )
);

CREATE POLICY "strategy_objectives_update_admin"
ON public.strategy_objectives
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_cycles c
    WHERE c.id = cycle_id
      AND c.tenant_id = strategy_objectives.tenant_id
  )
);

CREATE POLICY "strategy_objectives_delete_admin"
ON public.strategy_objectives
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

-- ─── Strategy key results: tenant read, admin write ──────────────────────────
CREATE POLICY "strategy_key_results_select_tenant"
ON public.strategy_key_results
FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "strategy_key_results_insert_admin"
ON public.strategy_key_results
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_objectives o
    WHERE o.id = objective_id
      AND o.tenant_id = strategy_key_results.tenant_id
  )
);

CREATE POLICY "strategy_key_results_update_admin"
ON public.strategy_key_results
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_objectives o
    WHERE o.id = objective_id
      AND o.tenant_id = strategy_key_results.tenant_id
  )
);

CREATE POLICY "strategy_key_results_delete_admin"
ON public.strategy_key_results
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

-- ─── Strategy check-ins: tenant read, admin write ────────────────────────────
CREATE POLICY "strategy_checkins_select_tenant"
ON public.strategy_checkins
FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "strategy_checkins_insert_admin"
ON public.strategy_checkins
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_key_results kr
    WHERE kr.id = key_result_id
      AND kr.tenant_id = strategy_checkins.tenant_id
  )
);

CREATE POLICY "strategy_checkins_update_admin"
ON public.strategy_checkins
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_key_results kr
    WHERE kr.id = key_result_id
      AND kr.tenant_id = strategy_checkins.tenant_id
  )
);

CREATE POLICY "strategy_checkins_delete_admin"
ON public.strategy_checkins
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));

-- ─── Strategy initiatives: tenant read, manager/admin write ──────────────────
CREATE POLICY "strategy_initiatives_select_tenant"
ON public.strategy_initiatives
FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "strategy_initiatives_insert_manager_admin"
ON public.strategy_initiatives
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_objectives o
    WHERE o.id = objective_id
      AND o.tenant_id = strategy_initiatives.tenant_id
  )
);

CREATE POLICY "strategy_initiatives_update_manager_admin"
ON public.strategy_initiatives
FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id))
WITH CHECK (
  public.is_admin_or_manager(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_objectives o
    WHERE o.id = objective_id
      AND o.tenant_id = strategy_initiatives.tenant_id
  )
);

CREATE POLICY "strategy_initiatives_delete_manager_admin"
ON public.strategy_initiatives
FOR DELETE
TO authenticated
USING (public.is_admin_or_manager(auth.uid(), tenant_id));

-- ─── Strategy guardrails: tenant read, admin write ───────────────────────────
CREATE POLICY "strategy_guardrails_select_tenant"
ON public.strategy_guardrails
FOR SELECT
TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "strategy_guardrails_insert_admin"
ON public.strategy_guardrails
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_cycles c
    WHERE c.id = cycle_id
      AND c.tenant_id = strategy_guardrails.tenant_id
  )
);

CREATE POLICY "strategy_guardrails_update_admin"
ON public.strategy_guardrails
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.strategy_cycles c
    WHERE c.id = cycle_id
      AND c.tenant_id = strategy_guardrails.tenant_id
  )
);

CREATE POLICY "strategy_guardrails_delete_admin"
ON public.strategy_guardrails
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::public.app_role));
