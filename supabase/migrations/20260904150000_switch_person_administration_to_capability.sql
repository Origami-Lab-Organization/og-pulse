-- PUL-201 grupo 5b — administrar o vínculo da pessoa decide por capacidade.
-- 14 policies, 7 tabelas: employees (INSERT/DELETE), employee_benefits, employee_tools,
-- employee_versions, employee_terminations, payroll_adjustments, termination_documents.
-- Editar a ficha de quem já está na base continua em `pessoa:editar` (Admin + Gerente);
-- esta capacidade é só-admin, como o predicado que substitui. Paridade exata.

-- employee_benefits (3)
DROP POLICY IF EXISTS "Admins can delete employee benefits" ON public.employee_benefits;
CREATE POLICY "Admins can delete employee benefits" ON public.employee_benefits
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_benefits.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

DROP POLICY IF EXISTS "Admins can insert employee benefits" ON public.employee_benefits;
CREATE POLICY "Admins can insert employee benefits" ON public.employee_benefits
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_benefits.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

DROP POLICY IF EXISTS "Admins can update employee benefits" ON public.employee_benefits;
CREATE POLICY "Admins can update employee benefits" ON public.employee_benefits
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_benefits.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

-- employee_terminations (1)
DROP POLICY IF EXISTS "Admins can manage terminations" ON public.employee_terminations;
CREATE POLICY "Admins can manage terminations" ON public.employee_terminations
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_terminations.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_terminations.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

-- employee_tools (3)
DROP POLICY IF EXISTS "Admins can delete employee tools" ON public.employee_tools;
CREATE POLICY "Admins can delete employee tools" ON public.employee_tools
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_tools.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

DROP POLICY IF EXISTS "Admins can insert employee tools" ON public.employee_tools;
CREATE POLICY "Admins can insert employee tools" ON public.employee_tools
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_tools.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

DROP POLICY IF EXISTS "Admins can update employee tools" ON public.employee_tools;
CREATE POLICY "Admins can update employee tools" ON public.employee_tools
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_tools.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

-- employee_versions (3)
DROP POLICY IF EXISTS "Admins can delete employee versions" ON public.employee_versions;
CREATE POLICY "Admins can delete employee versions" ON public.employee_versions
  FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_versions.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

DROP POLICY IF EXISTS "Admins can insert employee versions" ON public.employee_versions;
CREATE POLICY "Admins can insert employee versions" ON public.employee_versions
  FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_versions.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

DROP POLICY IF EXISTS "Admins can update employee versions" ON public.employee_versions;
CREATE POLICY "Admins can update employee versions" ON public.employee_versions
  FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.id = employee_versions.employee_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

-- employees (2)
DROP POLICY IF EXISTS "Admins can delete employees" ON public.employees;
CREATE POLICY "Admins can delete employees" ON public.employees
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:administrar'));

DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
CREATE POLICY "Admins can insert employees" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pessoa:administrar'));

-- payroll_adjustments (1)
DROP POLICY IF EXISTS "Admins can manage payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Admins can manage payroll adjustments" ON public.payroll_adjustments
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = payroll_adjustments.termination_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = payroll_adjustments.termination_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));

-- termination_documents (1)
DROP POLICY IF EXISTS "Admins can manage termination documents" ON public.termination_documents;
CREATE POLICY "Admins can manage termination documents" ON public.termination_documents
  FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = termination_documents.termination_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (employee_terminations et
     JOIN employees e ON ((e.id = et.employee_id)))
  WHERE ((et.id = termination_documents.termination_id) AND public.has_capability(auth.uid(), e.tenant_id, 'pessoa:administrar')))));
