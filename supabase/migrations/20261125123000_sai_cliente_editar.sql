-- US-0049 — `cliente:editar` deixa de existir (Victor, 25/11/2026).
--
-- Depois de 20261125122000, que já aceita `prospeccao:editar` em tudo o que era de
-- `cliente:editar`. Esta migration vai junto com o front da US-0049: o front anterior ainda guarda
-- as rotas de criar e editar cliente com `cliente:editar`.

-- Policies só com prospeccao:editar --------------------------------------------------------------

DROP POLICY IF EXISTS "Admins and managers can insert clients" ON public.clients;
CREATE POLICY "Admins and managers can insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

DROP POLICY IF EXISTS "Admins and managers can update clients" ON public.clients;
CREATE POLICY "Admins and managers can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete clients" ON public.clients;
CREATE POLICY "Admins and managers can delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can insert client_contacts" ON public.client_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

DROP POLICY IF EXISTS "Admins and managers can update client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can update client_contacts" ON public.client_contacts
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can delete client_contacts" ON public.client_contacts
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

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
         AND public.has_capability(auth.uid(), c.tenant_id, 'prospeccao:editar')))
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
         AND public.has_capability(auth.uid(), c.tenant_id, 'prospeccao:editar')))
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
         AND public.has_capability(auth.uid(), c.tenant_id, 'prospeccao:editar')))
  );

-- A capacidade sai de perfis, exceções, modelos e do catálogo ----------------------------------

DELETE FROM public.user_capability_overrides WHERE capability = 'cliente:editar';
DELETE FROM public.role_capabilities WHERE capability = 'cliente:editar';
DELETE FROM public.default_role_capabilities WHERE capability = 'cliente:editar';
DELETE FROM public.capabilities WHERE key = 'cliente:editar';
