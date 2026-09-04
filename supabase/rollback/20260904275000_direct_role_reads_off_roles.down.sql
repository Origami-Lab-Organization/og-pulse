-- Rollback: as 16 voltam a ler user_roles direto.

DROP POLICY IF EXISTS "Admins can delete reimbursement attachments" ON public.reimbursement_attachments;
CREATE POLICY "Admins can delete reimbursement attachments" ON public.reimbursement_attachments
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM reimbursement_requests rr
  WHERE ((rr.id = reimbursement_attachments.reimbursement_id) AND (EXISTS ( SELECT 1
           FROM user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.tenant_id = rr.tenant_id) AND (user_roles.role = 'admin'::app_role))))))));

DROP POLICY IF EXISTS "reimbursement_attachments_select" ON public.reimbursement_attachments;
CREATE POLICY "reimbursement_attachments_select" ON public.reimbursement_attachments
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM reimbursement_requests rr
  WHERE ((rr.id = reimbursement_attachments.reimbursement_id) AND ((rr.requested_by IN ( SELECT employees.id
           FROM employees
          WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = rr.tenant_id)))) OR (EXISTS ( SELECT 1
           FROM user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.tenant_id = rr.tenant_id) AND (user_roles.role = 'admin'::app_role)))) OR ((rr.project_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM employees e
          WHERE ((e.auth_id = auth.uid()) AND (e.is_gerente = true) AND (e.tenant_id = rr.tenant_id)))) AND (EXISTS ( SELECT 1
           FROM (projects p
             JOIN employees e ON ((p.manager_id = e.id)))
          WHERE ((e.auth_id = auth.uid()) AND (p.id = rr.project_id))))) OR (rr.reviewed_by IN ( SELECT employees.id
           FROM employees
          WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = rr.tenant_id)))))))));

DROP POLICY IF EXISTS "reimbursement_items_select" ON public.reimbursement_items;
CREATE POLICY "reimbursement_items_select" ON public.reimbursement_items
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM reimbursement_requests rr
  WHERE ((rr.id = reimbursement_items.reimbursement_id) AND ((rr.requested_by IN ( SELECT employees.id
           FROM employees
          WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = rr.tenant_id)))) OR (EXISTS ( SELECT 1
           FROM user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.tenant_id = rr.tenant_id) AND (user_roles.role = 'admin'::app_role)))) OR ((rr.project_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM employees e
          WHERE ((e.auth_id = auth.uid()) AND (e.is_gerente = true) AND (e.tenant_id = rr.tenant_id)))) AND (EXISTS ( SELECT 1
           FROM (projects p
             JOIN employees e ON ((p.manager_id = e.id)))
          WHERE ((e.auth_id = auth.uid()) AND (p.id = rr.project_id))))) OR (rr.reviewed_by IN ( SELECT employees.id
           FROM employees
          WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = rr.tenant_id)))))))));

DROP POLICY IF EXISTS "Admins can delete reimbursements" ON public.reimbursement_requests;
CREATE POLICY "Admins can delete reimbursements" ON public.reimbursement_requests
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.tenant_id = reimbursement_requests.tenant_id) AND (user_roles.role = 'admin'::app_role)))));

DROP POLICY IF EXISTS "reimbursement_requests_select" ON public.reimbursement_requests;
CREATE POLICY "reimbursement_requests_select" ON public.reimbursement_requests
  FOR SELECT TO public
  USING (((requested_by IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = reimbursement_requests.tenant_id)))) OR (EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.tenant_id = reimbursement_requests.tenant_id) AND (user_roles.role = 'admin'::app_role)))) OR ((project_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_id = auth.uid()) AND (e.is_gerente = true) AND (e.tenant_id = reimbursement_requests.tenant_id)))) AND (EXISTS ( SELECT 1
   FROM (projects p
     JOIN employees e ON ((p.manager_id = e.id)))
  WHERE ((e.auth_id = auth.uid()) AND (p.id = reimbursement_requests.project_id))))) OR (reviewed_by IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = reimbursement_requests.tenant_id))))));

