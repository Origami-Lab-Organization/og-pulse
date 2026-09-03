-- PUL-201 — GRUPO 4c: pessoas e folha — LEITURA, e a unica escrita que ja era admin+gerente.
--
-- O mais sensivel da onda. So entra o que tem capacidade equivalente no seed com paridade zero:
-- employees SELECT -> pessoa:ler-ficha-completa (D1 preservada: gerente segue lendo a linha
-- inteira, remuneracao inclusive — virada nao corrige politica); employees UPDATE -> pessoa:editar;
-- employee_benefits/tools/versions SELECT (admin OR manager) -> pessoa:ler-ficha-completa;
-- terminations/payroll_adjustments/termination_documents SELECT -> desligamento:executar;
-- payroll_profiles SELECT -> parametro-folha:ler; role_rates/financial_settings SELECT -> custo-hora:ler.
-- FORA (TD-0019): toda escrita so-admin de pessoas e folha, e vacation_requests.
-- Gerada de pg_policies de producao. Rollback em supabase/rollback/.

DROP POLICY IF EXISTS "Admins and managers can view employee benefits" ON public.employee_benefits;
CREATE POLICY "Admins and managers can view employee benefits" ON public.employee_benefits
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_benefits.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:ler-ficha-completa')))));

DROP POLICY IF EXISTS "Managers can view terminations" ON public.employee_terminations;
CREATE POLICY "Managers can view terminations" ON public.employee_terminations
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_terminations.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'desligamento:executar')))));

DROP POLICY IF EXISTS "Admins and managers can view employee tools" ON public.employee_tools;
CREATE POLICY "Admins and managers can view employee tools" ON public.employee_tools
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_tools.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:ler-ficha-completa')))));

DROP POLICY IF EXISTS "Admins and managers can view employee versions" ON public.employee_versions;
CREATE POLICY "Admins and managers can view employee versions" ON public.employee_versions
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_versions.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:ler-ficha-completa')))));

DROP POLICY IF EXISTS "Admins and managers can view all employees in tenant" ON public.employees;
CREATE POLICY "Admins and managers can view all employees in tenant" ON public.employees
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:ler-ficha-completa'));

DROP POLICY IF EXISTS "Admins can update employees in their tenant" ON public.employees;
CREATE POLICY "Admins can update employees in their tenant" ON public.employees
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar'));

DROP POLICY IF EXISTS "Admins and managers can view financial settings" ON public.financial_settings;
CREATE POLICY "Admins and managers can view financial settings" ON public.financial_settings
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'custo-hora:ler'));

DROP POLICY IF EXISTS "Managers can view payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Managers can view payroll adjustments" ON public.payroll_adjustments
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = payroll_adjustments.termination_id) AND public.has_capability(auth.uid(), e.tenant_id, 'desligamento:executar')))));

DROP POLICY IF EXISTS "Admins and managers can view payroll profiles" ON public.payroll_profiles;
CREATE POLICY "Admins and managers can view payroll profiles" ON public.payroll_profiles
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'parametro-folha:ler'));

DROP POLICY IF EXISTS "Admins and managers can view role rates" ON public.role_rates;
CREATE POLICY "Admins and managers can view role rates" ON public.role_rates
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'custo-hora:ler'));

DROP POLICY IF EXISTS "Managers can view termination documents" ON public.termination_documents;
CREATE POLICY "Managers can view termination documents" ON public.termination_documents
  FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = termination_documents.termination_id) AND public.has_capability(auth.uid(), e.tenant_id, 'desligamento:executar')))));
