-- ROLLBACK do grupo 4b da PUL-201. NAO e migration: execute manualmente. Gerado dos predicados exatos
-- de producao e EXECUTADO em harness antes do merge.

DROP POLICY IF EXISTS "Admins and managers can insert activity timesheet edit logs" ON public.activity_timesheet_edit_logs;
CREATE POLICY "Admins and managers can insert activity timesheet edit logs" ON public.activity_timesheet_edit_logs
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM activity_timesheets at
  WHERE ((at.id = activity_timesheet_edit_logs.activity_timesheet_id) AND is_admin_or_manager(auth.uid(), at.tenant_id)))));

DROP POLICY IF EXISTS "activity_timesheets_delete_manager_admin" ON public.activity_timesheets;
CREATE POLICY "activity_timesheets_delete_manager_admin" ON public.activity_timesheets
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "activity_timesheets_insert_manager_admin" ON public.activity_timesheets;
CREATE POLICY "activity_timesheets_insert_manager_admin" ON public.activity_timesheets
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "activity_timesheets_update_manager_admin" ON public.activity_timesheets;
CREATE POLICY "activity_timesheets_update_manager_admin" ON public.activity_timesheets
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id))
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "time_adjustment_requests_select" ON public.time_adjustment_requests;
CREATE POLICY "time_adjustment_requests_select" ON public.time_adjustment_requests
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_adjustment_requests.employee_id) AND (e.auth_id = auth.uid())))) OR has_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "time_bank_ledger_select" ON public.time_bank_ledger;
CREATE POLICY "time_bank_ledger_select" ON public.time_bank_ledger
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_bank_ledger.employee_id) AND (e.auth_id = auth.uid())))) OR has_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "time_daily_summary_select" ON public.time_daily_summary;
CREATE POLICY "time_daily_summary_select" ON public.time_daily_summary
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_daily_summary.employee_id) AND (e.auth_id = auth.uid())))) OR has_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "time_entries_select" ON public.time_entries;
CREATE POLICY "time_entries_select" ON public.time_entries
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.auth_id = auth.uid())))) OR has_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "time_punch_face_profiles_select" ON public.time_punch_face_profiles;
CREATE POLICY "time_punch_face_profiles_select" ON public.time_punch_face_profiles
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = time_punch_face_profiles.employee_id) AND (e.auth_id = auth.uid())))) OR has_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "time_tracking_audit_log_select_admin_rh" ON public.time_tracking_audit_log;
CREATE POLICY "time_tracking_audit_log_select_admin_rh" ON public.time_tracking_audit_log
  FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "time_tracking_settings_write_admin" ON public.time_tracking_settings;
CREATE POLICY "time_tracking_settings_write_admin" ON public.time_tracking_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins and managers can insert edit logs" ON public.timesheet_edit_logs;
CREATE POLICY "Admins and managers can insert edit logs" ON public.timesheet_edit_logs
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((project_timesheets pt
     JOIN project_members pm ON ((pt.project_member_id = pm.id)))
     JOIN projects p ON ((pm.project_id = p.id)))
  WHERE ((pt.id = timesheet_edit_logs.timesheet_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Managers can insert submissions" ON public.timesheet_submissions;
CREATE POLICY "Managers can insert submissions" ON public.timesheet_submissions
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can update submissions" ON public.timesheet_submissions;
CREATE POLICY "Managers can update submissions" ON public.timesheet_submissions
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

-- a capacidade criada nao e removida: sem uso e inofensiva; remove-la com policy apontando quebraria.
