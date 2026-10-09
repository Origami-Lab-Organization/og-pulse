-- Oportunidades — o card do Pipeline passa a ser da EMPRESA, com vários contatos (09/10/2026).
--
-- Pedido do Guilherme: o menu Prospecção vira "Oportunidades". Em vez de um card por contato,
-- um card por oportunidade de negócio, com o nome da empresa e os contatos dentro:
--
--   * Empresa tem N contatos e N oportunidades.
--   * Oportunidade tem N contatos, cada um com um papel: decisor, influenciador, usuário,
--     bloqueador ou campeão (lista fechada, guardada em slug; papel vazio = não classificado).
--   * A atividade pode marcar com quem foi feita (`prospect_activities.contact_id`). É
--     opcional: o registro de um clique continua valendo.
--
-- `prospects` CONTINUA sendo o card: orçamento (`budgets.prospect_id`), projeto
-- (`projects.prospect_id`), atividades, tarefas, histórico de etapa e métricas não mudam de
-- dono. O que muda é a pessoa: sai de `prospects.contact_id` (uma) para
-- `prospect_opportunity_contacts` (várias, com papel).
--
-- `prospects.contact_id` e a cópia `contact_*` ficam, agora OPCIONAIS, como o CONTATO PRINCIPAL
-- da oportunidade — mantido pelo banco a partir dos vínculos. Motivo, o mesmo de ADR-0045: o MCP
-- da Prospecção instalado nas máquinas e o seed do tenant demo leem e gravam esses campos.
--   1. vínculo novo numa oportunidade sem principal: ele vira o principal;
--   2. o principal sai da oportunidade: o próximo vínculo assume (decisor primeiro), ou fica vazio;
--   3. card gravado com `contact_id` (MCP, seed, cliente antigo): o vínculo é criado sozinho.
--
-- "Um card em andamento por pessoa" (20261002120000) deixa de valer: a mesma pessoa pode estar
-- em duas oportunidades da empresa ao mesmo tempo (dois serviços, o mesmo decisor).
--
-- Migração dos cards existentes (decisão do Guilherme, 09/10/2026): por empresa, os cards em
-- andamento e os perdidos viram UMA oportunidade, na etapa mais avançada — Qualificada > Reunião
-- feita > Reunião agendada > Respondeu > Em cadência > A abordar > Perda > Sem resposta (card em
-- andamento vence card perdido: alguém ainda está trabalhando nele). Cada GANHO continua sendo
-- uma oportunidade própria: é uma venda feita, com valor, orçamento e projeto. Empate: o que
-- tem orçamento, depois o mais recente. O que sai entrega tudo ao que fica: atividades
-- (renumeradas pela data, cada uma marcada com a pessoa do card de origem), tarefas, histórico
-- de etapa, orçamento, projeto, vínculo de sócio, valor estimado, alavanca, responsável e
-- observações. Todas as pessoas ficam vinculadas à oportunidade que fica, sem papel.
-- Empresa com dois ou mais orçamentos nesses cards NÃO é unida (um orçamento por oportunidade):
-- fica listada no NOTICE, com as oportunidades separadas — o modelo novo já permite isso.
--
-- Tudo o que muda fica em `legado_contatos.oportunidade_*`, fora da API — base do rollback.
--
-- Rollback: supabase/rollback/20261009120000_oportunidade_por_empresa_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Os contatos da oportunidade
-- ---------------------------------------------------------------------------

CREATE TABLE public.prospect_opportunity_contacts (
  prospect_id uuid        NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  -- Sem cascade: contato que está em oportunidade não sai do cadastro (mesma regra do card).
  contact_id  uuid        NOT NULL REFERENCES public.prospect_contacts(id),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role        text,
  created_by  uuid        REFERENCES public.employees(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prospect_id, contact_id),
  CONSTRAINT prospect_opportunity_contacts_role_valid
    CHECK (role IS NULL OR role IN ('decisor', 'influenciador', 'usuario', 'bloqueador', 'campeao'))
);

