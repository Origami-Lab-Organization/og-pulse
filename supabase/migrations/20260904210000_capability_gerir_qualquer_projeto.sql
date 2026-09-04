-- PUL-201 / TD-0018 — pré-requisito do escopo por projeto, e um passo da aposentadoria.
--
-- `can_manage_project` decide "sou eu quem gerencia este projeto?" e hoje responde
-- verdadeiro por dois caminhos: `has_role(admin)` ou ser o gerente responsável. O primeiro
-- é o mecanismo antigo, dentro de uma função que 20 policies vão passar a usar — então
-- trocá-lo é condição para aposentar `has_role` (decisão de 04/09) e para o escopo de PM
-- não depender de papel.
--
-- A capacidade nova diz o que o termo antigo queria dizer: gerir QUALQUER projeto, não só
-- os que a pessoa gerencia. Seed derivado de quem tem `pessoa:editar-papel`, que é o
-- marcador de só-admin no modelo — o mesmo critério do grupo 5, e por isso a paridade da
-- função é exata.

INSERT INTO public.capabilities (key, domain, label, is_sensitive, description) VALUES
  ('projeto:gerir-qualquer', 'projeto',
   'Gerir qualquer projeto, não só os que gerencia', false,
   'Alcança projeto de que a pessoa não é o gerente responsável, para editar equipe, marcos, OKRs e o próprio projeto. Quem tem projeto:editar sem esta capacidade edita apenas os projetos que gerencia.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, 'projeto:gerir-qualquer', true
FROM public.role_capabilities rc
WHERE rc.capability = 'pessoa:editar-papel' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

-- Acumulação, pela mesma razão do grupo 5: quem tem duas fontes de papel recebeu o papel de
-- maior precedência e as capacidades da outra como exceção. Sem este bloco, quem alcança
-- `pessoa:editar-papel` por exceção perderia o alcance de projeto.
INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, 'projeto:gerir-qualquer', true,
       'espelhamento de user_roles (PUL-209)'
FROM public.user_capability_overrides o
WHERE o.capability = 'pessoa:editar-papel' AND o.enabled
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

-- A função passa a compor capacidade e relação, sem papel no meio.
CREATE OR REPLACE FUNCTION public.can_manage_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    LEFT JOIN public.employees manager
      ON manager.id = p.manager_id
      AND manager.tenant_id = p.tenant_id
    WHERE p.id = _project_id
      AND (
        public.has_capability(_user_id, p.tenant_id, 'projeto:gerir-qualquer')
        OR manager.auth_id = _user_id
      )
  );
$function$;

COMMENT ON FUNCTION public.can_manage_project(uuid, uuid) IS
  'Relacao com o projeto: quem gere qualquer projeto (capacidade), ou o gerente responsavel. '
  'Substituiu has_role(admin) na PUL-201 — escopo e relacao, nunca papel.';

-- Tradução conta → funcionário, para a policy não depender de privilégio de leitura.
--
-- O INSERT de `projects` precisa saber se o `manager_id` gravado é a própria pessoa, e isso
-- exige cruzar `auth.uid()` com `employees`. Escrito como subconsulta na policy, o predicado
-- passaria a depender de o papel que consulta ter SELECT em `employees` — em produção tem,
-- mas policy que depende de GRANT é policy que quebra em ambiente novo, e foi exatamente
-- assim que o harness devolveu "negado" para um caso que deveria passar.
CREATE OR REPLACE FUNCTION public.employee_id_for(_user_id uuid, _tenant_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id FROM public.employees e
  WHERE e.auth_id = _user_id AND e.tenant_id = _tenant_id
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.employee_id_for(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.employee_id_for(uuid, uuid) IS
  'Funcionario da conta no tenant. Existe para predicado de policy nao depender de GRANT '
  'de leitura em employees (PUL-201).';
