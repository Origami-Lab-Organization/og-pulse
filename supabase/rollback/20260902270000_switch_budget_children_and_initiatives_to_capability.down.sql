-- Rollback do grupo 4d (PUL-201): restaura o predicado por papel nas 7 policies.
-- Não é aplicado pela CLI; executar manualmente se a virada precisar ser desfeita.


-- budget_subscriptions (3)
DROP POLICY IF EXISTS "Admins and managers can delete budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can delete budget subscriptions" ON public.budget_subscriptions
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_subscriptions.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can insert budget subscriptions" ON public.budget_subscriptions
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_subscriptions.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update budget subscriptions" ON public.budget_subscriptions;
CREATE POLICY "Admins and managers can update budget subscriptions" ON public.budget_subscriptions
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_subscriptions.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

-- budget_suppliers (3)
DROP POLICY IF EXISTS "Admins and managers can delete budget suppliers" ON public.budget_suppliers;
CREATE POLICY "Admins and managers can delete budget suppliers" ON public.budget_suppliers
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_suppliers.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert budget suppliers" ON public.budget_suppliers;
CREATE POLICY "Admins and managers can insert budget suppliers" ON public.budget_suppliers
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_suppliers.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update budget suppliers" ON public.budget_suppliers;
CREATE POLICY "Admins and managers can update budget suppliers" ON public.budget_suppliers
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_suppliers.budget_id) AND is_admin_or_manager(auth.uid(), b.tenant_id)))));

-- strategy_initiatives (1)
DROP POLICY IF EXISTS "tenant_delete_initiatives" ON public.strategy_initiatives;
CREATE POLICY "tenant_delete_initiatives" ON public.strategy_initiatives
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));
