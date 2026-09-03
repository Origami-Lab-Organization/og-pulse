-- ROLLBACK do grupo 4a da PUL-201. NAO e migration: execute manualmente. Gerado dos predicados exatos
-- de producao e EXECUTADO em harness antes do merge.

DROP POLICY IF EXISTS "Admins and managers can delete client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can delete client_contacts" ON public.client_contacts
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can insert client_contacts" ON public.client_contacts
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can update client_contacts" ON public.client_contacts
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete clients" ON public.clients;
CREATE POLICY "Admins and managers can delete clients" ON public.clients
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert clients" ON public.clients;
CREATE POLICY "Admins and managers can insert clients" ON public.clients
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update clients" ON public.clients;
CREATE POLICY "Admins and managers can update clients" ON public.clients
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins can delete holidays" ON public.holidays;
CREATE POLICY "Admins can delete holidays" ON public.holidays
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins can insert holidays" ON public.holidays;
CREATE POLICY "Admins can insert holidays" ON public.holidays
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins can update holidays" ON public.holidays;
CREATE POLICY "Admins can update holidays" ON public.holidays
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Recruiters can view job applications" ON public.job_applications;
CREATE POLICY "Recruiters can view job applications" ON public.job_applications
  FOR SELECT TO authenticated
  USING ((is_admin_or_manager(auth.uid(), tenant_id) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "Recruiters can update job applications" ON public.job_applications;
CREATE POLICY "Recruiters can update job applications" ON public.job_applications
  FOR UPDATE TO authenticated
  USING ((is_admin_or_manager(auth.uid(), tenant_id) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "Recruiters can delete job openings" ON public.job_openings;
CREATE POLICY "Recruiters can delete job openings" ON public.job_openings
  FOR DELETE TO authenticated
  USING ((is_admin_or_manager(auth.uid(), tenant_id) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "Recruiters can create job openings" ON public.job_openings;
CREATE POLICY "Recruiters can create job openings" ON public.job_openings
  FOR INSERT TO authenticated
  WITH CHECK ((is_admin_or_manager(auth.uid(), tenant_id) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "Recruiters can update job openings" ON public.job_openings;
CREATE POLICY "Recruiters can update job openings" ON public.job_openings
  FOR UPDATE TO authenticated
  USING ((is_admin_or_manager(auth.uid(), tenant_id) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));

DROP POLICY IF EXISTS "Admins and managers can delete key result history" ON public.key_result_history;
CREATE POLICY "Admins and managers can delete key result history" ON public.key_result_history
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((project_key_results kr
     JOIN project_okrs o ON ((o.id = kr.okr_id)))
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((kr.id = key_result_history.key_result_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert key result history" ON public.key_result_history;
CREATE POLICY "Admins and managers can insert key result history" ON public.key_result_history
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((project_key_results kr
     JOIN project_okrs o ON ((o.id = kr.okr_id)))
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((kr.id = key_result_history.key_result_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete materials" ON public.materials;
CREATE POLICY "Admins and managers can delete materials" ON public.materials
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert materials" ON public.materials;
CREATE POLICY "Admins and managers can insert materials" ON public.materials
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update materials" ON public.materials;
CREATE POLICY "Admins and managers can update materials" ON public.materials
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can delete subscriptions" ON public.subscriptions
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can insert subscriptions" ON public.subscriptions
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can update subscriptions" ON public.subscriptions
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete suppliers" ON public.suppliers;
CREATE POLICY "Admins and managers can delete suppliers" ON public.suppliers
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert suppliers" ON public.suppliers;
CREATE POLICY "Admins and managers can insert suppliers" ON public.suppliers
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update suppliers" ON public.suppliers;
CREATE POLICY "Admins and managers can update suppliers" ON public.suppliers
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete tax entries" ON public.tax_entries;
CREATE POLICY "Admins and managers can delete tax entries" ON public.tax_entries
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert tax entries" ON public.tax_entries;
CREATE POLICY "Admins and managers can insert tax entries" ON public.tax_entries
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can view tax entries" ON public.tax_entries;
CREATE POLICY "Admins and managers can view tax entries" ON public.tax_entries
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update tax entries" ON public.tax_entries;
CREATE POLICY "Admins and managers can update tax entries" ON public.tax_entries
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id))
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));
