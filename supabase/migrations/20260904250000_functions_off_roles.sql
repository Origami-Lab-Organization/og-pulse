-- PUL-206, passo 2 — as funções param de ler papel.
--
-- Com nenhuma policy dependendo de `has_role` (20260904240000), sobraram quatro funções
-- lendo `user_roles`. Enquanto elas existirem, a tabela antiga é fonte de decisão e não dá
-- para removê-la. Cada uma passa a usar a capacidade cujo conjunto de papéis é idêntico ao
-- predicado que substitui — mecanismo, não política.

-- 1. Papel de EXIBIÇÃO ------------------------------------------------------------
--
-- Derivava de `user_roles` com precedência admin > manager > user (PUL-203). Passa a derivar
-- de capacidade: `pessoa:editar-papel` é só-admin e `projeto:editar` é Admin + Gerente,
-- então a precedência e o resultado são os mesmos — inclusive `rh`, que caía em 'user'
-- porque a coluna legada não sabe representá-lo.
CREATE OR REPLACE FUNCTION public.system_role_for_user(_user_id uuid, _tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
           WHEN public.has_capability(_user_id, _tenant_id, 'pessoa:editar-papel') THEN 'admin'
           WHEN public.has_capability(_user_id, _tenant_id, 'projeto:editar')      THEN 'manager'
           ELSE 'user'
         END
$$;

-- 2. Guarda de auto-escalada ------------------------------------------------------
--
-- O primeiro EXISTS liberava a operação para quem é admin ou manager do tenant.
-- `pessoa:editar` é exatamente Admin + Gerente.
CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_capability(auth.uid(), OLD.tenant_id, 'pessoa:editar') THEN
    RETURN NEW;
  END IF;

  -- `system_role` e `is_gerente` seguem fora desta lista: são derivados e sobrescritos por
  -- `enforce_employee_display_role` (PUL-203).
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

-- 3. Elegibilidade de alocação ----------------------------------------------------
--
-- A capacidade `pessoa:editar-elegibilidade-alocacao` já existia no vocabulário e é
-- literalmente esta regra (ADR-0010), só-admin como o predicado que substitui.
CREATE OR REPLACE FUNCTION public.enforce_aloca_em_projetos_admin_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.aloca_em_projetos IS DISTINCT FROM OLD.aloca_em_projetos
     AND NOT public.has_capability(auth.uid(), OLD.tenant_id, 'pessoa:editar-elegibilidade-alocacao')
  THEN
    RAISE EXCEPTION 'Permission denied: only admin can modify aloca_em_projetos';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Quem são os administradores do tenant ----------------------------------------
--
-- Usada por notificação administrativa. `pessoa:editar-papel` é o marcador de só-admin.
CREATE OR REPLACE FUNCTION public.get_tenant_admin_employee_ids()
RETURNS TABLE(employee_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.id
  FROM public.employees e
  WHERE e.tenant_id = public.get_user_tenant_id(auth.uid())
    AND e.auth_id IS NOT NULL
    AND public.has_capability(e.auth_id, e.tenant_id, 'pessoa:editar-papel');
$function$;