COMMENT ON TABLE public.prospect_opportunity_contacts IS
  'Contatos de cada oportunidade (09/10/2026): uma oportunidade (`prospects`) tem várias pessoas '
  '(`prospect_contacts`), cada uma com um papel. Mantém `prospects.contact_id` (o principal).';
COMMENT ON COLUMN public.prospect_opportunity_contacts.role IS
  'Papel na decisão, lista fechada em slug: decisor, influenciador, usuario, bloqueador, campeao. '
  'NULL = não classificado. Rótulos em PROSPECT_CONTACT_ROLES (src/types/prospect.ts).';

CREATE INDEX prospect_opportunity_contacts_contact_idx ON public.prospect_opportunity_contacts (contact_id);
CREATE INDEX prospect_opportunity_contacts_tenant_idx ON public.prospect_opportunity_contacts (tenant_id);

-- O tenant vem SEMPRE da oportunidade, e a pessoa tem de ser da mesma organização: parâmetro
-- de cliente não escolhe tenant (ADR-0021), e a FK sozinha não olha tenant.
CREATE OR REPLACE FUNCTION public.prospect_opportunity_contacts_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Trocar a pessoa de um vínculo deixaria o principal apontando para quem saiu: só o papel muda.
  IF TG_OP = 'UPDATE' AND (NEW.prospect_id <> OLD.prospect_id OR NEW.contact_id <> OLD.contact_id) THEN
    RAISE EXCEPTION 'Para trocar o contato, remova o vínculo e adicione outro.' USING ERRCODE = 'PU001';
  END IF;

  SELECT p.tenant_id INTO NEW.tenant_id FROM public.prospects p WHERE p.id = NEW.prospect_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oportunidade não encontrada.' USING ERRCODE = 'PU001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.prospect_contacts c WHERE c.id = NEW.contact_id AND c.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'O contato escolhido não pertence a esta organização.' USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospect_opportunity_contacts_guard() IS
  'Herda o tenant da oportunidade e recusa pessoa de outra organização. ERRCODE PU001: '
  'mensagem escrita para o usuário final.';

CREATE TRIGGER prospect_opportunity_contacts_guard
  BEFORE INSERT OR UPDATE ON public.prospect_opportunity_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_opportunity_contacts_guard();

ALTER TABLE public.prospect_opportunity_contacts ENABLE ROW LEVEL SECURITY;

-- Explícito, como em prospect_contacts: policy que passa com privilégio faltando dá
-- "permission denied" difícil de diagnosticar (lição de 20260910100000).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_opportunity_contacts TO authenticated;

CREATE POLICY "Prospeccao readers can view opportunity contacts" ON public.prospect_opportunity_contacts
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Prospeccao editors can insert opportunity contacts" ON public.prospect_opportunity_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

CREATE POLICY "Prospeccao editors can update opportunity contacts" ON public.prospect_opportunity_contacts
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

CREATE POLICY "Prospeccao editors can delete opportunity contacts" ON public.prospect_opportunity_contacts
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

-- ---------------------------------------------------------------------------
-- 2. Com quem foi a atividade; o sócio que virou contato
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospect_activities
  ADD COLUMN contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE SET NULL;

CREATE INDEX prospect_activities_contact_idx ON public.prospect_activities (contact_id);

COMMENT ON COLUMN public.prospect_activities.contact_id IS
  'Com quem foi a atividade (09/10/2026). Opcional: o registro de um clique não pergunta.';

-- "Virar contato" passa a criar a pessoa, não um card: a oportunidade é da empresa.
-- `prospect_id` continua como histórico dos sócios que viraram card antes desta data.
ALTER TABLE public.prospect_company_partners
  ADD COLUMN contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.prospect_company_partners.contact_id IS
  'A pessoa criada por "Virar contato" (desde 09/10/2026). Antes, o sócio virava card (prospect_id).';

