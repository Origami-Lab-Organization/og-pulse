-- PUL-201 — GRUPO 4a: cadastros comerciais, impostos e historico de OKR de projeto.
-- clients/client_contacts -> cliente:editar; suppliers/materials/subscriptions/holidays -> catalogo:editar;
-- job_openings e job_applications UPDATE -> vaga:editar (o ato de recrutar; Admin+Gerente+RH, mesmo conjunto
-- de `is_admin_or_manager OR has_role(rh)` que a policy tinha); job_applications SELECT -> candidatura:ler;
-- key_result_history -> projeto:editar (OKR DE PROJETO, filho de project_key_results — nao e estrategia);
-- tax_entries -> financeiro:ler/editar. Gerada de pg_policies de producao. Rollback em supabase/rollback/.

DROP POLICY IF EXISTS "Admins and managers can delete client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can delete client_contacts" ON public.client_contacts
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can insert client_contacts" ON public.client_contacts
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can update client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can update client_contacts" ON public.client_contacts
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete clients" ON public.clients;
CREATE POLICY "Admins and managers can delete clients" ON public.clients
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert clients" ON public.clients;
CREATE POLICY "Admins and managers can insert clients" ON public.clients
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can update clients" ON public.clients;
CREATE POLICY "Admins and managers can update clients" ON public.clients
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins can delete holidays" ON public.holidays;
CREATE POLICY "Admins can delete holidays" ON public.holidays
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins can insert holidays" ON public.holidays;
CREATE POLICY "Admins can insert holidays" ON public.holidays
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins can update holidays" ON public.holidays;
CREATE POLICY "Admins can update holidays" ON public.holidays
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Recruiters can view job applications" ON public.job_applications;
CREATE POLICY "Recruiters can view job applications" ON public.job_applications
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'candidatura:ler'));

DROP POLICY IF EXISTS "Recruiters can update job applications" ON public.job_applications;
CREATE POLICY "Recruiters can update job applications" ON public.job_applications
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'vaga:editar'));

DROP POLICY IF EXISTS "Recruiters can delete job openings" ON public.job_openings;
CREATE POLICY "Recruiters can delete job openings" ON public.job_openings
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'vaga:editar'));

DROP POLICY IF EXISTS "Recruiters can create job openings" ON public.job_openings;
CREATE POLICY "Recruiters can create job openings" ON public.job_openings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'vaga:editar'));

DROP POLICY IF EXISTS "Recruiters can update job openings" ON public.job_openings;
CREATE POLICY "Recruiters can update job openings" ON public.job_openings
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'vaga:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete key result history" ON public.key_result_history;
CREATE POLICY "Admins and managers can delete key result history" ON public.key_result_history
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((project_key_results kr
     JOIN project_okrs o ON ((o.id = kr.okr_id)))
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((kr.id = key_result_history.key_result_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert key result history" ON public.key_result_history;
CREATE POLICY "Admins and managers can insert key result history" ON public.key_result_history
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((project_key_results kr
     JOIN project_okrs o ON ((o.id = kr.okr_id)))
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((kr.id = key_result_history.key_result_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can delete materials" ON public.materials;
CREATE POLICY "Admins and managers can delete materials" ON public.materials
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert materials" ON public.materials;
CREATE POLICY "Admins and managers can insert materials" ON public.materials
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can update materials" ON public.materials;
CREATE POLICY "Admins and managers can update materials" ON public.materials
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can delete subscriptions" ON public.subscriptions
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can insert subscriptions" ON public.subscriptions
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins and managers can update subscriptions" ON public.subscriptions
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete suppliers" ON public.suppliers;
CREATE POLICY "Admins and managers can delete suppliers" ON public.suppliers
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert suppliers" ON public.suppliers;
CREATE POLICY "Admins and managers can insert suppliers" ON public.suppliers
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can update suppliers" ON public.suppliers;
CREATE POLICY "Admins and managers can update suppliers" ON public.suppliers
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete tax entries" ON public.tax_entries;
CREATE POLICY "Admins and managers can delete tax entries" ON public.tax_entries
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'financeiro:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert tax entries" ON public.tax_entries;
CREATE POLICY "Admins and managers can insert tax entries" ON public.tax_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'financeiro:editar'));

DROP POLICY IF EXISTS "Admins and managers can view tax entries" ON public.tax_entries;
CREATE POLICY "Admins and managers can view tax entries" ON public.tax_entries
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'financeiro:ler'));

DROP POLICY IF EXISTS "Admins and managers can update tax entries" ON public.tax_entries;
CREATE POLICY "Admins and managers can update tax entries" ON public.tax_entries
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'financeiro:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'financeiro:editar'));
