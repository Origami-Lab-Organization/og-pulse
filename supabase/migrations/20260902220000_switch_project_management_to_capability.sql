-- PUL-201 — GRUPO 3a da virada: gestão de projeto decide por capacidade.
--
-- O grupo 3 (tabelas project_*) foi dividido em dois pela natureza do dado, não pelo
-- prefixo. Este é o de GESTÃO: marcos, OKRs, stakeholders, membros, ritos, relatórios de
-- GPO, log de edição, alocação. Nada aqui carrega custo, valor ou remuneração — isso é o
-- 3b, que vem depois e por último antes de folha.
--
-- Mapeamento:
--   escrita (projects, project_members, milestones, okrs, key_results, stakeholders)
--       -> projeto:editar
--   leitura gerencial (edit_logs, gpo_reports, gpo_actions, gpo_action_reviews, ritos)
--       -> portfolio:ler
--   project_role_allocations SELECT -> alocacao:ler
--
-- Por que portfolio:ler e não projeto:ler para as leituras: o seed concedeu projeto:ler
-- também a Colaborador (escopo "alocado" da matriz), então has_capability(projeto:ler) NÃO
-- equivale a is_admin_or_manager — trocar por ele daria leitura de GPO e ritos a
-- colaborador comum. portfolio:ler é exatamente Admin+Gerente (paridade 0 em produção).
--
-- Sobre projeto:editar e o escopo PM: a matriz diz que gerente edita "apenas onde é o
-- gerente responsável", mas a policy VIGENTE de projects usa is_admin_or_manager —
-- qualquer gerente. A virada preserva o vigente (dia 1 = dia 0). O escopo PM já existe
-- em outras policies via can_manage_project e não é tocado aqui; estreitar projects para
-- PM é mudança de política, fora desta migration.
--
-- Três predicados são COMPOSTOS — `is_admin_or_manager OR <escopo pessoal>` — e só o
-- primeiro termo troca: ritos e ocorrências mantêm `OR can_link_project_rito`, e
-- role_allocations mantém `OR a própria alocação`. Quem já via o seu continua vendo.
--
-- Gerada a partir de pg_policies de produção. Rollback em supabase/rollback/.

DROP POLICY IF EXISTS "Admins and managers can view project edit logs" ON public.project_edit_logs;
CREATE POLICY "Admins and managers can view project edit logs" ON public.project_edit_logs
  FOR SELECT TO public
  USING (public.has_capability(auth.uid(), get_project_tenant_id(project_id), 'portfolio:ler'));

DROP POLICY IF EXISTS "project_gpo_action_reviews_select_manager" ON public.project_gpo_action_reviews;
CREATE POLICY "project_gpo_action_reviews_select_manager" ON public.project_gpo_action_reviews
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM project_gpo_reports r
  WHERE ((r.id = project_gpo_action_reviews.report_id) AND public.has_capability(auth.uid(), r.tenant_id, 'portfolio:ler')))));

DROP POLICY IF EXISTS "project_gpo_actions_select_manager" ON public.project_gpo_actions;
CREATE POLICY "project_gpo_actions_select_manager" ON public.project_gpo_actions
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM project_gpo_reports r
  WHERE ((r.id = project_gpo_actions.source_report_id) AND public.has_capability(auth.uid(), r.tenant_id, 'portfolio:ler')))));

DROP POLICY IF EXISTS "project_gpo_reports_select_manager" ON public.project_gpo_reports;
CREATE POLICY "project_gpo_reports_select_manager" ON public.project_gpo_reports
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'portfolio:ler'));

DROP POLICY IF EXISTS "Admins and managers can delete project key results" ON public.project_key_results;
CREATE POLICY "Admins and managers can delete project key results" ON public.project_key_results
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_okrs o
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((o.id = project_key_results.okr_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert project key results" ON public.project_key_results;
CREATE POLICY "Admins and managers can insert project key results" ON public.project_key_results
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (project_okrs o
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((o.id = project_key_results.okr_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update project key results" ON public.project_key_results;
CREATE POLICY "Admins and managers can update project key results" ON public.project_key_results
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_okrs o
     JOIN projects p ON ((p.id = o.project_id)))
  WHERE ((o.id = project_key_results.okr_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can delete project members" ON public.project_members;
CREATE POLICY "Admins and managers can delete project members" ON public.project_members
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_members.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert project members" ON public.project_members;
CREATE POLICY "Admins and managers can insert project members" ON public.project_members
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_members.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update project members" ON public.project_members;
CREATE POLICY "Admins and managers can update project members" ON public.project_members
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_members.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can delete project milestones" ON public.project_milestones;
CREATE POLICY "Admins and managers can delete project milestones" ON public.project_milestones
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_milestones.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert project milestones" ON public.project_milestones;
CREATE POLICY "Admins and managers can insert project milestones" ON public.project_milestones
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_milestones.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update project milestones" ON public.project_milestones;
CREATE POLICY "Admins and managers can update project milestones" ON public.project_milestones
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_milestones.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can delete project okrs" ON public.project_okrs;
CREATE POLICY "Admins and managers can delete project okrs" ON public.project_okrs
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_okrs.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert project okrs" ON public.project_okrs;
CREATE POLICY "Admins and managers can insert project okrs" ON public.project_okrs
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_okrs.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update project okrs" ON public.project_okrs;
CREATE POLICY "Admins and managers can update project okrs" ON public.project_okrs
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_okrs.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "project_rito_occurrences_select_tenant" ON public.project_rito_occurrences;
CREATE POLICY "project_rito_occurrences_select_tenant" ON public.project_rito_occurrences
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM project_ritos r
  WHERE ((r.id = project_rito_occurrences.project_rito_id) AND (public.has_capability(auth.uid(), r.tenant_id, 'portfolio:ler') OR can_link_project_rito(auth.uid(), r.project_id))))));

DROP POLICY IF EXISTS "project_ritos_select_tenant" ON public.project_ritos;
CREATE POLICY "project_ritos_select_tenant" ON public.project_ritos
  FOR SELECT TO authenticated
  USING ((public.has_capability(auth.uid(), tenant_id, 'portfolio:ler') OR can_link_project_rito(auth.uid(), project_id)));

DROP POLICY IF EXISTS "project_role_allocations_select_admin_manager_or_member" ON public.project_role_allocations;
CREATE POLICY "project_role_allocations_select_admin_manager_or_member" ON public.project_role_allocations
  FOR SELECT TO authenticated
  USING ((public.has_capability(auth.uid(), tenant_id, 'alocacao:ler') OR (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = project_role_allocations.employee_id) AND (e.auth_id = auth.uid()))))));

DROP POLICY IF EXISTS "Admins and managers can delete project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can delete project stakeholders" ON public.project_stakeholders
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can insert project stakeholders" ON public.project_stakeholders
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can update project stakeholders" ON public.project_stakeholders
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_stakeholders.project_id) AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')))));

DROP POLICY IF EXISTS "Admins and managers can delete projects" ON public.projects;
CREATE POLICY "Admins and managers can delete projects" ON public.projects
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'projeto:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert projects" ON public.projects;
CREATE POLICY "Admins and managers can insert projects" ON public.projects
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'projeto:editar'));

DROP POLICY IF EXISTS "Admins and managers can update projects" ON public.projects;
CREATE POLICY "Admins and managers can update projects" ON public.projects
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'projeto:editar'));
