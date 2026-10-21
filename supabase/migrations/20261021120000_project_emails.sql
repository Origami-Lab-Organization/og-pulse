-- E-mails salvos no projeto — registro de decisões (21/10/2026).
--
-- Pedido do Italo: marcar um e-mail na aba E-mails e salvá-lo no projeto, para registrar as
-- decisões tomadas por e-mail. Decisões e alternativas recusadas: ADR-0047.
--
-- Pontos que não são detalhe de implementação:
--   * o e-mail é COPIADO para cá. O id da mensagem no Graph é por caixa de correio (mesmo
--     problema do iCalUId no ADR-0011): guardar só a referência faria o registro existir
--     apenas para quem salvou. A identidade entre caixas é o `internetMessageId`
--     (Message-ID do RFC 5322), e é por ele que o mesmo e-mail não entra duas vezes;
--   * a cópia é registro: depois de salva, só o resumo muda (trigger abaixo);
--   * anexos vão para a pasta do projeto no OneDrive (ADR-0019) — aqui fica só o índice
--     deles (nome, tamanho, link). Quem abre o arquivo é decidido pelo OneDrive;
--   * escrita é por relação com o projeto (GP, quem gere qualquer projeto, ou membro
--     alocado), composta com capacidade (ADR-0027, item 7).
--
-- Matriz: .harness/capability-matrix.md, seção "5. Projeto, portfolio e alocacao".
-- Rollback: supabase/rollback/20261021120000_project_emails_rollback.sql

-- ── 1. Capacidades ───────────────────────────────────────────────────────────────────────

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('email-projeto:ler', 'projeto', 'Ver e-mails do projeto',
   'E-mails que a equipe salvou no projeto como registro de decisão: cópia do conteúdo, '
   'resumo e anexos copiados para o OneDrive. Colaborador vê apenas os projetos onde está '
   'alocado.',
   false),
  ('email-projeto:salvar', 'projeto', 'Salvar e-mail no projeto',
   'Salva um e-mail da própria caixa no projeto, com resumo opcional, e copia os anexos para '
   'a pasta do projeto no OneDrive. Vale para os projetos que a pessoa gerencia ou onde está '
   'alocada.',
   false)
ON CONFLICT (key) DO NOTHING;