-- A pessoa ligada tem de ser da mesma organização da atividade ou da empresa do sócio.
CREATE OR REPLACE FUNCTION public.prospect_contact_same_tenant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF NEW.contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'prospect_activities' THEN
    SELECT tenant_id INTO v_tenant FROM public.prospects WHERE id = NEW.prospect_id;
  ELSE
    SELECT tenant_id INTO v_tenant FROM public.prospect_companies WHERE id = NEW.company_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.prospect_contacts c WHERE c.id = NEW.contact_id AND c.tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'O contato escolhido não pertence a esta organização.' USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospect_contact_same_tenant() IS
  'Recusa ligar atividade ou sócio a pessoa de outra organização. ERRCODE PU001.';

CREATE TRIGGER prospect_activities_contact_same_tenant
  BEFORE INSERT OR UPDATE OF contact_id ON public.prospect_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_contact_same_tenant();

CREATE TRIGGER prospect_company_partners_contact_same_tenant
  BEFORE INSERT OR UPDATE OF contact_id ON public.prospect_company_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_contact_same_tenant();

-- ---------------------------------------------------------------------------
-- 3. O card deixa de exigir pessoa
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS public.prospects_um_card_aberto_key;
DROP TRIGGER IF EXISTS prospects_um_card_aberto ON public.prospects;
DROP FUNCTION IF EXISTS public.prospects_um_card_aberto();

ALTER TABLE public.prospects ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE public.prospects ALTER COLUMN contact_name DROP NOT NULL;

COMMENT ON COLUMN public.prospects.contact_id IS
  'O CONTATO PRINCIPAL da oportunidade (09/10/2026), mantido pelo banco a partir de '
  'prospect_opportunity_contacts. NULL = oportunidade ainda sem contato. `contact_*` é cópia dele.';
COMMENT ON COLUMN public.prospects.contact_name IS
  'Cópia do nome do contato principal (ADR-0045). NULL quando a oportunidade não tem contato.';

-- Mesma função de 20261001190000, com um caso novo: oportunidade sem pessoa. Sem `contact_id`
-- e sem dado de pessoa (a tela nova), ou com o principal saindo da oportunidade, a cópia no
-- card fica vazia — antes o banco tentaria criar uma pessoa sem nome.
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
  IF TG_OP = 'UPDATE' AND NEW.contact_id IS NOT NULL AND NEW.contact_id IS NOT DISTINCT FROM OLD.contact_id THEN
    -- Mesma pessoa: edição direta dos campos ou a cópia descendo dela. Só normaliza.
    NEW.contact_name  := btrim(NEW.contact_name);
    NEW.contact_role  := NULLIF(btrim(NEW.contact_role), '');
    NEW.contact_email := NULLIF(btrim(NEW.contact_email), '');
    NEW.contact_phone := NULLIF(btrim(NEW.contact_phone), '');
    NEW.linkedin_url  := NULLIF(btrim(NEW.linkedin_url), '');
    NEW.instagram_url := NULLIF(btrim(NEW.instagram_url), '');
    RETURN NEW;
  END IF;

  IF NEW.contact_id IS NULL
     AND ((TG_OP = 'UPDATE' AND OLD.contact_id IS NOT NULL)
          OR (NULLIF(btrim(NEW.contact_name), '') IS NULL AND v_email IS NULL AND v_linkedin IS NULL)) THEN
    NEW.contact_name  := NULL;
    NEW.contact_role  := NULL;
    NEW.contact_email := NULL;
    NEW.contact_phone := NULL;
    NEW.linkedin_url  := NULL;
    NEW.instagram_url := NULL;
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
  'Liga o card ao contato principal (acha por e-mail/LinkedIn ou cria) e copia os dados dele '
  'para prospects.contact_* (ADR-0045). Sem pessoa nem dado de pessoa, a cópia fica vazia '
  '(oportunidade sem contato, 09/10/2026). SECURITY INVOKER: passa pela RLS de prospect_contacts.';

