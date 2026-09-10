-- PUL-256 — a guarda de "último admin" impedia o autocadastro de criar qualquer empresa.
--
-- SINTOMA: toda tentativa em /register respondia "Erro ao criar empresa. Tente novamente.",
-- com este log na Edge Function:
--
--   register-tenant: erro ao criar tenant: A operacao deixaria este tenant sem ninguem
--   capaz de gerir perfis (pessoa:editar-papel).
--
-- CAUSA: `assert_tenant_keeps_profile_admin` (PUL-204) é CONSTRAINT TRIGGER DEFERRABLE
-- INITIALLY DEFERRED, avaliado no COMMIT. Isso foi escolhido justamente para o seed poder
-- passar por estados intermediários — e funciona quando tudo acontece numa transação só.
--
-- Mas `register-tenant` fala com o PostgREST, e cada passo é uma requisição HTTP, logo uma
-- transação que comita sozinha:
--
--   1. INSERT em `tenants`  ->  o trigger AFTER INSERT semeia `tenant_roles` e
--      `role_capabilities`  ->  COMMIT. A guarda avalia AQUI e procura alguém em
--      `user_tenant_roles` com a capacidade. Não há: o tenant acabou de nascer.
--   2. cria usuário no Auth      (requisição seguinte)
--   3. cria o funcionário        (requisição seguinte)
--   4. INSERT em `user_tenant_roles` com o papel Admin  <- só aqui a pessoa aparece
--
-- O passo 1 nunca chegava ao passo 4. Nenhuma empresa foi criada por autocadastro desde
-- 02/09, quando a guarda entrou; o último tenant da base é de março, feito pelo seed de
-- demonstração.
--
-- Por que não foi pego antes: provar migration em transação desfeita é o padrão da casa, e
-- um trigger DEFERRED nunca é avaliado num ROLLBACK. O defeito é invisível a esse tipo de
-- prova — só aparece com COMMIT de verdade.
--
-- DECISÃO: tenant sem NENHUMA pessoa vinculada não tem invariante a preservar.
--
-- A guarda existe para ninguém ficar trancado fora da própria administração. Sem ninguém
-- dentro, não há quem trancar: o tenant está em provisionamento (o caso do autocadastro) ou
-- foi desativado. É a mesma família da saída que já existe para tenant inexistente, logo
-- acima, quando o papel é apagado em cascata.
--
-- O que a guarda continua barrando, e é o que ela foi escrita para barrar:
--   - remover `pessoa:editar-papel` do último papel que a concede;
--   - apagar ou renomear esse papel;
--   - rebaixar a última pessoa que a tem;
--   - revogar a capacidade da última pessoa por exceção individual.
--
-- O que passa a ser permitido: remover a ÚLTIMA pessoa de um tenant, deixando-o sem
-- ninguém. Antes era barrado por efeito colateral desta guarda. É consequência aceita: um
-- tenant sem usuário nenhum não está trancado, está vazio, e o produto não tem tela que
-- faça isso — quem o fizer é service role, por script, deliberadamente.

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

  -- Tenant sem NENHUMA pessoa vinculada também não tem: está nascendo ou está vazio.
  -- É esta linha que destrava o autocadastro (PUL-256).
  IF NOT EXISTS (SELECT 1 FROM public.user_tenant_roles WHERE tenant_id = _tenant) THEN
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
  'Invariante do ADR-0027: todo tenant COM pessoas mantem ao menos uma com '
  'pessoa:editar-papel efetiva (papel mais override). Avaliada no COMMIT. Tenant sem pessoa '
  'vinculada e ignorado: esta nascendo (autocadastro) ou esta vazio (PUL-256).';