-- As duas nascem com quem já vê os arquivos do projeto (`arquivo-projeto:ler`: Admin, Gerente
-- e Colaborador, este no escopo alocado) — e-mail salvo é documento do projeto como os outros.
-- Mudar quem tem depois é toggle de perfil, não migration nova.
--
-- Guarda do último admin desligada só neste trecho, pelo mesmo motivo de 20261001120000:
-- acrescentar capacidade não tira `pessoa:editar-papel` de ninguém, e a guarda pararia o
-- deploy nos tenants com teste encerrado.
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, e.nova, true
FROM public.role_capabilities rc
JOIN (VALUES
  ('email-projeto:ler',    'arquivo-projeto:ler'),
  ('email-projeto:salvar', 'arquivo-projeto:ler')
) AS e(nova, origem) ON e.origem = rc.capability
WHERE rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, e.nova
FROM public.default_role_capabilities drc
JOIN (VALUES
  ('email-projeto:ler',    'arquivo-projeto:ler'),
  ('email-projeto:salvar', 'arquivo-projeto:ler')
) AS e(nova, origem) ON e.origem = drc.capability
ON CONFLICT (role_name, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, e.nova, o.enabled,
       'espelhamento de ' || e.origem || ' (e-mails do projeto, 21/10/2026)'
FROM public.user_capability_overrides o
JOIN (VALUES
  ('email-projeto:ler',    'arquivo-projeto:ler'),
  ('email-projeto:salvar', 'arquivo-projeto:ler')
) AS e(nova, origem) ON e.origem = o.capability
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

-- ── 2. Tabela ────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.project_emails (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id          uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Identidade da mensagem entre caixas de correio. Nunca o `id` do Graph.
  internet_message_id text        NOT NULL,

  subject             text        NOT NULL,
  from_name           text,
  from_address        text,
  -- Como o Pulse exibe: nome, ou o endereço quando o remetente não manda nome.
  to_recipients       text[]      NOT NULL DEFAULT '{}',
  cc_recipients       text[]      NOT NULL DEFAULT '{}',
  received_at         timestamptz NOT NULL,
  body                text        NOT NULL DEFAULT '',
  body_is_html        boolean     NOT NULL DEFAULT false,

  -- "O que foi decidido", nas palavras de quem salvou. Opcional por decisão do negócio.
  summary             text,
  -- Índice dos anexos copiados para o OneDrive:
  -- [{ name, size, contentType, driveId, itemId, webUrl }].
  attachments         jsonb       NOT NULL DEFAULT '[]'::jsonb,

  saved_by            uuid        NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Salvar de novo no mesmo projeto é idempotência, não erro: a tela mostra onde já está.
  -- O mesmo e-mail PODE estar em dois projetos — decisão que afeta os dois.
  CONSTRAINT project_emails_unique_message UNIQUE (project_id, internet_message_id),
  CONSTRAINT project_emails_subject_valid CHECK (char_length(subject) <= 2000),
  -- Imagens embutidas viajam como data URI; acima disso a tela já tira as imagens antes
  -- de salvar (src/lib/projectEmail.ts).
  CONSTRAINT project_emails_body_size CHECK (char_length(body) <= 5000000),
  CONSTRAINT project_emails_summary_valid
    CHECK (summary IS NULL OR char_length(summary) <= 2000),
  CONSTRAINT project_emails_attachments_array CHECK (jsonb_typeof(attachments) = 'array')
);

CREATE INDEX project_emails_project_idx
  ON public.project_emails (project_id, received_at DESC);
-- "Onde este e-mail já está salvo" (caixa de entrada) busca só pelo Message-ID; o tenant
-- já vem recortado pela policy.
CREATE INDEX project_emails_message_idx
  ON public.project_emails (internet_message_id);

COMMENT ON TABLE public.project_emails IS
  'E-mails salvos no projeto como registro de decisão (21/10/2026). Cópia do conteúdo, '
  'identidade pelo internetMessageId — ver ADR-0047.';
COMMENT ON COLUMN public.project_emails.internet_message_id IS
  'Message-ID do RFC 5322, igual em todas as caixas. Nunca usar o id do Graph, que é por caixa.';
COMMENT ON COLUMN public.project_emails.attachments IS
  'Índice dos anexos copiados para a pasta do projeto no OneDrive. O acesso ao arquivo é do '
  'OneDrive (ADR-0019), não desta tabela.';

-- ── 3. Guarda: tenant herdado e cópia imutável ───────────────────────────────────────────

-- O tenant vem SEMPRE do projeto (ADR-0021). Depois de salva, a cópia é registro: só o
-- resumo muda. Corrigir conteúdo é remover e salvar de novo, o que deixa claro que mudou.
CREATE OR REPLACE FUNCTION public.project_emails_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT p.tenant_id INTO NEW.tenant_id FROM public.projects p WHERE p.id = NEW.project_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Projeto não encontrado.' USING ERRCODE = 'PU001';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.tenant_id, NEW.project_id, NEW.internet_message_id, NEW.subject, NEW.from_name,
      NEW.from_address, NEW.to_recipients, NEW.cc_recipients, NEW.received_at, NEW.body,
      NEW.body_is_html, NEW.attachments, NEW.saved_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.project_id, OLD.internet_message_id, OLD.subject, OLD.from_name,
      OLD.from_address, OLD.to_recipients, OLD.cc_recipients, OLD.received_at, OLD.body,
      OLD.body_is_html, OLD.attachments, OLD.saved_by, OLD.created_at) THEN
    RAISE EXCEPTION 'A cópia do e-mail não muda depois de salva; só o resumo.'
      USING ERRCODE = 'PU001';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.project_emails_guard() IS
  'Herda o tenant do projeto no INSERT e só deixa o resumo mudar no UPDATE. ERRCODE PU001.';

CREATE TRIGGER project_emails_guard
  BEFORE INSERT OR UPDATE ON public.project_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.project_emails_guard();

-- ── 4. Predicados ────────────────────────────────────────────────────────────────────────

-- Leitura em forma de CONJUNTO (ADR-0046): a policy compara `project_id IN (...)` e o
-- planner avalia a função uma vez por consulta, não uma vez por linha. Quem lê: tem a
-- capacidade E alcança o projeto — o portfólio inteiro (`portfolio:ler`, ADR-0002), quem
-- gere qualquer projeto, o gerente do projeto, ou quem está alocado nele.
--
-- O tenant vem do próprio usuário (`employees.auth_id = auth.uid()`), nunca de argumento
-- (ADR-0021). `p.manager_id = me.employee_id` é a metade "gerente responsável" de
-- `can_manage_project`, escrita em conjunto; a outra metade é `projeto:gerir-qualquer`.
CREATE OR REPLACE FUNCTION public.email_readable_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT e.id AS employee_id,
           e.tenant_id,
           public.has_capability(auth.uid(), e.tenant_id, 'portfolio:ler')
             OR public.has_capability(auth.uid(), e.tenant_id, 'projeto:gerir-qualquer') AS sees_all
    FROM public.employees e
    WHERE e.auth_id = auth.uid()
      AND public.has_capability(auth.uid(), e.tenant_id, 'email-projeto:ler')
  )
  SELECT p.id
  FROM me
  JOIN public.projects p ON p.tenant_id = me.tenant_id
  WHERE me.sees_all
     OR p.manager_id = me.employee_id
     OR public.is_project_team_member(auth.uid(), p.id);
