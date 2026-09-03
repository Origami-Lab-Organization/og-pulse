-- PUL-201 — GRUPO 1 da virada: escrita de catálogo passa a decidir por capacidade.
--
-- Primeiro grupo de propósito. O plano da PUL-209 manda ir do menos sensível ao mais
-- sensível, e catálogo é o piso: as 11 policies afetadas são todas de ESCRITA, e o pior
-- caso de erro é alguém não conseguir editar um serviço. Nenhum risco de vazamento.
--
-- A LEITURA não muda. `services`, `service_lines`, `activity_types` e
-- `activity_type_employees` têm SELECT tenant-wide por decisão explícita do ADR-0023:
-- funcionário precisa ler o catálogo para apontar horas. Só a escrita exigia perfil, e é
-- só a escrita que troca de predicado.
--
-- Equivalência que sustenta "ninguém ganha nem perde acesso":
--   is_admin_or_manager(u,t)  ===  has_capability(u,t,'catalogo:editar')
-- porque o seed (20260902140000) concedeu `catalogo:editar` exatamente a Admin e Gerente,
-- que são os dois app_role que `is_admin_or_manager` aceita. O relatório de paridade
-- confirma antes e depois.
--
-- A partir daqui o toggle é REAL para este grupo: ligar `catalogo:editar` para o papel RH
-- na tela de perfis passa a permitir que RH edite catálogo de fato, pela API inclusive.
--
-- Rollback: supabase/rollback/20260902200000_switch_catalog_to_capability.down.sql
-- (não é migration — o CLI não aplica aquele diretório).
--
-- Ordem dentro de cada tabela: a policy nova é criada e a antiga é substituída no mesmo
-- DROP/CREATE dentro da transação da migration, então em nenhum instante a tabela fica
-- sem predicado (Cenário 5 da PUL-209).

-- 1. services -------------------------------------------------------------------
DROP POLICY IF EXISTS services_insert ON public.services;
CREATE POLICY services_insert ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS services_update ON public.services;
CREATE POLICY services_update ON public.services FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS services_delete ON public.services;
CREATE POLICY services_delete ON public.services FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

-- 2. service_lines --------------------------------------------------------------
DROP POLICY IF EXISTS service_lines_insert ON public.service_lines;
CREATE POLICY service_lines_insert ON public.service_lines FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS service_lines_update ON public.service_lines;
CREATE POLICY service_lines_update ON public.service_lines FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS service_lines_delete ON public.service_lines;
CREATE POLICY service_lines_delete ON public.service_lines FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

-- 3. activity_types -------------------------------------------------------------
--
-- Tipos de atividade entram no mesmo grupo: o ADR-0023 os trata junto de services e
-- service_lines — SELECT tenant-wide, escrita por perfil — e a matriz os cobre pela mesma
-- capacidade de catálogo.
DROP POLICY IF EXISTS activity_types_insert ON public.activity_types;
CREATE POLICY activity_types_insert ON public.activity_types FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS activity_types_update ON public.activity_types;
CREATE POLICY activity_types_update ON public.activity_types FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS activity_types_delete ON public.activity_types;
CREATE POLICY activity_types_delete ON public.activity_types FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

-- 4. activity_type_employees ----------------------------------------------------
--
-- O tenant vem do pai (activity_types), então o predicado fica dentro do EXISTS — igual
-- ao original, trocando apenas a função.
DROP POLICY IF EXISTS activity_type_employees_insert ON public.activity_type_employees;
CREATE POLICY activity_type_employees_insert ON public.activity_type_employees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activity_types at
      WHERE at.id = activity_type_employees.activity_type_id
        AND public.has_capability(auth.uid(), at.tenant_id, 'catalogo:editar')
    )
  );

DROP POLICY IF EXISTS activity_type_employees_delete ON public.activity_type_employees;
CREATE POLICY activity_type_employees_delete ON public.activity_type_employees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_types at
      WHERE at.id = activity_type_employees.activity_type_id
        AND public.has_capability(auth.uid(), at.tenant_id, 'catalogo:editar')
    )
  );

COMMENT ON FUNCTION public.has_capability(uuid, uuid, text) IS
  'Resolve capacidade efetiva: override da pessoa tem precedencia sobre o papel; ausencia '
  'nega. Predicado canonico da onda de capacidades. EM USO desde PUL-201 grupo 1 '
  '(escrita de catalogo). Ver .harness/capability-matrix.md.';