-- ---------------------------------------------------------------------------
-- 4. Migração: cada pessoa vinculada ao próprio card, e cada atividade à pessoa do card
-- ---------------------------------------------------------------------------

-- Até hoje cada card era UMA pessoa: todo toque registrado nele foi com ela.
INSERT INTO public.prospect_opportunity_contacts (prospect_id, contact_id, tenant_id, created_by, created_at)
SELECT p.id, p.contact_id, p.tenant_id, p.created_by, p.created_at
  FROM public.prospects p
 WHERE p.contact_id IS NOT NULL;

UPDATE public.prospect_activities a
   SET contact_id = p.contact_id
  FROM public.prospects p
 WHERE p.id = a.prospect_id
   AND p.contact_id IS NOT NULL;

ALTER TABLE public.prospect_tasks DISABLE TRIGGER update_prospect_tasks_updated_at;
ALTER TABLE public.prospect_company_partners DISABLE TRIGGER update_prospect_company_partners_updated_at;

UPDATE public.prospect_company_partners s
   SET contact_id = p.contact_id
  FROM public.prospects p
 WHERE p.id = s.prospect_id
   AND p.contact_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Migração: uma oportunidade por empresa (Ganho fica separado)
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _card ON COMMIT DROP AS
SELECT p.id,
       p.tenant_id,
       p.company_id,
       p.updated_at,
       CASE p.stage
         WHEN 'qualificado' THEN 60 WHEN 'reuniao_feita' THEN 50 WHEN 'reuniao_agendada' THEN 40
         WHEN 'respondeu' THEN 30 WHEN 'em_cadencia' THEN 20 WHEN 'a_abordar' THEN 10
         WHEN 'descartado' THEN 5 ELSE 0
       END AS avanco,
       EXISTS (SELECT 1 FROM public.budgets b WHERE b.prospect_id = p.id) AS tem_orcamento
  FROM public.prospects p
 WHERE p.stage NOT IN ('ganho', 'convertido');

CREATE TEMP TABLE _grupo ON COMMIT DROP AS
SELECT tenant_id,
       company_id,
       (array_agg(id ORDER BY avanco DESC, tem_orcamento DESC, updated_at DESC, id))[1] AS sobrevivente,
       count(*) AS cards,
       count(*) FILTER (WHERE tem_orcamento) AS orcamentos
  FROM _card
 GROUP BY tenant_id, company_id
HAVING count(*) > 1;

DO $$
DECLARE
  pendente record;
BEGIN
  FOR pendente IN
    SELECT e.name AS empresa, string_agg(COALESCE(p.contact_name, '?') || ' (' || p.stage || ', ' || p.id || ')', '; ') AS cards
      FROM _grupo g
      JOIN _card c ON c.tenant_id = g.tenant_id AND c.company_id = g.company_id
      JOIN public.prospects p ON p.id = c.id
      JOIN public.prospect_companies e ON e.id = g.company_id
     WHERE g.orcamentos > 1
     GROUP BY g.tenant_id, g.company_id, e.name
  LOOP
    RAISE NOTICE 'Não unida (dois orçamentos, oportunidades ficam separadas): % — %', pendente.empresa, pendente.cards;
  END LOOP;
END;
$$;

DELETE FROM _grupo WHERE orcamentos > 1;

CREATE TEMP TABLE _uniao ON COMMIT DROP AS
SELECT c.id AS perdedor, g.sobrevivente
  FROM _card c
  JOIN _grupo g ON g.tenant_id = c.tenant_id AND g.company_id = c.company_id
 WHERE c.id <> g.sobrevivente;

-- O arquivo: tudo o que vai mudar, como estava.
CREATE SCHEMA IF NOT EXISTS legado_contatos;
REVOKE ALL ON SCHEMA legado_contatos FROM PUBLIC;

