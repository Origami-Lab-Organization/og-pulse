-- Rollback do TD-0017: as filhas de orçamento voltam a ler por `user_belongs_to_tenant`.
-- Não reabre acesso hoje (a proteção efetiva vem da policy do pai), mas devolve a
-- fragilidade: afrouxar `budgets` volta a abrir as filhas junto.

DROP POLICY IF EXISTS "Users can view budget materials in their tenant" ON public.budget_materials;
CREATE POLICY "Users can view budget materials in their tenant" ON public.budget_materials
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_materials.budget_id) AND user_belongs_to_tenant(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Users can view budget roles in their tenant" ON public.budget_roles;
CREATE POLICY "Users can view budget roles in their tenant" ON public.budget_roles
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_roles.budget_id) AND user_belongs_to_tenant(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Users can view budget role months in their tenant" ON public.budget_role_months;
CREATE POLICY "Users can view budget role months in their tenant" ON public.budget_role_months
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (budget_roles br
     JOIN budgets b ON ((b.id = br.budget_id)))
  WHERE ((br.id = budget_role_months.budget_role_id) AND user_belongs_to_tenant(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Users can view budget subscriptions in their tenant" ON public.budget_subscriptions;
CREATE POLICY "Users can view budget subscriptions in their tenant" ON public.budget_subscriptions
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_subscriptions.budget_id) AND user_belongs_to_tenant(auth.uid(), b.tenant_id)))));

DROP POLICY IF EXISTS "Users can view budget suppliers in their tenant" ON public.budget_suppliers;
CREATE POLICY "Users can view budget suppliers in their tenant" ON public.budget_suppliers
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_suppliers.budget_id) AND user_belongs_to_tenant(auth.uid(), b.tenant_id)))));