$$;

-- Escrita: quem tem a capacidade E faz parte do projeto. Ver o portfólio não basta: salvar
-- e-mail em projeto alheio não é o mesmo que lê-lo. Escrita é uma linha por vez, então o
-- predicado por linha aqui não tem o custo que o ADR-0046 corrige na leitura.
CREATE OR REPLACE FUNCTION public.can_save_project_email(_user_id uuid, _project_id uuid)
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
      AND public.has_capability(_user_id, p.tenant_id, 'email-projeto:salvar')
      AND (
        public.can_manage_project(_user_id, p.id)
        OR public.is_project_team_member(_user_id, p.id)
      )
  );
$$;

COMMENT ON FUNCTION public.email_readable_project_ids() IS
  'Projetos cujos e-mails salvos o usuário logado lê: email-projeto:ler + (portfólio, quem gere '
  'qualquer projeto, GP do projeto ou alocado). Forma de conjunto para a RLS — ADR-0046, ADR-0047.';
COMMENT ON FUNCTION public.can_save_project_email(uuid, uuid) IS
  'Helper de RLS: email-projeto:salvar + (GP do projeto, quem gere qualquer projeto ou alocado). ADR-0047.';

REVOKE ALL ON FUNCTION public.email_readable_project_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_save_project_email(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_readable_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_save_project_email(uuid, uuid) TO authenticated;

-- ── 5. RLS ───────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_emails ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_emails TO authenticated;

CREATE POLICY "project_emails_select" ON public.project_emails
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT public.email_readable_project_ids()));

-- Quem salva assina: `saved_by` é a própria pessoa, nunca outra.
CREATE POLICY "project_emails_insert" ON public.project_emails
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_save_project_email(auth.uid(), project_id)
    AND saved_by = public.employee_id_for(auth.uid(), tenant_id)
  );

-- Resumo e remoção: quem salvou, ou quem gere o projeto.
CREATE POLICY "project_emails_update" ON public.project_emails
  FOR UPDATE TO authenticated
  USING (
    public.can_save_project_email(auth.uid(), project_id)
    AND (
      saved_by = public.employee_id_for(auth.uid(), tenant_id)
      OR public.can_manage_project(auth.uid(), project_id)
    )
  )
  WITH CHECK (public.can_save_project_email(auth.uid(), project_id));

CREATE POLICY "project_emails_delete" ON public.project_emails
  FOR DELETE TO authenticated
  USING (
    public.can_save_project_email(auth.uid(), project_id)
    AND (
      saved_by = public.employee_id_for(auth.uid(), tenant_id)
      OR public.can_manage_project(auth.uid(), project_id)
    )
  );

-- ── 6. Projetos onde a pessoa pode salvar ────────────────────────────────────────────────

-- Lista do seletor, com o mesmo predicado da policy de INSERT escrito em conjunto — a tela
-- não oferece projeto que o banco recusaria. SECURITY DEFINER com o tenant derivado de
-- `auth.uid()` (ADR-0021): devolve só id, nome e se há pasta do OneDrive, e só do tenant
-- de quem chama. Projeto concluído ou cancelado fica fora, como no vínculo de ritos.
CREATE OR REPLACE FUNCTION public.projects_for_email_save()
RETURNS TABLE (id uuid, name text, has_drive_root boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT e.id AS employee_id,
           e.tenant_id,
           public.has_capability(auth.uid(), e.tenant_id, 'projeto:gerir-qualquer') AS manages_any
    FROM public.employees e
    WHERE e.auth_id = auth.uid()
      AND public.has_capability(auth.uid(), e.tenant_id, 'email-projeto:salvar')
  )
  SELECT p.id,
         p.name,
         (p.onedrive_drive_id IS NOT NULL AND p.onedrive_root_item_id IS NOT NULL)
  FROM me
  JOIN public.projects p ON p.tenant_id = me.tenant_id
  WHERE p.portfolio_stage IS DISTINCT FROM 'completed'
    AND p.status IS DISTINCT FROM 'cancelled'
    AND (
      me.manages_any
      OR p.manager_id = me.employee_id
      OR public.is_project_team_member(auth.uid(), p.id)
    )
  ORDER BY p.name;
$$;

COMMENT ON FUNCTION public.projects_for_email_save() IS
  'Projetos em andamento onde quem chama pode salvar e-mail — mesmo predicado de '
  'can_save_project_email, em conjunto e com tenant de auth.uid(). ADR-0047.';

REVOKE ALL ON FUNCTION public.projects_for_email_save() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.projects_for_email_save() TO authenticated;
