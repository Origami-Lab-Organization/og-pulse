-- Rollback do grupo 5a (PUL-201): restaura o predicado por papel.
-- Não é aplicado pela CLI; executar manualmente se a virada precisar ser desfeita.

-- benefits (3)
DROP POLICY IF EXISTS "Admins can delete benefits" ON public.benefits;
CREATE POLICY "Admins can delete benefits" ON public.benefits
  FOR DELETE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert benefits" ON public.benefits;
CREATE POLICY "Admins can insert benefits" ON public.benefits
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update benefits" ON public.benefits;
CREATE POLICY "Admins can update benefits" ON public.benefits
  FOR UPDATE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- company_holidays (3)
DROP POLICY IF EXISTS "Admins can delete holidays" ON public.company_holidays;
CREATE POLICY "Admins can delete holidays" ON public.company_holidays
  FOR DELETE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert holidays" ON public.company_holidays;
CREATE POLICY "Admins can insert holidays" ON public.company_holidays
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update holidays" ON public.company_holidays;
CREATE POLICY "Admins can update holidays" ON public.company_holidays
  FOR UPDATE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- financial_settings (3)
DROP POLICY IF EXISTS "Admins can delete financial settings" ON public.financial_settings;
CREATE POLICY "Admins can delete financial settings" ON public.financial_settings
  FOR DELETE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert financial settings" ON public.financial_settings;
CREATE POLICY "Admins can insert financial settings" ON public.financial_settings
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update financial settings" ON public.financial_settings;
CREATE POLICY "Admins can update financial settings" ON public.financial_settings
  FOR UPDATE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- payroll_profiles (3)
DROP POLICY IF EXISTS "Admins can delete payroll profiles" ON public.payroll_profiles;
CREATE POLICY "Admins can delete payroll profiles" ON public.payroll_profiles
  FOR DELETE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert payroll profiles" ON public.payroll_profiles;
CREATE POLICY "Admins can insert payroll profiles" ON public.payroll_profiles
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update payroll profiles" ON public.payroll_profiles;
CREATE POLICY "Admins can update payroll profiles" ON public.payroll_profiles
  FOR UPDATE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- role_rates (3)
DROP POLICY IF EXISTS "Admins can delete role rates" ON public.role_rates;
CREATE POLICY "Admins can delete role rates" ON public.role_rates
  FOR DELETE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert role rates" ON public.role_rates;
CREATE POLICY "Admins can insert role rates" ON public.role_rates
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update role rates" ON public.role_rates;
CREATE POLICY "Admins can update role rates" ON public.role_rates
  FOR UPDATE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- service_revenue_models (3)
DROP POLICY IF EXISTS "service_revenue_models_delete" ON public.service_revenue_models;
CREATE POLICY "service_revenue_models_delete" ON public.service_revenue_models
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "service_revenue_models_insert" ON public.service_revenue_models;
CREATE POLICY "service_revenue_models_insert" ON public.service_revenue_models
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "service_revenue_models_update" ON public.service_revenue_models;
CREATE POLICY "service_revenue_models_update" ON public.service_revenue_models
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- tenants (1)
DROP POLICY IF EXISTS "Admins can update their tenant" ON public.tenants;
CREATE POLICY "Admins can update their tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), id, 'admin'::app_role));

-- tools (3)
DROP POLICY IF EXISTS "Admins can delete tools" ON public.tools;
CREATE POLICY "Admins can delete tools" ON public.tools
  FOR DELETE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert tools" ON public.tools;
CREATE POLICY "Admins can insert tools" ON public.tools
  FOR INSERT TO public
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update tools" ON public.tools;
CREATE POLICY "Admins can update tools" ON public.tools
  FOR UPDATE TO public
  USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));
