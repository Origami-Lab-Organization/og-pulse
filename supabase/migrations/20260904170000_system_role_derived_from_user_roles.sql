-- PUL-203 — `employees.system_role` deixa de ser segunda fonte de verdade.
--
-- O papel de uma pessoa estava gravado em dois lugares: `user_roles`, que a RLS checa, e
-- `employees.system_role`, cópia de exibição. A sincronia era feita por UMA função de
-- aplicação (`employeeService.updateEmployee`), e qualquer caminho que não passasse por
-- ela deixava os dois divergentes — a interface mostrando um papel e o banco aplicando
-- outro. É a classe de bug em que ninguém percebe até alguém dizer "a tela diz que sou
-- gerente mas não consigo abrir".
--
-- Já divergiu: em 2026-09-04, em produção, uma pessoa aparecia como `manager` na interface
-- enquanto `user_roles` lhe dava `admin`. Uma linha em 38 — pequena o suficiente para não
-- ter sido notada, grande o suficiente para ser exatamente o bug descrito.
--
-- ESCOLHA: coluna mantida pelo banco, não derivada por view.
--   A HU preferia derivar (view ou RPC), o que eliminaria a classe de bug em vez de
--   automatizar o remendo. Não foi possível sem quebrar consulta: `system_role` é usada
--   como FILTRO em `useJobApplications` (`.or('is_gerente.eq.true,system_role.eq.admin')`)
--   e sai no `select` de várias telas. Trocar por view exigiria reescrever esses acessos,
--   e a coluna morre de todo modo na fase de contração (PUL-206) — reescrever agora para
--   apagar depois é trabalho jogado fora. O que esta migration garante é o essencial: a
--   coluna passa a ser INESCAPÁVELMENTE derivada, por qualquer caminho.
--
-- HISTÓRICO: verificado que não há o que preservar. A HU alertava que o versionamento de
-- colaborador registra o papel vigente na época, e uma coluna derivada mostraria sempre o
-- atual. `employee_versions` NÃO tem coluna de papel nenhuma — o snapshot guarda só custo,
-- jornada e cargo. O papel nunca foi versionado, então não há histórico a proteger.
--
-- `is_gerente` entra de carona por ser a MESMA classe (a terceira fonte da divergência D3)
-- e por ser uma linha na mesma função. Hoje está coerente em produção (10 de 10), e o que
-- a manutenção evita é a divergência futura que o trigger de candidatura sofre: ele
-- notifica por `is_gerente = true OR system_role = 'admin'`, então um `manager` com
-- `is_gerente = false` não seria notificado. Some na contração (PUL-206) junto da coluna.

-- 1. A derivação, num lugar só ------------------------------------------------------
--
-- Precedência admin > manager > resto, que é a que a interface já exibia. `rh` cai em
-- 'user' porque `employees_system_role_check` só aceita admin/manager/user — limitação
-- do legado, não decisão nova (é parte da divergência D4, e morre na contração).
CREATE OR REPLACE FUNCTION public.system_role_for_user(_user_id uuid, _tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
           WHEN bool_or(ur.role = 'admin'::app_role)   THEN 'admin'
           WHEN bool_or(ur.role = 'manager'::app_role) THEN 'manager'
           ELSE 'user'
         END
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
    AND ur.tenant_id = _tenant_id
$$;

COMMENT ON FUNCTION public.system_role_for_user(uuid, uuid) IS
  'Papel de EXIBICAO derivado de user_roles (PUL-203). Precedencia admin > manager > user. '
  'Sem papel nenhum, ou sem conta, resulta user. Nao e barreira de acesso: quem decide '
  'acesso e has_capability (ADR-0027).';

-- 2. Mudança em user_roles reflete na exibição --------------------------------------
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
  -- CASE sobre TG_OP resolveria todos os ramos e estouraria em DELETE, onde NEW não
  -- existe. IF/ELSIF avalia só o ramo certo (lição da 20260902190000).
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

DROP TRIGGER IF EXISTS trg_sync_employee_display_role ON public.user_roles;
CREATE TRIGGER trg_sync_employee_display_role
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_employee_display_role();

-- 3. Nenhum caminho grava a exibição por conta própria ------------------------------
--
-- É este trigger que responde ao Cenário 1 da HU ("alteração por qualquer via — aplicação,
-- script, ajuste direto no banco — mantém a coerência"). Sem ele, o passo 2 cobre só a
-- mudança que entra por `user_roles`, e continuaria possível gravar `system_role` na mão.
CREATE OR REPLACE FUNCTION public.enforce_employee_display_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _derivado text;
BEGIN
  -- Sem conta não há papel a derivar, e o CHECK exige um valor: 'user' é o que a base já
  -- tem nesses 7 registros hoje.
  IF NEW.auth_id IS NULL THEN
    NEW.system_role := 'user';
    NEW.is_gerente  := false;
    RETURN NEW;
  END IF;

  _derivado := public.system_role_for_user(NEW.auth_id, NEW.tenant_id);
  NEW.system_role := _derivado;
  NEW.is_gerente  := (_derivado IN ('admin', 'manager'));
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_employee_display_role() IS
  'Forca employees.system_role/is_gerente ao valor derivado de user_roles (PUL-203). '
  'Escrita direta nessas colunas e silenciosamente ignorada — por desenho: quem quer mudar '
  'papel muda user_roles, que e o que a RLS le.';

DROP TRIGGER IF EXISTS trg_enforce_employee_display_role ON public.employees;
CREATE TRIGGER trg_enforce_employee_display_role
BEFORE INSERT OR UPDATE OF system_role, is_gerente, auth_id ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.enforce_employee_display_role();

-- 4. Reconciliação do que já divergiu ----------------------------------------------
--
-- `user_roles` é a referência, como a HU determina. Só toca quem de fato diverge.
--
-- Quem não tem conta entra aqui também, e por um motivo concreto: o harness mostrou que um
-- funcionário sem `auth_id` podia estar gravado como `admin`, e nenhum dos dois triggers
-- passaria por ele — o de `user_roles` não tem linha para disparar, e o de `employees` só
-- dispara em escrita. Cadastro sem conta exibindo "admin" é a mesma mentira que esta
-- história remove, então normaliza para 'user'.
WITH derivado AS (
  SELECT e.id,
         CASE WHEN e.auth_id IS NULL
              THEN 'user'
              ELSE public.system_role_for_user(e.auth_id, e.tenant_id)
         END AS papel
  FROM public.employees e
)
UPDATE public.employees e
   SET system_role = d.papel,
       is_gerente  = (d.papel IN ('admin', 'manager'))
  FROM derivado d
 WHERE d.id = e.id
   AND (e.system_role IS DISTINCT FROM d.papel
     OR e.is_gerente IS DISTINCT FROM (d.papel IN ('admin', 'manager')));