CREATE TABLE legado_contatos.oportunidade_cards AS
SELECT u.perdedor, u.sobrevivente, to_jsonb(p.*) AS card_perdedor
  FROM _uniao u JOIN public.prospects p ON p.id = u.perdedor;

CREATE TABLE legado_contatos.oportunidade_sobreviventes AS
SELECT p.id, to_jsonb(p.*) AS card_antes
  FROM public.prospects p
 WHERE p.id IN (SELECT sobrevivente FROM _grupo);

CREATE TABLE legado_contatos.oportunidade_filhos AS
SELECT 'prospect_activities'::text AS tabela, a.id, a.prospect_id AS prospect_id_antes, a.sequence_no AS sequence_no_antes
  FROM public.prospect_activities a
 WHERE a.prospect_id IN (SELECT perdedor FROM _uniao UNION SELECT sobrevivente FROM _grupo)
UNION ALL
SELECT 'prospect_tasks', t.id, t.prospect_id, NULL FROM public.prospect_tasks t
 WHERE t.prospect_id IN (SELECT perdedor FROM _uniao)
UNION ALL
SELECT 'prospect_stage_changes', s.id, s.prospect_id, NULL FROM public.prospect_stage_changes s
 WHERE s.prospect_id IN (SELECT perdedor FROM _uniao)
UNION ALL
SELECT 'prospect_company_partners', s.id, s.prospect_id, NULL FROM public.prospect_company_partners s
 WHERE s.prospect_id IN (SELECT perdedor FROM _uniao)
UNION ALL
SELECT 'budgets', b.id, b.prospect_id, NULL FROM public.budgets b
 WHERE b.prospect_id IN (SELECT perdedor FROM _uniao)
UNION ALL
SELECT 'projects', j.id, j.prospect_id, NULL FROM public.projects j
 WHERE j.prospect_id IN (SELECT perdedor FROM _uniao);

COMMENT ON TABLE legado_contatos.oportunidade_cards IS
  'Cards removidos na união por empresa de 20261009120000, inteiros, e para qual oportunidade foram.';

-- Atividades: renumeradas pela data na oportunidade que fica. Em duas passadas, para o índice
-- único (prospect_id, sequence_no) nunca ver dois iguais no meio do caminho.
UPDATE public.prospect_activities a
   SET prospect_id = m.destino,
       sequence_no = 1000000 + m.ordem
  FROM (
    SELECT a2.id,
           COALESCE(u.sobrevivente, a2.prospect_id) AS destino,
           row_number() OVER (
             PARTITION BY COALESCE(u.sobrevivente, a2.prospect_id)
             ORDER BY a2.activity_date, a2.created_at, a2.id
           ) AS ordem
      FROM public.prospect_activities a2
      LEFT JOIN _uniao u ON u.perdedor = a2.prospect_id
     WHERE a2.prospect_id IN (SELECT perdedor FROM _uniao UNION SELECT sobrevivente FROM _grupo)
  ) m
 WHERE a.id = m.id;

UPDATE public.prospect_activities
   SET sequence_no = sequence_no - 1000000
 WHERE prospect_id IN (SELECT sobrevivente FROM _grupo) AND sequence_no > 1000000;

UPDATE public.prospect_tasks t SET prospect_id = u.sobrevivente FROM _uniao u WHERE t.prospect_id = u.perdedor;
UPDATE public.prospect_stage_changes s SET prospect_id = u.sobrevivente FROM _uniao u WHERE s.prospect_id = u.perdedor;
UPDATE public.prospect_company_partners s SET prospect_id = u.sobrevivente FROM _uniao u WHERE s.prospect_id = u.perdedor;
UPDATE public.budgets b SET prospect_id = u.sobrevivente FROM _uniao u WHERE b.prospect_id = u.perdedor;
UPDATE public.projects j SET prospect_id = u.sobrevivente FROM _uniao u WHERE j.prospect_id = u.perdedor;

