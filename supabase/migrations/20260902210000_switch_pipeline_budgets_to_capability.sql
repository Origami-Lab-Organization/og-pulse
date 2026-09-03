-- PUL-201 — GRUPO 2 da virada: Pipeline e Orçamentos decidem por capacidade.
--
-- Segundo grupo do plano da PUL-209. Diferente do catálogo, aqui a LEITURA também vira:
-- `leads`, `lead_*`, `budgets` e `budget_versions` têm SELECT por `is_admin_or_manager`.
-- Errar não tira só a edição — tira a visão do Pipeline. Ainda é falha barulhenta (não
-- vaza), mas para a operação comercial; por isso vem depois do catálogo e antes do
-- financeiro de projeto.
--
-- Mapeamento:
--   leads, lead_follow_ups, lead_interactions, lead_services, lead_activity_log
--       SELECT -> pipeline:ler        INSERT/UPDATE/DELETE -> pipeline:editar
--   budgets, budget_versions, budget_materials, budget_roles, budget_role_months
--       SELECT -> orcamento:ler       INSERT/UPDATE/DELETE -> orcamento:editar
--
-- Equivalência: o seed concedeu as quatro capacidades exatamente a Admin e Gerente — os
-- dois app_role que is_admin_or_manager aceita. Paridade confirmada contra produção:
-- 0 divergência em pipeline:ler e orcamento:ler para os 35 usuários.
--
-- O que NÃO muda, de propósito:
--   O SELECT de budget_materials, budget_roles e budget_role_months usa
--   user_belongs_to_tenant via EXISTS em budgets. Parece furo — as filhas carregam
--   hourly_rate, hours e value, suficientes para reconstruir o valor do orçamento — mas
--   não é: subquery em policy respeita a RLS da tabela interna, então quem não lê
--   `budgets` recebe 0 linhas das filhas. Provado em harness. O predicado é redundante e
--   frágil (afrouxar `budgets` abre as filhas), e fica registrado para o grupo de
--   correções de política, que não se mistura com virada de mecanismo.
--
-- Esta migration foi GERADA a partir de pg_policies de produção (35 policies, 14 formas),
-- substituindo apenas o predicado. Nome, comando, roles e forma (direto ou via pai) são
-- preservados um a um. Gerar em vez de transcrever é o que evita erro de digitação em
-- 35 policies.
--
-- Rollback: supabase/rollback/20260902210000_switch_pipeline_budgets_to_capability.down.sql

