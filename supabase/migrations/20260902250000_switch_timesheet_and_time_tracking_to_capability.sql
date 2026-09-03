-- PUL-201 — GRUPO 4b: timesheet de terceiros e ponto.
--
-- Este grupo CRIA uma capacidade: `timesheet-terceiro:editar`. A matriz tinha so a leitura, mas
-- activity_timesheets, os dois edit_logs e timesheet_submissions tem escrita por
-- is_admin_or_manager — gerente edita e submete apontamento alheio. Reusar a de leitura mentiria
-- na tela. Semeada para Admin e Gerente = exatamente is_admin_or_manager: paridade por construcao.
--
-- Ponto: os SELECTs de time_entries, time_daily_summary, time_bank_ledger, time_adjustment_requests
-- e time_punch_face_profiles sao `admin OR rh OR a propria pessoa`; so o `admin OR rh` vira
-- ponto:ler-terceiro, o `OR proprio` fica. audit_log -> ponto:auditar. settings -> ponto:configurar.
-- FORA (TD-0019): period_locks (admin OR rh sem capacidade com essa semantica) e submissions DELETE.
-- Gerada de pg_policies de producao. Rollback em supabase/rollback/.

INSERT INTO public.capabilities (key, domain, label, is_sensitive, description) VALUES
  ('timesheet-terceiro:editar', 'timesheet', 'Editar e submeter horas de terceiros', false,
   'Lançar, corrigir e submeter apontamentos de outras pessoas em projetos e atividades. Quem só aponta as próprias usa timesheet-proprio:apontar.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT tr.id, 'timesheet-terceiro:editar', true FROM public.tenant_roles tr WHERE tr.name IN ('Admin','Gerente')
ON CONFLICT (role_id, capability) DO NOTHING;

DROP POLICY IF EXISTS "Admins and managers can insert activity timesheet edit logs" ON public.activity_timesheet_edit_logs;
CREATE POLICY "Admins and managers can insert activity timesheet edit logs" ON public.activity_timesheet_edit_logs
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM activity_timesheets at
  WHERE ((at.id = activity_timesheet_edit_logs.activity_timesheet_id) AND public.has_capability(auth.uid(), at.tenant_id, 'timesheet-terceiro:editar')))));

DROP POLICY IF EXISTS "activity_timesheets_delete_manager_admin" ON public.activity_timesheets;
CREATE POLICY "activity_timesheets_delete_manager_admin" ON public.activity_timesheets
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'timesheet-terceiro:editar'));

DROP POLICY IF EXISTS "activity_timesheets_insert_manager_admin" ON public.activity_timesheets;
CREATE POLICY "activity_timesheets_insert_manager_admin" ON public.activity_timesheets
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'timesheet-terceiro:editar'));

DROP POLICY IF EXISTS "activity_timesheets_update_manager_admin" ON public.activity_timesheets;
CREATE POLICY "activity_timesheets_update_manager_admin" ON public.activity_timesheets
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'timesheet-terceiro:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'timesheet-terceiro:editar'));

DROP POLICY IF EXISTS "time_adjustment_requests_select" ON public.time_adjustment_requests;
CREATE POLICY "time_adjustment_requests_select" ON public.time_adjustment_requests
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_adjustment_requests.employee_id) AND (e.auth_id = auth.uid())))) OR public.has_capability(auth.uid(), tenant_id, 'ponto:ler-terceiro')));

DROP POLICY IF EXISTS "time_bank_ledger_select" ON public.time_bank_ledger;
CREATE POLICY "time_bank_ledger_select" ON public.time_bank_ledger
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_bank_ledger.employee_id) AND (e.auth_id = auth.uid())))) OR public.has_capability(auth.uid(), tenant_id, 'ponto:ler-terceiro')));

DROP POLICY IF EXISTS "time_daily_summary_select" ON public.time_daily_summary;
CREATE POLICY "time_daily_summary_select" ON public.time_daily_summary
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_daily_summary.employee_id) AND (e.auth_id = auth.uid())))) OR public.has_capability(auth.uid(), tenant_id, 'ponto:ler-terceiro')));

DROP POLICY IF EXISTS "time_entries_select" ON public.time_entries;
CREATE POLICY "time_entries_select" ON public.time_entries
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.auth_id = auth.uid())))) OR public.has_capability(auth.uid(), tenant_id, 'ponto:ler-terceiro')));

DROP POLICY IF EXISTS "time_punch_face_profiles_select" ON public.time_punch_face_profiles;
CREATE POLICY "time_punch_face_profiles_select" ON public.time_punch_face_profiles
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_punch_face_profiles.employee_id) AND (e.auth_id = auth.uid())))) OR public.has_capability(auth.uid(), tenant_id, 'ponto:ler-terceiro')));

DROP POLICY IF EXISTS "time_tracking_audit_log_select_admin_rh" ON public.time_tracking_audit_log;
CREATE POLICY "time_tracking_audit_log_select_admin_rh" ON public.time_tracking_audit_log
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'ponto:auditar'));

DROP POLICY IF EXISTS "time_tracking_settings_write_admin" ON public.time_tracking_settings;
CREATE POLICY "time_tracking_settings_write_admin" ON public.time_tracking_settings
  FOR ALL TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'ponto:configurar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'ponto:configurar'));

DROP POLICY IF EXISTS "Admins and managers can insert edit logs" ON public.timesheet_edit_logs;
CREATE POLICY "Admins and managers can insert edit logs" ON public.timesheet_edit_logs
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((project_timesheets pt
     JOIN project_members pm ON ((pt.project_member_id = pm.id)))
     JOIN projects p ON ((pm.project_id = p.id)))
  WHERE ((pt.id = timesheet_edit_logs.timesheet_id) AND public.has_capability(auth.uid(), p.tenant_id, 'timesheet-terceiro:editar')))));

DROP POLICY IF EXISTS "Managers can insert submissions" ON public.timesheet_submissions;
CREATE POLICY "Managers can insert submissions" ON public.timesheet_submissions
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'timesheet-terceiro:editar'));

DROP POLICY IF EXISTS "Managers can update submissions" ON public.timesheet_submissions;
CREATE POLICY "Managers can update submissions" ON public.timesheet_submissions
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'timesheet-terceiro:editar'));