ALTER TABLE public.prospect_company_partners ENABLE TRIGGER update_prospect_company_partners_updated_at;
ALTER TABLE public.prospect_tasks ENABLE TRIGGER update_prospect_tasks_updated_at;

-- Todas as pessoas da empresa passam a ser contatos da oportunidade que fica.
INSERT INTO public.prospect_opportunity_contacts (prospect_id, contact_id, tenant_id, created_by, created_at)
SELECT u.sobrevivente, l.contact_id, l.tenant_id, l.created_by, l.created_at
  FROM _uniao u
  JOIN public.prospect_opportunity_contacts l ON l.prospect_id = u.perdedor
ON CONFLICT (prospect_id, contact_id) DO NOTHING;

-- A oportunidade que fica completa o que falta com as que saem. O 1º toque é o mais antigo:
-- é união de dado, não edição — o trigger que o protege fica desligado só aqui. `updated_at`
-- também: a métrica de reunião usa essa data como reserva, e a migração não é edição de ninguém.
ALTER TABLE public.prospects DISABLE TRIGGER prospects_protect_first_touch;
ALTER TABLE public.prospects DISABLE TRIGGER update_prospects_updated_at;

UPDATE public.prospects s
   SET estimated_value = COALESCE(s.estimated_value, d.estimated_value),
       lever           = COALESCE(s.lever, d.lever),
       owner_id        = COALESCE(s.owner_id, d.owner_id),
       first_touch_at  = LEAST(s.first_touch_at, d.first_touch_at),
       activity_count  = (SELECT count(*) FROM public.prospect_activities a WHERE a.prospect_id = s.id),
       notes           = NULLIF(CASE
                           WHEN char_length(concat_ws(E'\n\n', s.notes, d.notas)) <= 10000
                             THEN concat_ws(E'\n\n', s.notes, d.notas)
                           ELSE left(concat_ws(E'\n\n', s.notes, d.notas), 9850)
                                || E'\n\n[Observações cortadas na união; a íntegra está em legado_contatos.oportunidade_cards.]'
                         END, '')
  FROM (
    SELECT u.sobrevivente,
           (array_agg(p.estimated_value ORDER BY p.updated_at DESC) FILTER (WHERE p.estimated_value IS NOT NULL))[1] AS estimated_value,
           (array_agg(p.lever ORDER BY p.updated_at DESC) FILTER (WHERE p.lever IS NOT NULL))[1] AS lever,
           (array_agg(p.owner_id ORDER BY p.updated_at DESC) FILTER (WHERE p.owner_id IS NOT NULL))[1] AS owner_id,
           min(p.first_touch_at) AS first_touch_at,
           string_agg(
             'Unido do card de ' || COALESCE(p.contact_name, 'contato sem nome') || ' ('
               || CASE p.stage
                    WHEN 'a_abordar' THEN 'A abordar' WHEN 'em_cadencia' THEN 'Em cadência'
                    WHEN 'respondeu' THEN 'Respondeu' WHEN 'reuniao_agendada' THEN 'Reunião agendada'
                    WHEN 'reuniao_feita' THEN 'Reunião feita' WHEN 'qualificado' THEN 'Oportunidade qualificada'
                    WHEN 'descartado' THEN 'Perda' WHEN 'sem_resposta' THEN 'Sem resposta'
                    ELSE p.stage
                  END
               || ', aberto em ' || to_char(p.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || ')'
               || COALESCE(': ' || NULLIF(btrim(p.notes), ''), '.'),
             E'\n\n' ORDER BY p.created_at
           ) AS notas
      FROM _uniao u JOIN public.prospects p ON p.id = u.perdedor
     GROUP BY u.sobrevivente
  ) d
 WHERE s.id = d.sobrevivente;

ALTER TABLE public.prospects ENABLE TRIGGER update_prospects_updated_at;
ALTER TABLE public.prospects ENABLE TRIGGER prospects_protect_first_touch;

-- Os vínculos dos cards que saem vão junto, por cascade: já foram copiados acima.
DELETE FROM public.prospects WHERE id IN (SELECT perdedor FROM _uniao);

DO $$
DECLARE
  unidos   integer;
  grupos   integer;
  vinculos integer;
BEGIN
  SELECT count(*) INTO unidos FROM _uniao;
  SELECT count(*) INTO grupos FROM _grupo;
  SELECT count(*) INTO vinculos FROM public.prospect_opportunity_contacts;
  RAISE NOTICE 'Oportunidades por empresa: % cards unidos em % oportunidades; % vínculos de contato.',
    unidos, grupos, vinculos;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Daqui para frente: o contato principal acompanha os vínculos
-- ---------------------------------------------------------------------------

-- Vínculo novo numa oportunidade sem principal: ele vira o principal (a cópia desce pelo
-- prospects_link_contact).
CREATE OR REPLACE FUNCTION public.prospect_opportunity_contacts_set_principal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.prospects
     SET contact_id = NEW.contact_id
   WHERE id = NEW.prospect_id
     AND contact_id IS NULL;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.prospect_opportunity_contacts_set_principal() IS
  'Primeiro contato da oportunidade vira o principal (prospects.contact_id), 09/10/2026.';

CREATE TRIGGER prospect_opportunity_contacts_set_principal
  AFTER INSERT ON public.prospect_opportunity_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_opportunity_contacts_set_principal();

-- O principal saiu: o próximo assume — decisor primeiro, depois o mais antigo — ou fica vazio.
CREATE OR REPLACE FUNCTION public.prospect_opportunity_contacts_replace_principal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.prospects p
     SET contact_id = (
       SELECT l.contact_id
         FROM public.prospect_opportunity_contacts l
        WHERE l.prospect_id = OLD.prospect_id
        ORDER BY (l.role IS NOT DISTINCT FROM 'decisor') DESC, l.created_at, l.contact_id
        LIMIT 1
     )
   WHERE p.id = OLD.prospect_id
     AND p.contact_id = OLD.contact_id;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.prospect_opportunity_contacts_replace_principal() IS
  'Quando o principal sai da oportunidade, outro contato dela assume (ou nenhum), 09/10/2026.';

CREATE TRIGGER prospect_opportunity_contacts_replace_principal
  AFTER DELETE ON public.prospect_opportunity_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_opportunity_contacts_replace_principal();

-- Card gravado com `contact_id` (MCP instalado, seed, cliente antigo): a pessoa entra nos
-- contatos da oportunidade sozinha. Sem papel — quem conduz classifica. O gatilho olha todo
-- UPDATE, não só `UPDATE OF contact_id`: quando quem muda o `contact_id` é o trigger BEFORE
-- (MCP editando uma oportunidade sem principal), a coluna não está no SET e `OF` não dispararia.
CREATE OR REPLACE FUNCTION public.prospects_link_opportunity_contact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.contact_id IS NOT DISTINCT FROM OLD.contact_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.prospect_opportunity_contacts (prospect_id, contact_id, tenant_id, created_by)
  VALUES (NEW.id, NEW.contact_id, NEW.tenant_id, NEW.created_by)
  ON CONFLICT (prospect_id, contact_id) DO NOTHING;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.prospects_link_opportunity_contact() IS
  'Garante que o contato principal do card esteja entre os contatos da oportunidade (09/10/2026).';

CREATE TRIGGER prospects_link_opportunity_contact
  AFTER INSERT OR UPDATE ON public.prospects
  FOR EACH ROW
  WHEN (NEW.contact_id IS NOT NULL)
  EXECUTE FUNCTION public.prospects_link_opportunity_contact();
