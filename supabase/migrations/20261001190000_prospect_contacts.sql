-- Contatos — a pessoa vira cadastro próprio, como a empresa (ADR-0045).
--
-- Pedido de 01/10/2026 (Guilherme): menu Comercial > Contatos, no estilo de Empresas, com
-- todos os contatos da Prospecção, e criação que mostra quem já existe enquanto se digita —
-- para a mesma pessoa não entrar duas vezes.
--
-- Até aqui a pessoa só existia DENTRO do card (`prospects.contact_*`): não havia o que
-- selecionar, e reabordar alguém criava outra cópia dela. Agora:
--
--   * `prospect_contacts` é a pessoa: nome, cargo, empresa, e-mail, telefone, LinkedIn e
--     Instagram. Deduplicação por e-mail OU LinkedIn, por tenant — índices únicos parciais,
--     a mesma regra da empresa (CNPJ OU LinkedIn). Nome não é único: homônimo é legítimo.
--   * `prospects.contact_id` liga o card à pessoa. Uma pessoa pode ter vários cards ao
--     longo do tempo (perdeu em 2026, reabordada em 2027). O card guarda o NEGÓCIO.
--   * Contato criado na tela Contatos NÃO entra no Pipeline: fica no cadastro até alguém
--     decidir abordar ("Levar para a Prospecção").
--
-- `prospects.contact_*` CONTINUA existindo, como CÓPIA mantida pelo banco. A fonte é a
-- pessoa; o card carimba. Motivo: o drop de `competitor_name` (20260930120000) mostrou que
-- apagar coluna no mesmo deploy quebra quem está com a tela aberta — e aqui há ainda o MCP
-- da Prospecção instalado nas máquinas e o seed do tenant demo, que gravam esses campos.
-- Com a cópia, nenhum leitor muda e nenhum escritor antigo quebra:
--
--   1. card novo sem `contact_id`: o banco acha a pessoa pelo e-mail ou LinkedIn, ou a cria
--      (prospects_link_contact). Card novo com `contact_id`: copia os dados dela.
--   2. edição dos campos de contato DIRETO no card (cliente antigo): sobe para a pessoa
--      (prospects_push_contact) e dela para os outros cards.
--   3. edição da pessoa: desce para todos os cards dela (prospect_contacts_propagate).
--
-- A empresa NÃO propaga: o card fica na conta em que o negócio foi aberto. Mudar de empresa
-- não pode mover um Ganho para outra conta (orçamento, projeto e cliente seguem a do card).
--
-- Migração dos cards existentes: cards com o mesmo e-mail ou o mesmo LinkedIn (sem caixa
-- nem espaço) viram UMA pessoa — inclusive por transitividade (A e B pelo e-mail, B e C
-- pelo LinkedIn). O card mais recente define os dados; os outros só completam o que falta.
-- Os valores de antes ficam em `legado_contatos.prospects_antes_dos_contatos`, fora da API.
--
-- Rollback: supabase/rollback/20261001190000_prospect_contacts_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. A pessoa
-- ---------------------------------------------------------------------------

CREATE TABLE public.prospect_contacts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id    uuid        NOT NULL REFERENCES public.prospect_companies(id),
  name          text        NOT NULL,
  role          text,
  email         text,
  phone         text,
  linkedin_url  text,
  instagram_url text,
  created_by    uuid        REFERENCES public.employees(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_contacts_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT prospect_contacts_instagram_length
    CHECK (instagram_url IS NULL OR char_length(instagram_url) <= 300)
);

COMMENT ON TABLE public.prospect_contacts IS
  'Contatos (01/10/2026, ADR-0045): a pessoa, separada do card do Pipeline. Um contato pode '
  'ter vários cards em `prospects` (`contact_id`). Criado na tela Contatos, não entra no '
  'Pipeline sozinho.';
COMMENT ON COLUMN public.prospect_contacts.company_id IS
  'Empresa atual da pessoa. Não propaga para os cards: cada card fica na conta em que o '
  'negócio foi aberto.';
COMMENT ON COLUMN public.prospect_contacts.email IS
  'Deduplicação: único por tenant sem caixa nem espaço (prospect_contacts_tenant_email_key).';
COMMENT ON COLUMN public.prospect_contacts.linkedin_url IS
  'Deduplicação: único por tenant sem caixa nem espaço (prospect_contacts_tenant_linkedin_key).';
