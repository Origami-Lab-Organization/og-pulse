-- PUL-206, passo 3b — as 16 policies que leem `user_roles` DIRETO, sem passar pela função.
--
-- O ensaio da remoção encontrou estas. Meu inventário anterior procurava `has_role` e
-- `is_admin_or_manager`, e elas escrevem o EXISTS na mão; nove estão em `storage`, que o
-- inventário também não cobria porque filtrava o schema `public`. É a dependência que só
-- aparece quando se tenta derrubar a tabela — e é por isso que o ensaio com ROLLBACK contra
-- o schema real vale mais que qualquer leitura de código.
--
-- Cada uma recebe a capacidade com o MESMO conjunto de papéis:
--   logo da empresa (3)        → `marca:editar` (Admin + Gerente), capacidade nova
--   contratos em storage (2)   → `financeiro:editar` (Admin + Gerente)
--   curriculos (1)             → `curriculo:ler` (Admin + Gerente + RH)
--   fotos de funcionario (3)   → `pessoa:administrar` (Admin)
--   lembretes de timesheet (1) → `configuracao:editar` (Admin)
--   reembolso (6)              → `lancamento:desfazer` (Admin)
--
-- Sobre reembolso: o modulo saiu do produto (ADR-0007) mas as tabelas guardam 124 linhas de
-- historico. Nao e hora de decidir o destino desse dado, entao as policies passam a usar a
-- capacidade administrativa de mesmo alcance, e o descarte fica registrado como divida.
--
-- Nas policies de storage o tenant vem do primeiro segmento do path e agora e convertido
-- para uuid, porque `has_capability` recebe uuid. Path fora do formato faz a conversao
-- falhar, e o efeito e o mesmo de antes: a comparacao nao casa e o acesso e negado.

DROP POLICY IF EXISTS "Admins can delete reimbursement attachments" ON public.reimbursement_attachments;
CREATE POLICY "Admins can delete reimbursement attachments" ON public.reimbursement_attachments
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM reimbursement_requests rr
  WHERE ((rr.id = reimbursement_attachments.reimbursement_id) AND public.has_capability(auth.uid(), rr.tenant_id, 'lancamento:desfazer')))));

DROP POLICY IF EXISTS "reimbursement_attachments_select" ON public.reimbursement_attachments;
CREATE POLICY "reimbursement_attachments_select" ON public.reimbursement_attachments
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM reimbursement_requests rr
  WHERE ((rr.id = reimbursement_attachments.reimbursement_id) AND ((rr.requested_by IN ( SELECT employees.id
           FROM employees
          WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = rr.tenant_id)))) OR public.has_capability(auth.uid(), rr.tenant_id, 'lancamento:desfazer') OR ((rr.project_id IS NOT NULL) AND (EXISTS ( SELECT 1
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
          WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = rr.tenant_id)))) OR public.has_capability(auth.uid(), rr.tenant_id, 'lancamento:desfazer') OR ((rr.project_id IS NOT NULL) AND (EXISTS ( SELECT 1
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
  USING (public.has_capability(auth.uid(), reimbursement_requests.tenant_id, 'lancamento:desfazer'));

DROP POLICY IF EXISTS "reimbursement_requests_select" ON public.reimbursement_requests;
CREATE POLICY "reimbursement_requests_select" ON public.reimbursement_requests
  FOR SELECT TO public
  USING (((requested_by IN ( SELECT employees.id
   FROM employees
  WHERE ((employees.auth_id = auth.uid()) AND (employees.tenant_id = reimbursement_requests.tenant_id)))) OR public.has_capability(auth.uid(), reimbursement_requests.tenant_id, 'lancamento:desfazer') OR ((project_id IS NOT NULL) AND (EXISTS ( SELECT 1
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
  USING ((public.has_capability(auth.uid(), reimbursement_requests.tenant_id, 'lancamento:desfazer') OR ((project_id IS NOT NULL) AND (EXISTS ( SELECT 1
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
  USING (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete company logos" ON storage.objects;
CREATE POLICY "Admins and managers can delete company logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (((bucket_id = 'company-logos'::text) AND public.has_capability_in_folder(auth.uid(), (storage.foldername(objects.name))[1], 'marca:editar')));

DROP POLICY IF EXISTS "Admins and managers can delete contracts" ON storage.objects;
CREATE POLICY "Admins and managers can delete contracts" ON storage.objects
  FOR DELETE TO public
  USING (((bucket_id = 'contracts'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_id = auth.uid()) AND ((e.is_gerente = true) OR public.has_capability(auth.uid(), e.tenant_id, 'financeiro:editar')))))));

DROP POLICY IF EXISTS "Admins and managers can update company logos" ON storage.objects;
CREATE POLICY "Admins and managers can update company logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (((bucket_id = 'company-logos'::text) AND public.has_capability_in_folder(auth.uid(), (storage.foldername(objects.name))[1], 'marca:editar')));

DROP POLICY IF EXISTS "Admins and managers can upload company logos" ON storage.objects;
CREATE POLICY "Admins and managers can upload company logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'company-logos'::text) AND public.has_capability_in_folder(auth.uid(), (storage.foldername(objects.name))[1], 'marca:editar')));

DROP POLICY IF EXISTS "Admins and managers can upload contracts" ON storage.objects;
CREATE POLICY "Admins and managers can upload contracts" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (((bucket_id = 'contracts'::text) AND (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.auth_id = auth.uid()) AND ((e.is_gerente = true) OR public.has_capability(auth.uid(), e.tenant_id, 'financeiro:editar')))))));

DROP POLICY IF EXISTS "Admins can delete employee photos in their tenant" ON storage.objects;
CREATE POLICY "Admins can delete employee photos in their tenant" ON storage.objects
  FOR DELETE TO public
  USING (((bucket_id = 'employee-photos'::text) AND public.has_capability_in_folder(auth.uid(), (storage.foldername(objects.name))[1], 'pessoa:administrar')));

DROP POLICY IF EXISTS "Admins can update employee photos in their tenant" ON storage.objects;
CREATE POLICY "Admins can update employee photos in their tenant" ON storage.objects
  FOR UPDATE TO public
  USING (((bucket_id = 'employee-photos'::text) AND public.has_capability_in_folder(auth.uid(), (storage.foldername(objects.name))[1], 'pessoa:administrar')));

DROP POLICY IF EXISTS "Admins can upload employee photos in their tenant" ON storage.objects;
CREATE POLICY "Admins can upload employee photos in their tenant" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (((bucket_id = 'employee-photos'::text) AND public.has_capability_in_folder(auth.uid(), (storage.foldername(objects.name))[1], 'pessoa:administrar')));

DROP POLICY IF EXISTS "Recruiters can read curriculos in their tenant" ON storage.objects;
CREATE POLICY "Recruiters can read curriculos in their tenant" ON storage.objects
  FOR SELECT TO public
  USING (((bucket_id = 'curriculos'::text) AND public.has_capability_in_folder(auth.uid(), (storage.foldername(objects.name))[1], 'curriculo:ler')));
