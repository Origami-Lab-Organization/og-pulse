-- PUL-203, pré-requisito da 20260904170000 — e correção de um deploy que falhou.
--
-- O QUE ACONTECEU: a 20260904170000 (papel de exibição derivado) quebrou o build de
-- produção com "Permission denied: cannot modify system_role". A causa é o trigger
-- `prevent_employee_self_escalation`, que roda BEFORE UPDATE em `employees` e recusa
-- qualquer mudança em `system_role`, `is_gerente` e mais um punhado de colunas sensíveis
-- quando `auth.uid()` não pertence a admin ou manager do tenant. Numa migration não existe
-- `auth.uid()` — é nulo — então o primeiro EXISTS da função dá falso e a reconciliação
-- estoura na primeira linha que precisava corrigir.
--
-- Não apareceu no harness porque o stub reproduzia colunas e policies reais, mas não os
-- TRIGGERS reais da tabela. Regra que fica: stub de tabela com trigger de proteção tem de
-- carregar o trigger, senão a prova é sobre uma tabela que não existe.
--
-- POR QUE A CORREÇÃO É REMOVER AS DUAS CHECAGENS, E NÃO CONTORNAR O TRIGGER:
--   A partir da 20260904170000, `system_role` e `is_gerente` deixam de ser escolhíveis por
--   qualquer caminho — `enforce_employee_display_role` sobrescreve o que vier com o valor
--   derivado de `user_roles`. Proteger contra "modificar" uma coluna que ninguém consegue
--   modificar é proteção vazia, e aqui ela é pior que vazia: bloqueia a própria derivação.
--   Os triggers disparam em ordem alfabética, então `enforce_employee_display_role` roda
--   ANTES de `prevent_employee_self_escalation` e já entrega o valor derivado — a checagem
--   seguinte veria uma diferença legítima e a recusaria.
--
--   A escalada de privilégio que o trigger existe para impedir continua impedida, e por um
--   caminho mais forte: quem quer virar admin precisa alterar `user_roles`, cuja policy é
--   `has_role(admin) AND user_id <> auth.uid()` — ninguém muda o próprio papel, nem sendo
--   admin. Antes a barreira era "não mexa nesta coluna"; agora é "esta coluna é derivada, e
--   a fonte dela recusa auto-alteração".
--
-- O resto da função fica intacto: salário, encargos, benefícios, pró-labore, cargo, status,
-- tenant_id e auth_id continuam protegidos exatamente como estavam.

CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND tenant_id = OLD.tenant_id
    AND role IN ('admin', 'manager')
  ) THEN
    RETURN NEW;
  END IF;

  -- `system_role` e `is_gerente` saíram desta lista de propósito: são derivados de
  -- `user_roles` e sobrescritos por `enforce_employee_display_role` (PUL-203). Quem quer
  -- mudar papel muda `user_roles`, que recusa auto-alteração na policy.
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Permission denied: cannot modify tenant_id';
  END IF;
  IF NEW.salario_mensal IS DISTINCT FROM OLD.salario_mensal THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.salario_liquido IS DISTINCT FROM OLD.salario_liquido THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.encargos IS DISTINCT FROM OLD.encargos THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.beneficios IS DISTINCT FROM OLD.beneficios THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.pro_labore IS DISTINCT FROM OLD.pro_labore THEN
    RAISE EXCEPTION 'Permission denied: cannot modify salary fields';
  END IF;
  IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
    RAISE EXCEPTION 'Permission denied: cannot modify cargo';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Allow only the safe one-way activation transition for the first-login
    -- password-change flow. Every other self-initiated status change is blocked.
    IF NOT (OLD.status = 'aguardando_confirmacao' AND NEW.status = 'ativo') THEN
      RAISE EXCEPTION 'Permission denied: cannot modify status';
    END IF;
  END IF;
  IF NEW.auth_id IS DISTINCT FROM OLD.auth_id THEN
    RAISE EXCEPTION 'Permission denied: cannot modify auth_id';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.prevent_employee_self_escalation() IS
  'Impede que a pessoa altere os proprios campos sensiveis. system_role e is_gerente saem '
  'da lista na PUL-203: viraram derivados de user_roles, e a auto-promocao e barrada na '
  'policy de user_roles (has_role(admin) AND user_id <> auth.uid()).';