COMMENT ON COLUMN public.prospect_contacts.instagram_url IS
  'Instagram pessoal. Não participa da deduplicação — perfil muda de @ com frequência.';

-- Parciais pelo mesmo motivo da empresa: a maioria entra sem um dos dois, e índice comum
-- trataria os NULLs como distintos sem nunca ajudar.
CREATE UNIQUE INDEX prospect_contacts_tenant_email_key
  ON public.prospect_contacts (tenant_id, lower(btrim(email)))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX prospect_contacts_tenant_linkedin_key
  ON public.prospect_contacts (tenant_id, lower(btrim(linkedin_url)))
  WHERE linkedin_url IS NOT NULL;

-- Busca por nome no combobox de contato.
CREATE INDEX prospect_contacts_tenant_name_idx
  ON public.prospect_contacts (tenant_id, lower(btrim(name)));

CREATE INDEX prospect_contacts_company_idx ON public.prospect_contacts (company_id);

CREATE TRIGGER update_prospect_contacts_updated_at
  BEFORE UPDATE ON public.prospect_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Texto vazio vira NULL: '' seria um e-mail "preenchido" e o segundo '' bateria no índice.
-- E a empresa tem que ser do mesmo tenant — a FK sozinha não olha tenant.
CREATE OR REPLACE FUNCTION public.prospect_contacts_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name          := btrim(NEW.name);
  NEW.role          := NULLIF(btrim(NEW.role), '');
  NEW.email         := NULLIF(btrim(NEW.email), '');
  NEW.phone         := NULLIF(btrim(NEW.phone), '');
  NEW.linkedin_url  := NULLIF(btrim(NEW.linkedin_url), '');
  NEW.instagram_url := NULLIF(btrim(NEW.instagram_url), '');

  IF (TG_OP = 'INSERT'
      OR NEW.company_id IS DISTINCT FROM OLD.company_id
      OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.prospect_companies e
        WHERE e.id = NEW.company_id AND e.tenant_id = NEW.tenant_id
     ) THEN
    RAISE EXCEPTION 'A empresa escolhida não pertence a esta organização.'
      USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospect_contacts_normalize() IS
  'Apara os campos do contato, troca texto vazio por NULL e recusa empresa de outro tenant. '
  'ERRCODE PU001: mensagem escrita para o usuário final.';

CREATE TRIGGER prospect_contacts_normalize
  BEFORE INSERT OR UPDATE ON public.prospect_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_contacts_normalize();

ALTER TABLE public.prospect_contacts ENABLE ROW LEVEL SECURITY;

-- Explícito: policy que passa com privilégio faltando dá "permission denied" difícil de
-- diagnosticar (lição de 20260910100000). DELETE existe porque contato sem card pode sair;
-- com card, a FK de `prospects.contact_id` recusa.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_contacts TO authenticated;

CREATE POLICY "Prospeccao readers can view prospect contacts" ON public.prospect_contacts
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Prospeccao editors can insert prospect contacts" ON public.prospect_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

-- USING e WITH CHECK: quem edita não pode mover a linha para outro tenant.
CREATE POLICY "Prospeccao editors can update prospect contacts" ON public.prospect_contacts
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

CREATE POLICY "Prospeccao editors can delete prospect contacts" ON public.prospect_contacts
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

-- ---------------------------------------------------------------------------
-- 2. O card aponta para a pessoa
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects
  ADD COLUMN contact_id uuid REFERENCES public.prospect_contacts(id);

CREATE INDEX prospects_contact_idx ON public.prospects (contact_id);

COMMENT ON COLUMN public.prospects.contact_id IS
  'A pessoa deste card (ADR-0045). `contact_name`, `contact_role`, `contact_email`, '
  '`contact_phone`, `linkedin_url` e `instagram_url` são CÓPIA dela, mantida por trigger.';
COMMENT ON COLUMN public.prospects.contact_name IS
  'Cópia de prospect_contacts.name, mantida por trigger (ADR-0045). A fonte é a pessoa.';

-- ---------------------------------------------------------------------------
-- 3. Migração: uma pessoa por grupo de cards com o mesmo e-mail ou LinkedIn
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS legado_contatos;
REVOKE ALL ON SCHEMA legado_contatos FROM PUBLIC;

CREATE TABLE legado_contatos.prospects_antes_dos_contatos AS
SELECT id, tenant_id, company_id, contact_name, contact_role, contact_email, contact_phone,
       linkedin_url, instagram_url, updated_at
  FROM public.prospects;

