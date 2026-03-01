

# Reverter politicas RLS da tabela employees e restaurar acesso

## Problema

A migration anterior criou uma politica "Managers can view employees in tenant" que faz `SELECT 1 FROM public.employees e2 ...` -- referenciando a propria tabela. Isso causa recursao infinita e bloqueia qualquer leitura da tabela `employees`, quebrando login, dashboard e todo o sistema.

## Solucao

### 1. Migration SQL -- Corrigir politicas RLS

Dropar as duas politicas criadas na migration anterior e restaurar a politica original que funcionava:

```text
-- Remover as politicas problematicas
DROP POLICY IF EXISTS "Admins can view all employees in tenant" ON public.employees;
DROP POLICY IF EXISTS "Managers can view employees in tenant" ON public.employees;

-- Criar funcao SECURITY DEFINER para checar is_gerente sem recursao
CREATE OR REPLACE FUNCTION public.is_manager_in_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_id = _user_id
      AND tenant_id = _tenant_id
      AND is_gerente = true
  )
$$;

-- Restaurar politica que permite admins E gerentes verem todos os funcionarios
CREATE POLICY "Admins and managers can view all employees in tenant"
ON public.employees
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), tenant_id, 'admin')
  OR is_manager_in_tenant(auth.uid(), tenant_id)
);
```

Isso restaura o comportamento original: admins e gerentes de projeto veem todos os funcionarios do tenant. A funcao `is_manager_in_tenant` usa `SECURITY DEFINER` para consultar a tabela `employees` sem passar por RLS, evitando a recursao.

### 2. Reverter rota /employees no frontend

No `src/App.tsx`, reverter `requireAdmin` para `requireManager` na rota `/employees`, restaurando o acesso de gerentes a interface de RH.

### Resultado esperado

- Login volta a funcionar
- Dashboard exibe dados normalmente
- Admins e gerentes de projeto veem todos os modulos (comercial, gestao de projetos, RH)
- Usuarios comuns veem apenas seu proprio registro

