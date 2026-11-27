-- Rollback de 20261125122000_carteira_de_clientes.sql
--
-- A carteira sai e as policies voltam a exigir só cliente:editar.

DROP FUNCTION IF EXISTS public.carteira_de_clientes(uuid);

DROP POLICY IF EXISTS "Admins and managers can insert clients" ON public.clients;
CREATE POLICY "Admins and managers can insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can update clients" ON public.clients;
CREATE POLICY "Admins and managers can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete clients" ON public.clients;
CREATE POLICY "Admins and managers can delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can insert client_contacts" ON public.client_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can update client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can update client_contacts" ON public.client_contacts
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can delete client_contacts" ON public.client_contacts
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

-- Stakeholder do cliente (sem projeto, ADR-0037): o mesmo de quem edita o cliente. O do projeto
-- continua com projeto:editar e a gestão do projeto.
DROP POLICY IF EXISTS "Admins and managers can insert project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can insert project stakeholders" ON public.project_stakeholders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p
             WHERE p.id = project_stakeholders.project_id
               AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
               AND public.can_manage_project(auth.uid(), p.id))
    OR (project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar')))
  );

DROP POLICY IF EXISTS "Admins and managers can update project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can update project stakeholders" ON public.project_stakeholders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p
             WHERE p.id = project_stakeholders.project_id
               AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
               AND public.can_manage_project(auth.uid(), p.id))
    OR (project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar')))
  );

DROP POLICY IF EXISTS "Admins and managers can delete project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can delete project stakeholders" ON public.project_stakeholders
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p
             WHERE p.id = project_stakeholders.project_id
               AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
               AND public.can_manage_project(auth.uid(), p.id))
    OR (project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar')))
  );