COMMENT ON TABLE legado_contatos.prospects_antes_dos_contatos IS
  'Campos de contato de cada card antes de 20261001190000 (ADR-0045). Base do rollback e de '
  'qualquer conferência da união por e-mail/LinkedIn. Fora da API.';

-- `n` menor = card mais recente: é ele que define os dados da pessoa.
CREATE TEMP TABLE _card ON COMMIT DROP AS
SELECT p.id,
       p.tenant_id,
       lower(NULLIF(btrim(p.contact_email), '')) AS email_n,
       lower(NULLIF(btrim(p.linkedin_url), ''))  AS linkedin_n,
       row_number() OVER (ORDER BY p.updated_at DESC, p.created_at DESC, p.id) AS n
  FROM public.prospects p;

ALTER TABLE _card ADD COLUMN grupo bigint;
UPDATE _card SET grupo = n;

-- Propagação do menor rótulo até estabilizar: une também por transitividade.
DO $$
DECLARE
  mudou integer;
BEGIN
  LOOP
    WITH por_email AS (
      SELECT tenant_id, email_n, min(grupo) AS g FROM _card
       WHERE email_n IS NOT NULL GROUP BY tenant_id, email_n
    ), por_linkedin AS (
      SELECT tenant_id, linkedin_n, min(grupo) AS g FROM _card
       WHERE linkedin_n IS NOT NULL GROUP BY tenant_id, linkedin_n
    ), novo AS (
      SELECT c.n, LEAST(c.grupo, COALESCE(e.g, c.grupo), COALESCE(l.g, c.grupo)) AS g
        FROM _card c
        LEFT JOIN por_email e    ON e.tenant_id = c.tenant_id AND e.email_n = c.email_n
        LEFT JOIN por_linkedin l ON l.tenant_id = c.tenant_id AND l.linkedin_n = c.linkedin_n
    )
    UPDATE _card c SET grupo = novo.g FROM novo WHERE novo.n = c.n AND novo.g < c.grupo;
    GET DIAGNOSTICS mudou = ROW_COUNT;
    EXIT WHEN mudou = 0;
  END LOOP;
END;
$$;

-- Cada campo: o do card mais recente que o tem preenchido. E-mail e LinkedIn de grupos
-- diferentes nunca coincidem (é o que define o grupo), então os índices únicos passam.
CREATE TEMP TABLE _pessoa ON COMMIT DROP AS
SELECT c.grupo,
       gen_random_uuid() AS contact_id,
       (array_agg(p.tenant_id ORDER BY c.n))[1]           AS tenant_id,
       (array_agg(p.company_id ORDER BY c.n))[1]          AS company_id,
       (array_agg(btrim(p.contact_name) ORDER BY c.n))[1] AS name,
       (array_agg(NULLIF(btrim(p.contact_role), '') ORDER BY c.n)
          FILTER (WHERE NULLIF(btrim(p.contact_role), '') IS NOT NULL))[1]  AS role,
       (array_agg(NULLIF(btrim(p.contact_email), '') ORDER BY c.n)
          FILTER (WHERE NULLIF(btrim(p.contact_email), '') IS NOT NULL))[1] AS email,
       (array_agg(NULLIF(btrim(p.contact_phone), '') ORDER BY c.n)
          FILTER (WHERE NULLIF(btrim(p.contact_phone), '') IS NOT NULL))[1] AS phone,
       (array_agg(NULLIF(btrim(p.linkedin_url), '') ORDER BY c.n)
          FILTER (WHERE NULLIF(btrim(p.linkedin_url), '') IS NOT NULL))[1]  AS linkedin_url,
       (array_agg(NULLIF(btrim(p.instagram_url), '') ORDER BY c.n)
          FILTER (WHERE NULLIF(btrim(p.instagram_url), '') IS NOT NULL))[1] AS instagram_url,
       (array_agg(p.created_by ORDER BY p.created_at))[1] AS created_by,
       min(p.created_at)                                   AS created_at
  FROM _card c
  JOIN public.prospects p ON p.id = c.id
 GROUP BY c.grupo;

INSERT INTO public.prospect_contacts (
  id, tenant_id, company_id, name, role, email, phone, linkedin_url, instagram_url,
  created_by, created_at
)
SELECT contact_id, tenant_id, company_id, name, role, email, phone, linkedin_url, instagram_url,
       created_by, created_at
  FROM _pessoa;

