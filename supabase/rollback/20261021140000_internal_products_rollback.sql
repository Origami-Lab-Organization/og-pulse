-- Reversão de 20261021140000_internal_products.sql.
--
-- Ordem importa: devolver o centro das horas e o cliente do Pulse ANTES de recolocar o NOT NULL,
-- senão o ALTER falha no Pulse sem cliente. O cliente do Pulse antes desta migration era
-- "Origami Lab LTDA" (09aeb9f1-3a30-41bd-b815-62367fa6831c, lido em produção em 21/10/2026).

-- 1. Horas voltam ao centro anterior, pelo rastro.
UPDATE public.project_timesheets t
   SET cost_center_id = c.from_cost_center_id
  FROM public.timesheet_cost_center_corrections c
 WHERE c.timesheet_id = t.id;

DROP TABLE IF EXISTS public.timesheet_cost_center_corrections;

-- 2. Pulse volta a projeto faturável com o cliente de antes.
UPDATE public.projects
   SET is_internal_product = false,
       is_billable = true,
       cost_center_id = NULL,
       client_id = '09aeb9f1-3a30-41bd-b815-62367fa6831c'
 WHERE id = '2f5fd745-3365-48e4-98b1-7dbaf3abfe5d';

DROP FUNCTION IF EXISTS public.internal_products_overview();

ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;
DELETE FROM public.user_capability_overrides WHERE capability = 'produto:ler';
DELETE FROM public.role_capabilities WHERE capability = 'produto:ler';
DELETE FROM public.default_role_capabilities WHERE capability = 'produto:ler';
DELETE FROM public.capabilities WHERE key = 'produto:ler';
ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

DROP INDEX IF EXISTS public.projects_internal_product_idx;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_internal_product_not_billable;
ALTER TABLE public.projects DROP COLUMN IF EXISTS is_internal_product;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_billable_needs_client;
-- Só depois que nenhum projeto estiver sem cliente:
ALTER TABLE public.projects ALTER COLUMN client_id SET NOT NULL;
