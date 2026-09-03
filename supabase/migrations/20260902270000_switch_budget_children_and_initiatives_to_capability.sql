-- PUL-201 — grupo 4d da virada: filhos de orçamento e exclusão de iniciativas decidem por
-- capacidade (ADR-0027). Sete policies que escaparam dos grupos 2 e 3a por omissão na
-- classificação: budget_subscriptions e budget_suppliers (I/U/D, via EXISTS em budgets,
-- que já decide por orcamento:ler) → orcamento:editar; strategy_initiatives DELETE →
-- iniciativa:editar. Seed de ambas = Admin + Gerente = is_admin_or_manager: paridade exata.
--
-- Ficam de fora, registradas em TD-0019: os DELETE de strategy_cycles/objectives/
-- key_results/checkins (admin OU gerente hoje; okr:editar é só Admin no seed) e
-- vacation_requests UPDATE (termo admin-only; ferias:gerir é Admin + Gerente).
--
-- Gerada a partir de pg_policies: nome, comando, roles e forma preservados; só o termo
-- de papel muda. Rollback executado no harness: supabase/rollback/<mesmo nome>.down.sql


-- budget_subscriptions (3)
DROP POLICY IF EXISTS "Admins and managers can delete budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can delete budget subscriptions" ON public.budget_subscriptions
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_subscriptions.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can insert budget subscriptions" ON public.budget_subscriptions
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_subscriptions.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can update budget subscriptions" ON public.budget_subscriptions
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_subscriptions.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

-- budget_suppliers (3)
DROP POLICY IF EXISTS "Admins and managers can delete budget suppliers" ON public.budget_suppliers;
CREATE POLICY "Admins and managers can delete budget suppliers" ON public.budget_suppliers
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_suppliers.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can insert budget suppliers" ON public.budget_suppliers;
CREATE POLICY "Admins and managers can insert budget suppliers" ON public.budget_suppliers
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_suppliers.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

DROP POLICY IF EXISTS "Admins and managers can update budget suppliers" ON public.budget_suppliers;
CREATE POLICY "Admins and managers can update budget suppliers" ON public.budget_suppliers
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_suppliers.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:editar')))));

-- strategy_initiatives (1)
DROP POLICY IF EXISTS "tenant_delete_initiatives" ON public.strategy_initiatives;
CREATE POLICY "tenant_delete_initiatives" ON public.strategy_initiatives
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'iniciativa:editar'));