DROP POLICY IF EXISTS "Admins and managers can delete budget materials" ON public.budget_materials;
CREATE POLICY "Admins and managers can delete budget materials" ON public.budget_materials
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_materials.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert budget materials" ON public.budget_materials;
CREATE POLICY "Admins and managers can insert budget materials" ON public.budget_materials
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_materials.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update budget materials" ON public.budget_materials;
CREATE POLICY "Admins and managers can update budget materials" ON public.budget_materials
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_materials.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can delete budget role months" ON public.budget_role_months;
CREATE POLICY "Admins and managers can delete budget role months" ON public.budget_role_months
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (budget_roles br
     JOIN budgets b ON ((b.id = br.budget_id)))
  WHERE ((br.id = budget_role_months.budget_role_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert budget role months" ON public.budget_role_months;
CREATE POLICY "Admins and managers can insert budget role months" ON public.budget_role_months
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (budget_roles br
     JOIN budgets b ON ((b.id = br.budget_id)))
  WHERE ((br.id = budget_role_months.budget_role_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update budget role months" ON public.budget_role_months;
CREATE POLICY "Admins and managers can update budget role months" ON public.budget_role_months
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (budget_roles br
     JOIN budgets b ON ((b.id = br.budget_id)))
  WHERE ((br.id = budget_role_months.budget_role_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can delete budget roles" ON public.budget_roles;
CREATE POLICY "Admins and managers can delete budget roles" ON public.budget_roles
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_roles.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert budget roles" ON public.budget_roles;
CREATE POLICY "Admins and managers can insert budget roles" ON public.budget_roles
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_roles.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update budget roles" ON public.budget_roles;
CREATE POLICY "Admins and managers can update budget roles" ON public.budget_roles
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_roles.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can delete budget versions" ON public.budget_versions;
CREATE POLICY "Admins and managers can delete budget versions" ON public.budget_versions
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_versions.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert budget versions" ON public.budget_versions;
CREATE POLICY "Admins and managers can insert budget versions" ON public.budget_versions
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_versions.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can view budget versions" ON public.budget_versions;
CREATE POLICY "Admins and managers can view budget versions" ON public.budget_versions
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_versions.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:ler')))));

DROP POLICY IF EXISTS "Admins and managers can delete budgets" ON public.budgets;
CREATE POLICY "Admins and managers can delete budgets" ON public.budgets
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'orcamento:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert budgets" ON public.budgets;
CREATE POLICY "Admins and managers can insert budgets" ON public.budgets
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'orcamento:editar'));

DROP POLICY IF EXISTS "Admins and managers can view budgets" ON public.budgets;
CREATE POLICY "Admins and managers can view budgets" ON public.budgets
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'orcamento:ler'));

DROP POLICY IF EXISTS "Admins and managers can update budgets" ON public.budgets;
CREATE POLICY "Admins and managers can update budgets" ON public.budgets
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'orcamento:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete lead activities" ON public.lead_activity_log;
CREATE POLICY "Admins and managers can delete lead activities" ON public.lead_activity_log
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert lead activities" ON public.lead_activity_log;
CREATE POLICY "Admins and managers can insert lead activities" ON public.lead_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can view lead activities" ON public.lead_activity_log;
CREATE POLICY "Admins and managers can view lead activities" ON public.lead_activity_log
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:ler'));

DROP POLICY IF EXISTS "Admins and managers can delete follow-ups" ON public.lead_follow_ups;
CREATE POLICY "Admins and managers can delete follow-ups" ON public.lead_follow_ups
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert follow-ups" ON public.lead_follow_ups;
CREATE POLICY "Admins and managers can insert follow-ups" ON public.lead_follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can view follow-ups" ON public.lead_follow_ups;
CREATE POLICY "Admins and managers can view follow-ups" ON public.lead_follow_ups
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:ler'));

DROP POLICY IF EXISTS "Admins and managers can update follow-ups" ON public.lead_follow_ups;
CREATE POLICY "Admins and managers can update follow-ups" ON public.lead_follow_ups
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete interactions" ON public.lead_interactions;
CREATE POLICY "Admins and managers can delete interactions" ON public.lead_interactions
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert interactions" ON public.lead_interactions;
CREATE POLICY "Admins and managers can insert interactions" ON public.lead_interactions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can view interactions" ON public.lead_interactions;
CREATE POLICY "Admins and managers can view interactions" ON public.lead_interactions
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:ler'));

DROP POLICY IF EXISTS "Admins and managers can update interactions" ON public.lead_interactions;
CREATE POLICY "Admins and managers can update interactions" ON public.lead_interactions
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "lead_services_delete" ON public.lead_services;
CREATE POLICY "lead_services_delete" ON public.lead_services
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "lead_services_insert" ON public.lead_services;
CREATE POLICY "lead_services_insert" ON public.lead_services
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "lead_services_select" ON public.lead_services;
CREATE POLICY "lead_services_select" ON public.lead_services
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:ler'));

DROP POLICY IF EXISTS "lead_services_update" ON public.lead_services;
CREATE POLICY "lead_services_update" ON public.lead_services
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete leads" ON public.leads;
CREATE POLICY "Admins and managers can delete leads" ON public.leads
  FOR DELETE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert leads" ON public.leads;
CREATE POLICY "Admins and managers can insert leads" ON public.leads
  FOR INSERT TO public
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));

DROP POLICY IF EXISTS "Admins and managers can view leads" ON public.leads;
CREATE POLICY "Admins and managers can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:ler'));

DROP POLICY IF EXISTS "Admins and managers can update leads" ON public.leads;
CREATE POLICY "Admins and managers can update leads" ON public.leads
  FOR UPDATE TO public
  USING (public.has_capability(auth.uid(), tenant_id, 'pipeline:editar'));