-- Ligar e carimbar sem mexer em `updated_at`: a métrica de reunião usa a data do card como
-- reserva (metricsReadings), e a migração não é uma edição de ninguém.
ALTER TABLE public.prospects DISABLE TRIGGER update_prospects_updated_at;

UPDATE public.prospects p
   SET contact_id    = pe.contact_id,
       contact_name  = pe.name,
       contact_role  = pe.role,
       contact_email = pe.email,
       contact_phone = pe.phone,
       linkedin_url  = pe.linkedin_url,
       instagram_url = pe.instagram_url
  FROM _card c
  JOIN _pessoa pe ON pe.grupo = c.grupo
 WHERE c.id = p.id;

ALTER TABLE public.prospects ENABLE TRIGGER update_prospects_updated_at;

ALTER TABLE public.prospects ALTER COLUMN contact_id SET NOT NULL;

DO $$
DECLARE
  cards   integer;
  pessoas integer;
BEGIN
  SELECT count(*) INTO cards FROM _card;
  SELECT count(*) INTO pessoas FROM _pessoa;
  RAISE NOTICE 'Contatos: % cards viraram % pessoas (% cards unidos por e-mail/LinkedIn).',
    cards, pessoas, cards - pessoas;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. A cópia no card: a pessoa é a fonte, o card carimba
-- ---------------------------------------------------------------------------

-- Card novo (ou que trocou de pessoa): resolve a pessoa e copia os dados dela.
-- Sem `contact_id`, acha pelo e-mail ou LinkedIn ou cria — é o caminho do MCP instalado,
-- do seed e do "Virar contato". Achada a pessoa, completa só cargo, telefone e Instagram
-- que faltam: e-mail e LinkedIn são chave, e completá-los poderia colidir com outra pessoa.
CREATE OR REPLACE FUNCTION public.prospects_link_contact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_email    text := lower(NULLIF(btrim(NEW.contact_email), ''));
  v_linkedin text := lower(NULLIF(btrim(NEW.linkedin_url), ''));
  v_pessoa   public.prospect_contacts%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.contact_id IS NOT DISTINCT FROM OLD.contact_id THEN
    -- Mesma pessoa: edição direta dos campos ou a cópia descendo dela. Só normaliza.
    NEW.contact_name  := btrim(NEW.contact_name);
    NEW.contact_role  := NULLIF(btrim(NEW.contact_role), '');
    NEW.contact_email := NULLIF(btrim(NEW.contact_email), '');
    NEW.contact_phone := NULLIF(btrim(NEW.contact_phone), '');
    NEW.linkedin_url  := NULLIF(btrim(NEW.linkedin_url), '');
    NEW.instagram_url := NULLIF(btrim(NEW.instagram_url), '');
    RETURN NEW;
  END IF;

  IF NEW.contact_id IS NULL AND (v_email IS NOT NULL OR v_linkedin IS NOT NULL) THEN
    SELECT c.id INTO NEW.contact_id
      FROM public.prospect_contacts c
     WHERE c.tenant_id = NEW.tenant_id
       AND ((v_email IS NOT NULL AND lower(btrim(c.email)) = v_email)
         OR (v_linkedin IS NOT NULL AND lower(btrim(c.linkedin_url)) = v_linkedin))
     ORDER BY (v_email IS NOT NULL AND lower(btrim(c.email)) = v_email) DESC, c.created_at
     LIMIT 1;

    UPDATE public.prospect_contacts c
       SET role          = COALESCE(c.role, NULLIF(btrim(NEW.contact_role), '')),
           phone         = COALESCE(c.phone, NULLIF(btrim(NEW.contact_phone), '')),
           instagram_url = COALESCE(c.instagram_url, NULLIF(btrim(NEW.instagram_url), ''))
     WHERE c.id = NEW.contact_id
       AND (c.role IS NULL OR c.phone IS NULL OR c.instagram_url IS NULL);
  END IF;

  IF NEW.contact_id IS NULL THEN
    INSERT INTO public.prospect_contacts (
      tenant_id, company_id, name, role, email, phone, linkedin_url, instagram_url, created_by
    ) VALUES (
      NEW.tenant_id, NEW.company_id, NEW.contact_name, NEW.contact_role, NEW.contact_email,
      NEW.contact_phone, NEW.linkedin_url, NEW.instagram_url, NEW.created_by
    )
    RETURNING id INTO NEW.contact_id;
  END IF;

  SELECT * INTO v_pessoa
    FROM public.prospect_contacts c
   WHERE c.id = NEW.contact_id AND c.tenant_id = NEW.tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contato não encontrado nesta organização.' USING ERRCODE = 'PU001';
  END IF;

  NEW.contact_name  := v_pessoa.name;
  NEW.contact_role  := v_pessoa.role;
  NEW.contact_email := v_pessoa.email;
  NEW.contact_phone := v_pessoa.phone;
  NEW.linkedin_url  := v_pessoa.linkedin_url;
  NEW.instagram_url := v_pessoa.instagram_url;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospects_link_contact() IS
  'Liga o card à pessoa (acha por e-mail/LinkedIn ou cria) e copia os dados dela para '
  'prospects.contact_* (ADR-0045). SECURITY INVOKER: passa pela RLS de prospect_contacts.';

