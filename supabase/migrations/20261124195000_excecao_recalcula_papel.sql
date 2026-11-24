-- Exceção individual também recalcula o papel de exibição.
--
-- `employees.system_role` (e `is_gerente`) é projeção da capacidade efetiva, calculada por
-- `system_role_for_user`: `pessoa:editar-papel` → admin, `projeto:editar` → manager
-- (20260904250000). A capacidade efetiva tem duas fontes, e `has_capability` lê as duas:
-- a exceção da pessoa (`user_capability_overrides`), que tem precedência, e o perfil.
--
-- Os gatilhos de 20260904280000 recalculam a projeção quando muda o perfil da pessoa
-- (`user_tenant_roles`) ou a matriz do perfil (`role_capabilities`), mas não quando muda a
-- exceção. Resultado: quem ganha `projeto:editar` por exceção não aparece em "Gerente do
-- Projeto", e quem perde continua aparecendo, até a próxima troca de perfil.
--
-- A função `sync_employee_display_role` já recebe a linha com `user_id` e `tenant_id`, que
-- `user_capability_overrides` também tem, então serve como está: só falta o gatilho.

DROP TRIGGER IF EXISTS trg_sync_display_role_for_override ON public.user_capability_overrides;
CREATE TRIGGER trg_sync_display_role_for_override
AFTER INSERT OR UPDATE OR DELETE ON public.user_capability_overrides
FOR EACH ROW EXECUTE FUNCTION public.sync_employee_display_role();

-- Reconciliação: quem já tem exceção pode estar com a projeção desatualizada.
UPDATE public.employees e
   SET system_role = public.system_role_for_user(e.auth_id, e.tenant_id),
       is_gerente  = (public.system_role_for_user(e.auth_id, e.tenant_id) IN ('admin', 'manager'))
 WHERE e.auth_id IN (SELECT o.user_id FROM public.user_capability_overrides o WHERE o.tenant_id = e.tenant_id)
   AND e.system_role IS DISTINCT FROM public.system_role_for_user(e.auth_id, e.tenant_id);
