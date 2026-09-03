-- ROLLBACK do grupo 4c da PUL-201. NAO e migration: execute manualmente. Gerado dos predicados exatos
-- de producao e EXECUTADO em harness antes do merge.

DROP POLICY IF EXISTS "Admins and managers can view employee benefits" ON public.employee_benefits;
CREATE POLICY "Admins and managers can view employee benefits" ON public.employee_benefits
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_benefits.employee_id) AND (has_role(auth.uid(), e.tenant_id, 'admin'::app_role) OR has_role(auth.uid(), e.tenant_id, 'manager'::app_role))))));

DROP POLICY IF EXISTS "Managers can view terminations" ON public.employee_terminations;
CREATE POLICY "Managers can view terminations" ON public.employee_terminations
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_terminations.employee_id) AND is_admin_or_manager(auth.uid(), e.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view employee tools" ON public.employee_tools;
CREATE POLICY "Admins and managers can view employee tools" ON public.employee_tools
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_tools.employee_id) AND (has_role(auth.uid(), e.tenant_id, 'admin'::app_role) OR has_role(auth.uid(), e.tenant_id, 'manager'::app_role))))));

DROP POLICY IF EXISTS "Admins and managers can view employee versions" ON public.employee_versions;
CREATE POLICY "Admins and managers can view employee versions" ON public.employee_versions
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_versions.employee_id) AND (has_role(auth.uid(), e.tenant_id, 'admin'::app_role) OR has_role(auth.uid(), e.tenant_id, 'manager'::app_role))))));

DROP POLICY IF EXISTS "Admins and managers can view all employees in tenant" ON public.employees;
CREATE POLICY "Admins and managers can view all employees in tenant" ON public.employees
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins can update employees in their tenant" ON public.employees;
CREATE POLICY "Admins can update employees in their tenant" ON public.employees
  FOR UPDATE TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can view financial settings" ON public.financial_settings;
CREATE POLICY "Admins and managers can view financial settings" ON public.financial_settings
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can view payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Managers can view payroll adjustments" ON public.payroll_adjustments
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = payroll_adjustments.termination_id) AND is_admin_or_manager(auth.uid(), e.tenant_id)))));

DROP POLICY IF EXISTS "Admins and managers can view payroll profiles" ON public.payroll_profiles;
CREATE POLICY "Admins and managers can view payroll profiles" ON public.payroll_profiles
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can view role rates" ON public.role_rates;
CREATE POLICY "Admins and managers can view role rates" ON public.role_rates
  FOR SELECT TO authenticated
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Managers can view termination documents" ON public.termination_documents;
CREATE POLICY "Managers can view termination documents" ON public.termination_documents
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = termination_documents.termination_id) AND is_admin_or_manager(auth.uid(), e.tenant_id)))));