CREATE TRIGGER prospects_link_contact
  BEFORE INSERT OR UPDATE OF contact_id, contact_name, contact_role, contact_email,
                             contact_phone, linkedin_url, instagram_url
  ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.prospects_link_contact();

-- Edição direta dos campos de contato no card (MCP instalado, tela aberta antes do deploy):
-- sobe para a pessoa, e dela desce para os outros cards. Só no nível de cima — quando a
-- mudança já veio da pessoa (profundidade > 1), subir de novo seria eco.
CREATE OR REPLACE FUNCTION public.prospects_push_contact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.prospect_contacts c
     SET name          = NEW.contact_name,
         role          = NEW.contact_role,
         email         = NEW.contact_email,
         phone         = NEW.contact_phone,
         linkedin_url  = NEW.linkedin_url,
         instagram_url = NEW.instagram_url
   WHERE c.id = NEW.contact_id
     AND (c.name, c.role, c.email, c.phone, c.linkedin_url, c.instagram_url)
         IS DISTINCT FROM
         (NEW.contact_name, NEW.contact_role, NEW.contact_email, NEW.contact_phone,
          NEW.linkedin_url, NEW.instagram_url);
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.prospects_push_contact() IS
  'Leva para a pessoa a edição feita direto nos campos de contato do card (ADR-0045).';

CREATE TRIGGER prospects_push_contact
  AFTER UPDATE OF contact_name, contact_role, contact_email, contact_phone, linkedin_url, instagram_url
  ON public.prospects
  FOR EACH ROW
  WHEN (OLD.contact_id IS NOT DISTINCT FROM NEW.contact_id
        AND (OLD.contact_name, OLD.contact_role, OLD.contact_email, OLD.contact_phone,
             OLD.linkedin_url, OLD.instagram_url)
            IS DISTINCT FROM
            (NEW.contact_name, NEW.contact_role, NEW.contact_email, NEW.contact_phone,
             NEW.linkedin_url, NEW.instagram_url))
  EXECUTE FUNCTION public.prospects_push_contact();

-- A pessoa mudou: todos os cards dela passam a mostrar o mesmo.
CREATE OR REPLACE FUNCTION public.prospect_contacts_propagate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.prospects p
     SET contact_name  = NEW.name,
         contact_role  = NEW.role,
         contact_email = NEW.email,
         contact_phone = NEW.phone,
         linkedin_url  = NEW.linkedin_url,
         instagram_url = NEW.instagram_url
   WHERE p.contact_id = NEW.id
     AND (p.contact_name, p.contact_role, p.contact_email, p.contact_phone,
          p.linkedin_url, p.instagram_url)
         IS DISTINCT FROM
         (NEW.name, NEW.role, NEW.email, NEW.phone, NEW.linkedin_url, NEW.instagram_url);
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.prospect_contacts_propagate() IS
  'Copia os dados da pessoa para todos os cards dela (prospects.contact_*, ADR-0045).';

CREATE TRIGGER prospect_contacts_propagate
  AFTER UPDATE OF name, role, email, phone, linkedin_url, instagram_url
  ON public.prospect_contacts
  FOR EACH ROW
  WHEN ((OLD.name, OLD.role, OLD.email, OLD.phone, OLD.linkedin_url, OLD.instagram_url)
        IS DISTINCT FROM
        (NEW.name, NEW.role, NEW.email, NEW.phone, NEW.linkedin_url, NEW.instagram_url))
  EXECUTE FUNCTION public.prospect_contacts_propagate();
