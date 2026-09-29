-- Duas funções ficaram chamando `is_admin_or_manager` depois que ela foi removida.
--
-- O QUE QUEBROU. 20260904280000 (PUL-206) derrubou `is_admin_or_manager`. As funções
-- LANGUAGE sql não registram dependência do que chamam no corpo, então o DROP passou sem
-- reclamar — e estas duas passaram a falhar em runtime com "function does not exist":
--
--   can_read_project_hours    (20260817250000) — base de get_member_planned_hours,
--                             get_member_actual_hours e get_project_actual_hours.
--   can_view_project_document (20260811160000) — leitura de arquivo de projeto.
--
-- COMO APARECEU. Em /my-projects/:id o colaborador alocado via "Projeto não encontrado":
-- o hook do detalhe lança o erro das RPCs de horas e a tela trata qualquer erro como
-- ausência. Na lista, o mesmo erro era engolido e o card mostrava 0h consumidas mesmo com
-- horas lançadas. Afeta todo colaborador, em todo projeto, desde 04/09.
--
-- A TROCA. Mecanismo, não política — mesmo critério de 20260904250000: o predicado
-- "admin ou gerente do tenant" vira a capacidade cujo conjunto de papéis é idêntico.
-- `financeiro:ler` é Admin + Gerente e é a herdeira registrada de `is_admin_or_manager`
-- (capability-matrix, ADR-0022). Não usar `horas-projeto:ler` nem `arquivo-projeto:ler`
-- aqui: o Colaborador também as tem (escopo "alocado"), e o ramo de fora do projeto
-- passaria a liberar o tenant inteiro. O ramo do membro alocado não muda.

CREATE OR REPLACE FUNCTION public.can_read_project_hours(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND (
        public.has_capability(auth.uid(), p.tenant_id, 'financeiro:ler')
        OR EXISTS (
          SELECT 1
          FROM public.project_members pm
          JOIN public.employees e ON e.id = pm.employee_id
          WHERE pm.project_id = p.id
            AND e.auth_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_project_document(
  _user_id uuid,
  _project_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND public.user_belongs_to_tenant(_user_id, p.tenant_id)
      AND (
        public.has_capability(_user_id, p.tenant_id, 'financeiro:ler')
        OR public.is_project_team_member(_user_id, p.id)
      )
  );
$$;
