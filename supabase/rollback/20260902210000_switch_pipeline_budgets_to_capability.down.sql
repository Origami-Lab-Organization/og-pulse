-- ROLLBACK do grupo 2 da PUL-201 — Pipeline e Orçamentos voltam a is_admin_or_manager.
--
-- NÃO é migration: este diretório não é aplicado pelo Supabase CLI. Execute manualmente
-- contra o banco alvo.
--
-- Sintoma que justifica usá-lo: admin ou gerente deixando de ver Oportunidades ou
-- Orçamentos, ou recebendo negação ao salvar. Gerado a partir dos predicados exatos que
-- estavam em produção antes da virada, e EXECUTADO em harness antes do merge.

DROP POLICY IF EXISTS "Admins and managers can delete budget materials" ON public.budget_materials;
CREATE POLICY "Admins and managers can delete budget materials" ON public.budget_materials
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_materials.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert budget materials" ON public.budget_materials;
CREATE POLICY "Admins and managers can insert budget materials" ON public.budget_materials
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_materials.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update budget materials" ON public.budget_materials;
CREATE POLICY "Admins and managers can update budget materials" ON public.budget_materials
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_materials.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete budget role months" ON public.budget_role_months;
CREATE POLICY "Admins and managers can delete budget role months" ON public.budget_role_months
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (budget_roles br
     JOIN budgets b ON ((b.id = br.budget_id)))
  WHERE ((br.id = budget_role_months.budget_role_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert budget role months" ON public.budget_role_months;
CREATE POLICY "Admins and managers can insert budget role months" ON public.budget_role_months
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (budget_roles br
     JOIN budgets b ON ((b.id = br.budget_id)))
  WHERE ((br.id = budget_role_months.budget_role_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update budget role months" ON public.budget_role_months;
CREATE POLICY "Admins and managers can update budget role months" ON public.budget_role_months
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (budget_roles br
     JOIN budgets b ON ((b.id = br.budget_id)))
  WHERE ((br.id = budget_role_months.budget_role_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete budget roles" ON public.budget_roles;
CREATE POLICY "Admins and managers can delete budget roles" ON public.budget_roles
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_roles.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert budget roles" ON public.budget_roles;
CREATE POLICY "Admins and managers can insert budget roles" ON public.budget_roles
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_roles.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update budget roles" ON public.budget_roles;
CREATE POLICY "Admins and managers can update budget roles" ON public.budget_roles
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_roles.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete budget versions" ON public.budget_versions;
CREATE POLICY "Admins and managers can delete budget versions" ON public.budget_versions
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_versions.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert budget versions" ON public.budget_versions;
CREATE POLICY "Admins and managers can insert budget versions" ON public.budget_versions
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_versions.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view budget versions" ON public.budget_versions;
CREATE POLICY "Admins and managers can view budget versions" ON public.budget_versions
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_versions.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete budgets" ON public.budgets;
CREATE POLICY "Admins and managers can delete budgets" ON public.budgets
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert budgets" ON public.budgets;
CREATE POLICY "Admins and managers can insert budgets" ON public.budgets
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can view budgets" ON public.budgets;
CREATE POLICY "Admins and managers can view budgets" ON public.budgets
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update budgets" ON public.budgets;
CREATE POLICY "Admins and managers can update budgets" ON public.budgets
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete lead activities" ON public.lead_activity_log;
CREATE POLICY "Admins and managers can delete lead activities" ON public.lead_activity_log
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert lead activities" ON public.lead_activity_log;
CREATE POLICY "Admins and managers can insert lead activities" ON public.lead_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can view lead activities" ON public.lead_activity_log;
CREATE POLICY "Admins and managers can view lead activities" ON public.lead_activity_log
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete follow-ups" ON public.lead_follow_ups;
CREATE POLICY "Admins and managers can delete follow-ups" ON public.lead_follow_ups
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert follow-ups" ON public.lead_follow_ups;
CREATE POLICY "Admins and managers can insert follow-ups" ON public.lead_follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can view follow-ups" ON public.lead_follow_ups;
CREATE POLICY "Admins and managers can view follow-ups" ON public.lead_follow_ups
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update follow-ups" ON public.lead_follow_ups;
CREATE POLICY "Admins and managers can update follow-ups" ON public.lead_follow_ups
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete interactions" ON public.lead_interactions;
CREATE POLICY "Admins and managers can delete interactions" ON public.lead_interactions
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert interactions" ON public.lead_interactions;
CREATE POLICY "Admins and managers can insert interactions" ON public.lead_interactions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can view interactions" ON public.lead_interactions;
CREATE POLICY "Admins and managers can view interactions" ON public.lead_interactions
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update interactions" ON public.lead_interactions;
CREATE POLICY "Admins and managers can update interactions" ON public.lead_interactions
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "lead_services_delete" ON public.lead_services;
CREATE POLICY "lead_services_delete" ON public.lead_services
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "lead_services_insert" ON public.lead_services;
CREATE POLICY "lead_services_insert" ON public.lead_services
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "lead_services_select" ON public.lead_services;
CREATE POLICY "lead_services_select" ON public.lead_services
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "lead_services_update" ON public.lead_services;
CREATE POLICY "lead_services_update" ON public.lead_services
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete leads" ON public.leads;
CREATE POLICY "Admins and managers can delete leads" ON public.leads
  FOR DELETE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert leads" ON public.leads;
CREATE POLICY "Admins and managers can insert leads" ON public.leads
  FOR INSERT TO public
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can view leads" ON public.leads;
CREATE POLICY "Admins and managers can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update leads" ON public.leads;
CREATE POLICY "Admins and managers can update leads" ON public.leads
  FOR UPDATE TO public
  USING (is_admin_or_manager(auth.uid(), tenant_id));
