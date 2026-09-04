-- PUL-206, passo 4 — o mecanismo antigo sai. DECISÃO DE 04/09: aposentar já.
--
-- Estado que permite este passo, cada item provado nas migrations anteriores:
--   - nenhuma policy decide por papel (20260904240000);
--   - nenhuma função de banco lê `user_roles` para decidir (20260904250000);
--   - nenhuma Edge Function e nenhuma tela leem ou escrevem `user_roles` (mesmo PR);
--   - cliente novo nasce com perfil (20260904260000), então o espelhamento deixa de ser
--     necessário para o caminho de criação.
--
-- O QUE SAI: a tabela `user_roles`, o tipo `app_role`, as funções `has_role` e
-- `is_admin_or_manager`, e o espelhamento que mantinha o perfil derivado do papel.
--
-- O QUE FICA, e é decisão explícita: as colunas `employees.system_role` e
-- `employees.is_gerente`. Elas deixaram de ser fonte concorrente na PUL-203 — hoje são
-- PROJEÇÃO derivada por trigger, como `isAdmin` no front, e cerca de quarenta arquivos as
-- leem para exibir. Remover é limpeza cosmética com superfície de regressão grande e valor
-- de segurança zero, porque ninguém decide acesso por elas. Fica registrado em TD-0012 como
-- limpeza, não como risco.
--
-- Ponto sem volta barata: remover valor de enum no Postgres não é trivial, e é por isso que
-- este passo vem por último, depois de todos os consumidores terem saído.

-- 1. O espelhamento perde a função: o perfil passou a ser escrito diretamente -------
--
-- Ele existia para manter `user_tenant_roles` derivado de `user_roles` durante a
-- convivência. Sem a tabela de origem, não há o que espelhar. A sincronia do papel de
-- EXIBIÇÃO continua, mas passa a disparar na mudança de PERFIL, que é a nova fonte.
DROP TRIGGER IF EXISTS trg_user_roles_mirror ON public.user_roles;
DROP TRIGGER IF EXISTS trg_sync_employee_display_role ON public.user_roles;
DROP FUNCTION IF EXISTS public.mirror_user_roles_to_tenant_role();
DROP FUNCTION IF EXISTS public.tenant_role_for_app_roles(uuid, uuid);

CREATE OR REPLACE FUNCTION public.sync_employee_display_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id   uuid;
  _tenant_id uuid;
  _derivado  text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _user_id := OLD.user_id;
    _tenant_id := OLD.tenant_id;
  ELSE
    _user_id := NEW.user_id;
    _tenant_id := NEW.tenant_id;
  END IF;

  _derivado := public.system_role_for_user(_user_id, _tenant_id);

  UPDATE public.employees e
     SET system_role = _derivado,
         is_gerente  = (_derivado IN ('admin', 'manager'))
   WHERE e.auth_id = _user_id
     AND e.tenant_id = _tenant_id
     AND (e.system_role IS DISTINCT FROM _derivado
       OR e.is_gerente IS DISTINCT FROM (_derivado IN ('admin', 'manager')));

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_employee_display_role
AFTER INSERT OR UPDATE OR DELETE ON public.user_tenant_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_employee_display_role();

-- Mudar a matriz do perfil também muda o papel de exibição de todo mundo que o tem.
CREATE OR REPLACE FUNCTION public.sync_display_role_for_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_id uuid;
BEGIN
  _role_id := coalesce(NEW.role_id, OLD.role_id);

  UPDATE public.employees e
     SET system_role = public.system_role_for_user(e.auth_id, e.tenant_id),
         is_gerente  = (public.system_role_for_user(e.auth_id, e.tenant_id) IN ('admin', 'manager'))
   WHERE e.auth_id IN (SELECT utr.user_id FROM public.user_tenant_roles utr WHERE utr.role_id = _role_id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_display_role_for_role ON public.role_capabilities;
CREATE TRIGGER trg_sync_display_role_for_role
AFTER INSERT OR UPDATE OR DELETE ON public.role_capabilities
FOR EACH ROW EXECUTE FUNCTION public.sync_display_role_for_role();

-- 2. Reconciliação final antes de derrubar a origem --------------------------------
UPDATE public.employees e
   SET system_role = public.system_role_for_user(e.auth_id, e.tenant_id),
       is_gerente  = (public.system_role_for_user(e.auth_id, e.tenant_id) IN ('admin', 'manager'))
 WHERE e.auth_id IS NOT NULL;

-- 3. O mecanismo sai ---------------------------------------------------------------
DROP TABLE IF EXISTS public.user_roles;
DROP FUNCTION IF EXISTS public.has_role(uuid, uuid, app_role);
DROP FUNCTION IF EXISTS public.is_admin_or_manager(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_manager_in_tenant(uuid, uuid);
DROP TYPE IF EXISTS public.app_role;
