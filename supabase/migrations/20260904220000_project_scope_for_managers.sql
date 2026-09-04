-- PUL-201 / TD-0018 — gerente edita apenas o projeto que gerencia. DECISÃO DE 04/09.
--
-- Esta é a primeira migration da onda que MUDA acesso de propósito. Até aqui todas foram
-- mecanismo com paridade zero; esta é política, e por isso vem com a medida do impacto no
-- corpo do PR, não só com a prova de que funciona.
--
-- O que muda: `projeto:editar` deixa de valer para qualquer projeto do tenant e passa a
-- exigir também relação com o projeto — ser o gerente responsável, ou ter
-- `projeto:gerir-qualquer` (só-admin). A tela de perfis já descrevia `projeto:editar` como
-- "apenas onde a pessoa é o gerente responsável"; era a descrição que estava certa e o
-- banco que não aplicava.
--
-- Onde o escopo entra importa: nas tabelas filhas ele vai DENTRO do EXISTS que já resolve
-- `projects p`, senão a checagem valeria para um projeto qualquer do tenant e a policy
-- continuaria aberta. No INSERT de `projects` a linha ainda não existe, então a relação se
-- lê do valor gravado: gerente cria projeto onde ele é o responsável.


-- key_result_history (2)
DROP POLICY IF EXISTS "Admins and managers can delete key result history" ON public.key_result_history;
CREATE POLICY "Admins and managers can delete key result history" ON public.key_result_history
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((project_key_results kr
     JOIN project_okrs o ON ((o.id = kr.okr_id)))
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((kr.id = key_result_history.key_result_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can insert key result history" ON public.key_result_history;
CREATE POLICY "Admins and managers can insert key result history" ON public.key_result_history
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((project_key_results kr
     JOIN project_okrs o ON ((o.id = kr.okr_id)))
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((kr.id = key_result_history.key_result_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

-- project_key_results (3)
DROP POLICY IF EXISTS "Admins and managers can delete project key results" ON public.project_key_results;
CREATE POLICY "Admins and managers can delete project key results" ON public.project_key_results
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_okrs o
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((o.id = project_key_results.okr_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project key results" ON public.project_key_results;
CREATE POLICY "Admins and managers can insert project key results" ON public.project_key_results
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (project_okrs o
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((o.id = project_key_results.okr_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can update project key results" ON public.project_key_results;
CREATE POLICY "Admins and managers can update project key results" ON public.project_key_results
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_okrs o
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((o.id = project_key_results.okr_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

-- project_members (3)
DROP POLICY IF EXISTS "Admins and managers can delete project members" ON public.project_members;
CREATE POLICY "Admins and managers can delete project members" ON public.project_members
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_members.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project members" ON public.project_members;
CREATE POLICY "Admins and managers can insert project members" ON public.project_members
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_members.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can update project members" ON public.project_members;
CREATE POLICY "Admins and managers can update project members" ON public.project_members
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_members.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

-- project_milestones (3)
DROP POLICY IF EXISTS "Admins and managers can delete project milestones" ON public.project_milestones;
CREATE POLICY "Admins and managers can delete project milestones" ON public.project_milestones
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_milestones.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project milestones" ON public.project_milestones;
CREATE POLICY "Admins and managers can insert project milestones" ON public.project_milestones
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_milestones.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can update project milestones" ON public.project_milestones;
CREATE POLICY "Admins and managers can update project milestones" ON public.project_milestones
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_milestones.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

-- project_okrs (3)
DROP POLICY IF EXISTS "Admins and managers can delete project okrs" ON public.project_okrs;
CREATE POLICY "Admins and managers can delete project okrs" ON public.project_okrs
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_okrs.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project okrs" ON public.project_okrs;
CREATE POLICY "Admins and managers can insert project okrs" ON public.project_okrs
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_okrs.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can update project okrs" ON public.project_okrs;
CREATE POLICY "Admins and managers can update project okrs" ON public.project_okrs
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_okrs.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

-- project_stakeholders (3)
DROP POLICY IF EXISTS "Admins and managers can delete project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can delete project stakeholders" ON public.project_stakeholders
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can insert project stakeholders" ON public.project_stakeholders
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

DROP POLICY IF EXISTS "Admins and managers can update project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can update project stakeholders" ON public.project_stakeholders
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND has_capability(auth.uid(), p.tenant_id, 'projeto:editar'::text) AND public.can_manage_project(auth.uid(), p.id)))));

-- projects (3)
DROP POLICY IF EXISTS "Admins and managers can delete projects" ON public.projects;
CREATE POLICY "Admins and managers can delete projects" ON public.projects
  FOR DELETE TO public
  USING (has_capability(auth.uid(), tenant_id, 'projeto:editar'::text)
   AND public.can_manage_project(auth.uid(), id));

DROP POLICY IF EXISTS "Admins and managers can insert projects" ON public.projects;
CREATE POLICY "Admins and managers can insert projects" ON public.projects
  FOR INSERT TO public
  WITH CHECK (has_capability(auth.uid(), tenant_id, 'projeto:editar'::text)
   AND (public.has_capability(auth.uid(), tenant_id, 'projeto:gerir-qualquer')
        OR manager_id = public.employee_id_for(auth.uid(), tenant_id)));

DROP POLICY IF EXISTS "Admins and managers can update projects" ON public.projects;
CREATE POLICY "Admins and managers can update projects" ON public.projects
  FOR UPDATE TO public
  USING (has_capability(auth.uid(), tenant_id, 'projeto:editar'::text)
   AND public.can_manage_project(auth.uid(), id));
