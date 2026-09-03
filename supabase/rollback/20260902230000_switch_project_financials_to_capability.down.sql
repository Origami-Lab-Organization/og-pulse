-- ROLLBACK do grupo 3b da PUL-201. NÃO é migration: execute manualmente contra o banco alvo.
-- Gerado dos predicados exatos de produção e EXECUTADO em harness antes do merge.

DROP POLICY IF EXISTS "Admins and managers can delete project commissions" ON public.project_commissions;
CREATE POLICY "Admins and managers can delete project commissions" ON public.project_commissions
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_commissions.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project commissions" ON public.project_commissions;
CREATE POLICY "Admins and managers can insert project commissions" ON public.project_commissions
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_commissions.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view project commissions" ON public.project_commissions;
CREATE POLICY "Admins and managers can view project commissions" ON public.project_commissions
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_commissions.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project commissions" ON public.project_commissions;
CREATE POLICY "Admins and managers can update project commissions" ON public.project_commissions
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_commissions.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Manage cost months (admin/manager) - delete" ON public.project_cost_months;
CREATE POLICY "Manage cost months (admin/manager) - delete" ON public.project_cost_months
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_costs pc
     JOIN projects p ON ((p.id = pc.project_id)))
  WHERE ((pc.id = project_cost_months.cost_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Manage cost months (admin/manager) - insert" ON public.project_cost_months;
CREATE POLICY "Manage cost months (admin/manager) - insert" ON public.project_cost_months
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (project_costs pc
     JOIN projects p ON ((p.id = pc.project_id)))
  WHERE ((pc.id = project_cost_months.cost_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view cost months" ON public.project_cost_months;
CREATE POLICY "Admins and managers can view cost months" ON public.project_cost_months
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (project_costs pc
     JOIN projects p ON ((p.id = pc.project_id)))
  WHERE ((pc.id = project_cost_months.cost_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Manage cost months (admin/manager) - update" ON public.project_cost_months;
CREATE POLICY "Manage cost months (admin/manager) - update" ON public.project_cost_months
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_costs pc
     JOIN projects p ON ((p.id = pc.project_id)))
  WHERE ((pc.id = project_cost_months.cost_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project costs" ON public.project_costs;
CREATE POLICY "Admins and managers can delete project costs" ON public.project_costs
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_costs.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project costs" ON public.project_costs;
CREATE POLICY "Admins and managers can insert project costs" ON public.project_costs
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_costs.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view project costs" ON public.project_costs;
CREATE POLICY "Admins and managers can view project costs" ON public.project_costs
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_costs.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project costs" ON public.project_costs;
CREATE POLICY "Admins and managers can update project costs" ON public.project_costs
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_costs.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project financials" ON public.project_financials;
CREATE POLICY "Admins and managers can insert project financials" ON public.project_financials
  FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_financials.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view project financials" ON public.project_financials;
CREATE POLICY "Admins and managers can view project financials" ON public.project_financials
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_financials.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project financials" ON public.project_financials;
CREATE POLICY "Admins and managers can update project financials" ON public.project_financials
  FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_financials.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project installments" ON public.project_installments;
CREATE POLICY "Admins and managers can delete project installments" ON public.project_installments
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_installments.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project installments" ON public.project_installments;
CREATE POLICY "Admins and managers can insert project installments" ON public.project_installments
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_installments.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view project installments" ON public.project_installments;
CREATE POLICY "Admins and managers can view project installments" ON public.project_installments
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_installments.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project installments" ON public.project_installments;
CREATE POLICY "Admins and managers can update project installments" ON public.project_installments
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_installments.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project materials" ON public.project_materials;
CREATE POLICY "Admins and managers can delete project materials" ON public.project_materials
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_materials.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project materials" ON public.project_materials;
CREATE POLICY "Admins and managers can insert project materials" ON public.project_materials
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_materials.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view project materials" ON public.project_materials;
CREATE POLICY "Admins and managers can view project materials" ON public.project_materials
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_materials.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project materials" ON public.project_materials;
CREATE POLICY "Admins and managers can update project materials" ON public.project_materials
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_materials.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project member months" ON public.project_member_months;
CREATE POLICY "Admins and managers can delete project member months" ON public.project_member_months
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_members pm
     JOIN projects p ON ((p.id = pm.project_id)))
  WHERE ((pm.id = project_member_months.project_member_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project member months" ON public.project_member_months;
CREATE POLICY "Admins and managers can insert project member months" ON public.project_member_months
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (project_members pm
     JOIN projects p ON ((p.id = pm.project_id)))
  WHERE ((pm.id = project_member_months.project_member_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Managers or the person can view member months" ON public.project_member_months;
CREATE POLICY "Managers or the person can view member months" ON public.project_member_months
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((project_members pm
     JOIN projects p ON ((p.id = pm.project_id)))
     LEFT JOIN employees e ON ((e.id = pm.employee_id)))
  WHERE ((pm.id = project_member_months.project_member_id) AND (is_admin_or_manager(auth.uid(), p.tenant_id) OR (e.auth_id = auth.uid()))))));

DROP POLICY IF EXISTS "Admins and managers can update project member months" ON public.project_member_months;
CREATE POLICY "Admins and managers can update project member months" ON public.project_member_months
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_members pm
     JOIN projects p ON ((p.id = pm.project_id)))
  WHERE ((pm.id = project_member_months.project_member_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project subscriptions" ON public.project_subscriptions;
CREATE POLICY "Admins and managers can delete project subscriptions" ON public.project_subscriptions
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_subscriptions.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project subscriptions" ON public.project_subscriptions;
CREATE POLICY "Admins and managers can insert project subscriptions" ON public.project_subscriptions
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_subscriptions.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project subscriptions" ON public.project_subscriptions;
CREATE POLICY "Admins and managers can update project subscriptions" ON public.project_subscriptions
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_subscriptions.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project supplier actuals" ON public.project_supplier_actuals;
CREATE POLICY "Admins and managers can delete project supplier actuals" ON public.project_supplier_actuals
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_suppliers ps
     JOIN projects p ON ((p.id = ps.project_id)))
  WHERE ((ps.id = project_supplier_actuals.project_supplier_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project supplier actuals" ON public.project_supplier_actuals;
CREATE POLICY "Admins and managers can insert project supplier actuals" ON public.project_supplier_actuals
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (project_suppliers ps
     JOIN projects p ON ((p.id = ps.project_id)))
  WHERE ((ps.id = project_supplier_actuals.project_supplier_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view supplier actuals" ON public.project_supplier_actuals;
CREATE POLICY "Admins and managers can view supplier actuals" ON public.project_supplier_actuals
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (project_suppliers ps
     JOIN projects p ON ((p.id = ps.project_id)))
  WHERE ((ps.id = project_supplier_actuals.project_supplier_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project supplier actuals" ON public.project_supplier_actuals;
CREATE POLICY "Admins and managers can update project supplier actuals" ON public.project_supplier_actuals
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_suppliers ps
     JOIN projects p ON ((p.id = ps.project_id)))
  WHERE ((ps.id = project_supplier_actuals.project_supplier_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project supplier months" ON public.project_supplier_months;
CREATE POLICY "Admins and managers can delete project supplier months" ON public.project_supplier_months
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_suppliers ps
     JOIN projects p ON ((p.id = ps.project_id)))
  WHERE ((ps.id = project_supplier_months.project_supplier_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project supplier months" ON public.project_supplier_months;
CREATE POLICY "Admins and managers can insert project supplier months" ON public.project_supplier_months
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (project_suppliers ps
     JOIN projects p ON ((p.id = ps.project_id)))
  WHERE ((ps.id = project_supplier_months.project_supplier_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view supplier months" ON public.project_supplier_months;
CREATE POLICY "Admins and managers can view supplier months" ON public.project_supplier_months
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (project_suppliers ps
     JOIN projects p ON ((p.id = ps.project_id)))
  WHERE ((ps.id = project_supplier_months.project_supplier_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project supplier months" ON public.project_supplier_months;
CREATE POLICY "Admins and managers can update project supplier months" ON public.project_supplier_months
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (project_suppliers ps
     JOIN projects p ON ((p.id = ps.project_id)))
  WHERE ((ps.id = project_supplier_months.project_supplier_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project suppliers" ON public.project_suppliers;
CREATE POLICY "Admins and managers can delete project suppliers" ON public.project_suppliers
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_suppliers.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project suppliers" ON public.project_suppliers;
CREATE POLICY "Admins and managers can insert project suppliers" ON public.project_suppliers
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_suppliers.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view project suppliers" ON public.project_suppliers;
CREATE POLICY "Admins and managers can view project suppliers" ON public.project_suppliers
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_suppliers.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can update project suppliers" ON public.project_suppliers;
CREATE POLICY "Admins and managers can update project suppliers" ON public.project_suppliers
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_suppliers.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can delete project timesheets" ON public.project_timesheets;
CREATE POLICY "Admins and managers can delete project timesheets" ON public.project_timesheets
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_timesheets.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can insert project timesheets" ON public.project_timesheets;
CREATE POLICY "Admins and managers can insert project timesheets" ON public.project_timesheets
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_timesheets.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));

DROP POLICY IF EXISTS "Managers or the person can view project timesheets" ON public.project_timesheets;
CREATE POLICY "Managers or the person can view project timesheets" ON public.project_timesheets
  FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_timesheets.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))) OR (EXISTS ( SELECT 1
   FROM (project_members pm
     JOIN employees e ON ((e.id = pm.employee_id)))
  WHERE ((pm.id = project_timesheets.project_member_id) AND (e.auth_id = auth.uid()))))));

DROP POLICY IF EXISTS "Admins and managers can update project timesheets" ON public.project_timesheets;
CREATE POLICY "Admins and managers can update project timesheets" ON public.project_timesheets
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_timesheets.project_id) AND is_admin_or_manager(auth.uid(), p.tenant_id)))));
