-- Stakeholder passa a pertencer ao CLIENTE, e não só ao projeto.
--
-- O QUE ESTAVA ERRADO. `project_stakeholders.project_id` era NOT NULL: a pessoa só existia
-- dentro de um projeto. Mas stakeholder é gente da organização do cliente — o patrocinador
-- continua sendo o patrocinador quando o projeto acaba, e é o mesmo em todos os projetos
-- daquela conta. A prova de que o modelo incomodava já estava no código: existe um diálogo
-- inteiro ("Importar stakeholders") só para copiar as mesmas pessoas de um projeto do cliente
-- para outro. Copiar gente entre projetos do mesmo cliente é sintoma, não recurso.
--
-- A FORMA. `client_id` entra, `project_id` passa a aceitar NULL, e cada linha responde a uma
-- das duas perguntas:
--
--   project_id IS NULL  → a pessoa na CONTA. É o cadastro do cliente.
--   project_id NOT NULL → a mesma pessoa NAQUELE projeto, com a influência, o interesse e a
--                         ação que valem ali. Continua funcionando como sempre funcionou.
--
-- Influência e ação são por projeto de propósito: quem é promotor num projeto pode ser
-- detrator no seguinte, e achatar isso numa ficha só perderia a informação que o GP usa.
--
-- O NOME DA TABELA CONTINUA `project_stakeholders`, e passou a ser impreciso. Renomear
-- custaria mexer em policies, índices, views e nove arquivos de frontend, sem mudar
-- comportamento nenhum — fica registrado aqui, e este comentário é o aviso para quem chegar.

-- 1. A coluna, e a liberação do projeto -------------------------------------------------
ALTER TABLE public.project_stakeholders
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.project_stakeholders
  ALTER COLUMN project_id DROP NOT NULL;

-- 2. Quem veio de projeto herda o cliente do projeto ------------------------------------
--
-- Feito ANTES do CHECK: com linha órfã no meio, a restrição não entraria.
UPDATE public.project_stakeholders s
   SET client_id = p.client_id
  FROM public.projects p
 WHERE p.id = s.project_id
   AND s.client_id IS NULL
   AND p.client_id IS NOT NULL;

-- 3. Linha sem dono nenhum não pode existir ----------------------------------------------
--
-- NOT VALID: projeto sem cliente é possível no modelo atual (projeto interno), e a linha dele
-- ficaria com os dois nulos. Validar à força derrubaria a migration num dado que já está lá.
-- A restrição vale para tudo que entrar de agora em diante, que é o que interessa.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stakeholder_pertence_a_projeto_ou_cliente'
  ) THEN
    ALTER TABLE public.project_stakeholders
      ADD CONSTRAINT stakeholder_pertence_a_projeto_ou_cliente
      CHECK (project_id IS NOT NULL OR client_id IS NOT NULL) NOT VALID;
  END IF;
END $$;

-- 4. O cliente é CARIMBADO na escrita, não descoberto na leitura -------------------------
--
-- Mesma ideia do centro de custo na hora (ADR-0031): quem grava resolve, quem lê só lê. Sem
-- isto, a aba do cliente precisaria de um JOIN com projects a cada consulta, e stakeholder de
-- projeto ficaria invisível na conta se alguém esquecesse de preencher.
CREATE OR REPLACE FUNCTION public.set_stakeholder_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT p.client_id INTO NEW.client_id FROM public.projects p WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_stakeholder_client() IS
  'Carimba o cliente do projeto no stakeholder. Linha de conta (project_id NULL) traz o cliente de quem gravou.';

DROP TRIGGER IF EXISTS set_stakeholder_client ON public.project_stakeholders;
CREATE TRIGGER set_stakeholder_client
BEFORE INSERT OR UPDATE OF project_id ON public.project_stakeholders
FOR EACH ROW EXECUTE FUNCTION public.set_stakeholder_client();

CREATE INDEX IF NOT EXISTS idx_project_stakeholders_client
  ON public.project_stakeholders (client_id);

COMMENT ON COLUMN public.project_stakeholders.client_id IS
  'A conta a que a pessoa pertence. Preenchido pelo trigger quando a linha é de projeto; informado direto quando é cadastro do cliente.';
COMMENT ON COLUMN public.project_stakeholders.project_id IS
  'NULL = cadastro do cliente. Preenchido = a mesma pessoa naquele projeto, com influência e ação próprias.';

-- 5. RLS: cada policy ganha o ramo da conta ---------------------------------------------
--
-- As policies antigas exigiam um projeto, então linha de conta seria negada por TODAS elas —
-- inclusive a de leitura, e a aba nasceria vazia sem erro nenhum. Quem edita cadastro de
-- cliente é quem tem `cliente:editar`; quem lê é quem pertence ao tenant, igual ao ramo de
-- projeto. Sem GRANT extra: a tabela já é lida por `authenticated` pelas policies existentes.
DROP POLICY IF EXISTS "Users can view project stakeholders in their tenant" ON public.project_stakeholders;
CREATE POLICY "Users can view project stakeholders in their tenant"
ON public.project_stakeholders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
     WHERE p.id = project_stakeholders.project_id
       AND public.user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.clients c
     WHERE c.id = project_stakeholders.client_id
       AND public.user_belongs_to_tenant(auth.uid(), c.tenant_id)
  )
);

DROP POLICY IF EXISTS "Admins and managers can insert project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can insert project stakeholders"
ON public.project_stakeholders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
     WHERE p.id = project_stakeholders.project_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
       AND public.can_manage_project(auth.uid(), p.id)
  )
  OR (
    project_stakeholders.project_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar')
    )
  )
);

DROP POLICY IF EXISTS "Admins and managers can update project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can update project stakeholders"
ON public.project_stakeholders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
     WHERE p.id = project_stakeholders.project_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
       AND public.can_manage_project(auth.uid(), p.id)
  )
  OR (
    project_stakeholders.project_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar')
    )
  )
);

DROP POLICY IF EXISTS "Admins and managers can delete project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can delete project stakeholders"
ON public.project_stakeholders FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
     WHERE p.id = project_stakeholders.project_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
       AND public.can_manage_project(auth.uid(), p.id)
  )
  OR (
    project_stakeholders.project_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar')
    )
  )
);
