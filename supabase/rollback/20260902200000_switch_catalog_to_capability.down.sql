-- ROLLBACK do grupo 1 da PUL-201 — escrita de catálogo volta a is_admin_or_manager.
--
-- NÃO é migration: este diretório não é aplicado pelo Supabase CLI. Para usar, execute
-- este arquivo manualmente contra o banco alvo.
--
-- Quando usar: se a virada do grupo 1 causar recusa de escrita legítima em catálogo — por
-- exemplo se o seed de `catalogo:editar` estiver incompleto em algum tenant. O sintoma é
-- admin ou gerente recebendo negação ao salvar serviço, linha de serviço ou tipo de
-- atividade.
--
-- Este rollback foi EXECUTADO em harness antes do merge, não apenas escrito — é o que a
-- PUL-209 exige no Cenário 3.

DROP POLICY IF EXISTS services_insert ON public.services;
CREATE POLICY services_insert ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS services_update ON public.services;
CREATE POLICY services_update ON public.services FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS services_delete ON public.services;
CREATE POLICY services_delete ON public.services FOR DELETE TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS service_lines_insert ON public.service_lines;
CREATE POLICY service_lines_insert ON public.service_lines FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS service_lines_update ON public.service_lines;
CREATE POLICY service_lines_update ON public.service_lines FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS service_lines_delete ON public.service_lines;
CREATE POLICY service_lines_delete ON public.service_lines FOR DELETE TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS activity_types_insert ON public.activity_types;
CREATE POLICY activity_types_insert ON public.activity_types FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS activity_types_update ON public.activity_types;
CREATE POLICY activity_types_update ON public.activity_types FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS activity_types_delete ON public.activity_types;
CREATE POLICY activity_types_delete ON public.activity_types FOR DELETE TO authenticated
  USING (public.is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS activity_type_employees_insert ON public.activity_type_employees;
CREATE POLICY activity_type_employees_insert ON public.activity_type_employees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.activity_types at
            WHERE at.id = activity_type_employees.activity_type_id
              AND public.is_admin_or_manager(auth.uid(), at.tenant_id))
  );

DROP POLICY IF EXISTS activity_type_employees_delete ON public.activity_type_employees;
CREATE POLICY activity_type_employees_delete ON public.activity_type_employees
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.activity_types at
            WHERE at.id = activity_type_employees.activity_type_id
              AND public.is_admin_or_manager(auth.uid(), at.tenant_id))
  );