DROP POLICY IF EXISTS "reimbursement_requests_update" ON public.reimbursement_requests;
CREATE POLICY "reimbursement_requests_update" ON public.reimbursement_requests
  FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.tenant_id = reimbursement_requests.tenant_id) AND (user_roles.role = 'admin'::app_role)))) OR ((project_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_id = auth.uid()) AND (e.is_gerente = true) AND (e.tenant_id = reimbursement_requests.tenant_id)))) AND (EXISTS ( SELECT 1
   FROM (projects p
     JOIN employees e ON ((p.manager_id = e.id)))
  WHERE ((e.auth_id = auth.uid()) AND (p.id = reimbursement_requests.project_id))))) OR (requested_by IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = reimbursement_requests.tenant_id) AND (employees.is_gerente = true))))));

DROP POLICY IF EXISTS "Admin can manage reminder settings" ON public.timesheet_reminder_settings;
CREATE POLICY "Admin can manage reminder settings" ON public.timesheet_reminder_settings
  FOR ALL TO public
  USING ((tenant_id IN ( SELECT e.tenant_id
   FROM (employees e
     JOIN user_roles ur ON ((ur.user_id = e.auth_id)))
  WHERE ((ur.role = 'admin'::app_role) AND (e.auth_id = auth.uid())))));

DROP POLICY IF EXISTS "Admins and managers can delete company logos" ON storage.objects;
CREATE POLICY "Admins and managers can delete company logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (((bucket_id = 'company-logos'::text) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND ((ur.tenant_id)::text = (storage.foldername(objects.name))[1]))))));

DROP POLICY IF EXISTS "Admins and managers can delete contracts" ON storage.objects;
CREATE POLICY "Admins and managers can delete contracts" ON storage.objects
  FOR DELETE TO public
  USING (((bucket_id = 'contracts'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_id = auth.uid()) AND ((e.is_gerente = true) OR (EXISTS ( SELECT 1
           FROM user_roles ur
          WHERE ((ur.user_id = auth.uid()) AND (ur.tenant_id = e.tenant_id) AND (ur.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])))))))))));

DROP POLICY IF EXISTS "Admins and managers can update company logos" ON storage.objects;
CREATE POLICY "Admins and managers can update company logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (((bucket_id = 'company-logos'::text) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND ((ur.tenant_id)::text = (storage.foldername(objects.name))[1]))))));

DROP POLICY IF EXISTS "Admins and managers can upload company logos" ON storage.objects;
CREATE POLICY "Admins and managers can upload company logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'company-logos'::text) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])) AND ((ur.tenant_id)::text = (storage.foldername(objects.name))[1]))))));

DROP POLICY IF EXISTS "Admins and managers can upload contracts" ON storage.objects;
CREATE POLICY "Admins and managers can upload contracts" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (((bucket_id = 'contracts'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_id = auth.uid()) AND ((e.is_gerente = true) OR (EXISTS ( SELECT 1
           FROM user_roles ur
          WHERE ((ur.user_id = auth.uid()) AND (ur.tenant_id = e.tenant_id) AND (ur.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])))))))))));

DROP POLICY IF EXISTS "Admins can delete employee photos in their tenant" ON storage.objects;
CREATE POLICY "Admins can delete employee photos in their tenant" ON storage.objects
  FOR DELETE TO public
  USING (((bucket_id = 'employee-photos'::text) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.tenant_id)::text = (storage.foldername(objects.name))[1]) AND (ur.role = 'admin'::app_role))))));

DROP POLICY IF EXISTS "Admins can update employee photos in their tenant" ON storage.objects;
CREATE POLICY "Admins can update employee photos in their tenant" ON storage.objects
  FOR UPDATE TO public
  USING (((bucket_id = 'employee-photos'::text) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.tenant_id)::text = (storage.foldername(objects.name))[1]) AND (ur.role = 'admin'::app_role))))));

DROP POLICY IF EXISTS "Admins can upload employee photos in their tenant" ON storage.objects;
CREATE POLICY "Admins can upload employee photos in their tenant" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (((bucket_id = 'employee-photos'::text) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.tenant_id)::text = (storage.foldername(objects.name))[1]) AND (ur.role = 'admin'::app_role))))));

DROP POLICY IF EXISTS "Recruiters can read curriculos in their tenant" ON storage.objects;
CREATE POLICY "Recruiters can read curriculos in their tenant" ON storage.objects
  FOR SELECT TO public
  USING (((bucket_id = 'curriculos'::text) AND (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.tenant_id)::text = (storage.foldername(objects.name))[1]) AND (ur.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'rh'::app_role])))))));
