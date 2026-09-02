-- PUL-204 (ADR-0027) — invariante: nenhum tenant fica sem quem gere perfis.
--
-- Problema:
--   As policies de `tenant_roles`, `role_capabilities`, `user_tenant_roles` e
--   `user_capability_overrides` autorizam qualquer admin a escrever. Nada impede que ele
--   remova `pessoa:editar-papel` do último papel que a concede, apague esse papel, ou
--   rebaixe a última pessoa que o tem. O resultado é um tenant trancado fora da própria
--   administração, sem caminho de volta pela interface — e a recuperação exigiria acesso
--   direto ao banco.
--
--   A tela (PUL-204) vai barrar isso na interface, mas interface não é barreira: o cliente
--   fala direto com o Postgres via JWT, e uma chamada de API contorna qualquer guarda de
--   React. A invariante mora aqui.
--
-- Decisão:
--   CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED — avaliado no COMMIT, não a cada
--   linha. Isso é o que permite ao seed (e a qualquer operação em lote) passar por estados
--   intermediários inválidos: o que precisa valer é o estado final da transação. Um trigger
--   AFTER comum quebraria o próprio seed, que cria papéis antes de conceder capacidades.
--
--   A checagem usa `has_capability`, então respeita override: revogar a capacidade da
--   última pessoa por exceção individual é bloqueado do mesmo jeito que removê-la do papel.

CREATE OR REPLACE FUNCTION public.assert_tenant_keeps_profile_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
BEGIN
  -- O tenant afetado vem de OLD em DELETE e de NEW nas demais operações.
  --
  -- IF/ELSIF, e não CASE: `role_capabilities` não tem coluna `tenant_id` (o tenant vem via
  -- `tenant_roles`), e o CASE em PL/pgSQL resolve todos os ramos — referenciar
  -- `NEW.tenant_id` ali levanta `record "new" has no field "tenant_id"` mesmo quando o
  -- ramo não é o escolhido. O IF só executa o ramo tomado.
  IF TG_TABLE_NAME = 'role_capabilities' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT r.tenant_id INTO _tenant FROM public.tenant_roles r WHERE r.id = OLD.role_id;
    ELSE
      SELECT r.tenant_id INTO _tenant FROM public.tenant_roles r WHERE r.id = NEW.role_id;
    END IF;
  ELSE
    -- tenant_roles, user_tenant_roles e user_capability_overrides têm tenant_id direto.
    IF TG_OP = 'DELETE' THEN
      _tenant := OLD.tenant_id;
    ELSE
      _tenant := NEW.tenant_id;
    END IF;
  END IF;

  -- Papel apagado em cascata (tenant removido) não tem invariante a preservar.
  IF _tenant IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_tenant_roles utr
    WHERE utr.tenant_id = _tenant
      AND public.has_capability(utr.user_id, _tenant, 'pessoa:editar-papel')
  ) THEN
    RAISE EXCEPTION
      'A operacao deixaria este tenant sem ninguem capaz de gerir perfis (pessoa:editar-papel). '
      'Conceda a capacidade a outro papel ou pessoa antes de remover esta.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.assert_tenant_keeps_profile_admin() IS
  'Invariante do ADR-0027: todo tenant mantem ao menos uma pessoa com pessoa:editar-papel '
  'efetiva (papel mais override). Avaliada no COMMIT, para nao quebrar operacao em lote.';

-- As quatro tabelas por onde a capacidade administrativa pode desaparecer.
CREATE CONSTRAINT TRIGGER trg_role_capabilities_keeps_admin
AFTER INSERT OR UPDATE OR DELETE ON public.role_capabilities
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_keeps_profile_admin();

CREATE CONSTRAINT TRIGGER trg_tenant_roles_keeps_admin
AFTER UPDATE OR DELETE ON public.tenant_roles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_keeps_profile_admin();

CREATE CONSTRAINT TRIGGER trg_user_tenant_roles_keeps_admin
AFTER INSERT OR UPDATE OR DELETE ON public.user_tenant_roles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_keeps_profile_admin();

CREATE CONSTRAINT TRIGGER trg_user_capability_overrides_keeps_admin
AFTER INSERT OR UPDATE OR DELETE ON public.user_capability_overrides
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_keeps_profile_admin();
