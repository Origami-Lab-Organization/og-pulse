-- Rollback de 20261124140000_aprovacao_do_planejamento.sql: remove os pedidos de aprovação do
-- planejamento e a capacidade planejamento:aprovar-abaixo-do-orcado.
-- Os pedidos gravados se perdem. Sem BEGIN/COMMIT próprio: rode com
-- `psql --single-transaction` (ai-review-checklist).

DROP TABLE IF EXISTS public.project_planning_approvals;
DROP FUNCTION IF EXISTS public.guard_project_planning_approval();

ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;
DELETE FROM public.user_capability_overrides WHERE capability = 'planejamento:aprovar-abaixo-do-orcado';
DELETE FROM public.role_capabilities WHERE capability = 'planejamento:aprovar-abaixo-do-orcado';
DELETE FROM public.default_role_capabilities WHERE capability = 'planejamento:aprovar-abaixo-do-orcado';
DELETE FROM public.capabilities WHERE key = 'planejamento:aprovar-abaixo-do-orcado';
ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;
