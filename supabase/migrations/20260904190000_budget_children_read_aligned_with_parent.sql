-- TD-0017 — as filhas de orçamento liam por `user_belongs_to_tenant` enquanto o pai exige
-- `orcamento:ler`. Hoje NÃO vaza, e isso foi provado em harness no grupo 2: subquery em
-- policy respeita a RLS da tabela interna, então o `EXISTS ... FROM budgets` só encontra
-- orçamento que a pessoa já poderia ler — um colaborador lê zero filhas.
--
-- O problema é o predicado ser REDUNDANTE e FRÁGIL ao mesmo tempo. Redundante porque a
-- checagem de tenant já está garantida pelo pai. Frágil porque a proteção real das filhas
-- é um efeito colateral da policy do pai, não algo escrito nelas: no dia em que alguém
-- afrouxar a leitura de `budgets` — ou adicionar uma policy permissiva ali, que em RLS
-- soma por OR — as filhas abrem junto, e elas carregam `hourly_rate`, `hours` e `value`,
-- suficientes para reconstruir o valor do orçamento sem nunca ler a tabela pai.
--
-- Alinhar as filhas ao pai é correção de POLÍTICA, não de mecanismo, e por isso vem
-- separada da virada por capacidade. E é a rara correção de política sem efeito no acesso
-- de hoje: quem lê o pai passa a ser exatamente quem lê as filhas, que já era o resultado
-- efetivo. O que muda é que agora está escrito, e não deduzido.

DROP POLICY IF EXISTS "Users can view budget materials in their tenant" ON public.budget_materials;
CREATE POLICY "Users can view budget materials in their tenant" ON public.budget_materials
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_materials.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:ler')))));

DROP POLICY IF EXISTS "Users can view budget roles in their tenant" ON public.budget_roles;
CREATE POLICY "Users can view budget roles in their tenant" ON public.budget_roles
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_roles.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:ler')))));

DROP POLICY IF EXISTS "Users can view budget role months in their tenant" ON public.budget_role_months;
CREATE POLICY "Users can view budget role months in their tenant" ON public.budget_role_months
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (budget_roles br
     JOIN budgets b ON ((b.id = br.budget_id)))
  WHERE ((br.id = budget_role_months.budget_role_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:ler')))));

DROP POLICY IF EXISTS "Users can view budget subscriptions in their tenant" ON public.budget_subscriptions;
CREATE POLICY "Users can view budget subscriptions in their tenant" ON public.budget_subscriptions
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_subscriptions.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:ler')))));

DROP POLICY IF EXISTS "Users can view budget suppliers in their tenant" ON public.budget_suppliers;
CREATE POLICY "Users can view budget suppliers in their tenant" ON public.budget_suppliers
  FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM budgets b
  WHERE ((b.id = budget_suppliers.budget_id) AND public.has_capability(auth.uid(), b.tenant_id, 'orcamento:ler')))));
