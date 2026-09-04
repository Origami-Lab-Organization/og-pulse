-- Rollback do grupo 5b (PUL-201): restaura o predicado por papel.
-- Não é aplicado pela CLI; executar manualmente se a virada precisar ser desfeita.

-- employee_benefits (3)
DROP POLICY IF EXISTS "Admins can delete employee benefits" ON public.employee_benefits;
CREATE POLICY "Admins can delete employee benefits" ON public.employee_benefits
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_benefits.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

DROP POLICY IF EXISTS "Admins can insert employee benefits" ON public.employee_benefits;
CREATE POLICY "Admins can insert employee benefits" ON public.employee_benefits
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_benefits.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

DROP POLICY IF EXISTS "Admins can update employee benefits" ON public.employee_benefits;
CREATE POLICY "Admins can update employee benefits" ON public.employee_benefits
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_benefits.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

-- employee_terminations (1)
DROP POLICY IF EXISTS "Admins can manage terminations" ON public.employee_terminations;
CREATE POLICY "Admins can manage terminations" ON public.employee_terminations
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_terminations.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_terminations.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

-- employee_tools (3)
DROP POLICY IF EXISTS "Admins can delete employee tools" ON public.employee_tools;
CREATE POLICY "Admins can delete employee tools" ON public.employee_tools
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_tools.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

DROP POLICY IF EXISTS "Admins can insert employee tools" ON public.employee_tools;
CREATE POLICY "Admins can insert employee tools" ON public.employee_tools
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_tools.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

DROP POLICY IF EXISTS "Admins can update employee tools" ON public.employee_tools;
CREATE POLICY "Admins can update employee tools" ON public.employee_tools
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_tools.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

-- employee_versions (3)
DROP POLICY IF EXISTS "Admins can delete employee versions" ON public.employee_versions;
CREATE POLICY "Admins can delete employee versions" ON public.employee_versions
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_versions.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

DROP POLICY IF EXISTS "Admins can insert employee versions" ON public.employee_versions;
CREATE POLICY "Admins can insert employee versions" ON public.employee_versions
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_versions.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

DROP POLICY IF EXISTS "Admins can update employee versions" ON public.employee_versions;
CREATE POLICY "Admins can update employee versions" ON public.employee_versions
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_versions.employee_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

-- employees (2)
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;
CREATE POLICY "Admins can delete employees" ON public.employees
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
CREATE POLICY "Admins can insert employees" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- payroll_adjustments (1)
DROP POLICY IF EXISTS "Admins can manage payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Admins can manage payroll adjustments" ON public.payroll_adjustments
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = payroll_adjustments.termination_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = payroll_adjustments.termination_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));

-- termination_documents (1)
DROP POLICY IF EXISTS "Admins can manage termination documents" ON public.termination_documents;
CREATE POLICY "Admins can manage termination documents" ON public.termination_documents
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = termination_documents.termination_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = termination_documents.termination_id) AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))));
