-- Prospecção — une os cards duplicados por erro e impede que voltem (02/10/2026).
--
-- Diagnóstico (pedido do Guilherme, card "Augusto · Distrimed" em Respondeu e em Reunião
-- feita ao mesmo tempo): a absorção das Oportunidades (20260929120000) só devolvia a
-- oportunidade ao contato de origem quando havia VÍNCULO explícito (`leads.prospect_id` ou
-- `prospects.converted_lead_id`). Oportunidade cadastrada à mão no Pipeline antigo para
-- alguém que também estava na Prospecção virou contato NOVO, na mesma empresa e com o mesmo
-- nome — a mesma pessoa com dois cards, um em cada etapa (screening -> respondeu,
-- qualification -> reuniao_feita). A união de contatos (20261001190000) não os juntou porque
-- só une pelo mesmo e-mail ou LinkedIn, e esses cards em geral não tinham.
--
-- O que conta como duplicata POR ERRO (e só isso é unido):
--   (a) card nascido da migração (`legado_oportunidades.de_para`, contato_existente = false)
--       e card que já existia, na mesma organização, mesma empresa e mesmo nome (sem caixa,
--       espaço nem acento), com pelo menos um dos dois em andamento;
--   (b) dois cards EM ANDAMENTO da mesma pessoa (`contact_id`) — a tela não deixa abrir o
--       segundo desde 01/10/2026, então só existe por migração.
-- Cards encerrados da mesma pessoa (perdeu em março, reabordada em setembro) são histórico e
-- ficam como estão. Grupos com dois orçamentos NÃO são unidos (um orçamento por card): ficam
-- listados no NOTICE para decisão manual.
--
-- Quem fica: o card mais avançado — Ganho > Qualificada > Reunião feita > Reunião agendada >
-- Respondeu > Em cadência > A abordar > Perda (card em andamento vence card perdido: alguém
-- ainda está trabalhando nele). Empate: o que veio da oportunidade (leva orçamento e valor),
-- depois o mais recente. O que sai entrega tudo ao que fica: atividades (renumeradas pela
-- data), tarefas, histórico de etapa, orçamento, projeto, vínculo de sócio, valor estimado,
-- alavanca, responsável e observações. A pessoa do card que sai, se ficar sem card, é unida
-- à do que fica (completa o que falta).
--
-- Tudo o que muda fica em `legado_contatos.uniao_*`, fora da API — base do rollback.
--
-- Daqui para frente: trigger `prospects_um_card_aberto` recusa, com mensagem para a tela,
-- abrir ou reabrir um segundo card em andamento para a mesma pessoa; o índice único parcial
-- é a garantia contra corrida (só é criado se nenhum grupo ficou pendente).
--
-- Rollback: supabase/rollback/20261002120000_prospect_une_cards_duplicados_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Os grupos de duplicatas
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _card ON COMMIT DROP AS
SELECT p.id,
       p.tenant_id,
       p.company_id,
       p.contact_id,
       p.stage,
       p.updated_at,
       translate(lower(btrim(p.contact_name)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') AS nome_n,
       p.stage IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado') AS aberto,
       EXISTS (
         SELECT 1 FROM legado_oportunidades.de_para d
          WHERE d.prospect_id = p.id AND NOT d.contato_existente
       ) AS da_migracao,
       CASE p.stage
         WHEN 'ganho' THEN 100 WHEN 'qualificado' THEN 60 WHEN 'reuniao_feita' THEN 50
         WHEN 'reuniao_agendada' THEN 40 WHEN 'respondeu' THEN 30 WHEN 'em_cadencia' THEN 20
         WHEN 'a_abordar' THEN 10 WHEN 'descartado' THEN 5 ELSE 0
       END AS avanco,
       row_number() OVER (ORDER BY p.id) AS n
  FROM public.prospects p;

CREATE TEMP TABLE _aresta ON COMMIT DROP AS
SELECT a.n AS a, b.n AS b
  FROM _card a
  JOIN _card b ON b.tenant_id = a.tenant_id AND b.company_id = a.company_id
              AND b.nome_n = a.nome_n AND b.n > a.n
 WHERE a.da_migracao <> b.da_migracao AND (a.aberto OR b.aberto)
UNION
SELECT a.n, b.n
  FROM _card a
  JOIN _card b ON b.contact_id = a.contact_id AND b.n > a.n
 WHERE a.aberto AND b.aberto;

ALTER TABLE _card ADD COLUMN grupo bigint;
UPDATE _card SET grupo = n;

-- Menor rótulo até estabilizar: A~B e B~C viram um grupo só.
DO $$
DECLARE
  mudou integer;
BEGIN
  LOOP
    UPDATE _card c SET grupo = m.g
      FROM (
        SELECT x, min(g) AS g FROM (
          SELECT e.a AS x, cb.grupo AS g FROM _aresta e JOIN _card cb ON cb.n = e.b
          UNION ALL
          SELECT e.b, ca.grupo FROM _aresta e JOIN _card ca ON ca.n = e.a
        ) t GROUP BY x
      ) m
     WHERE m.x = c.n AND m.g < c.grupo;
    GET DIAGNOSTICS mudou = ROW_COUNT;
    EXIT WHEN mudou = 0;
  END LOOP;
END;
$$;

CREATE TEMP TABLE _grupo ON COMMIT DROP AS
SELECT grupo,
       (array_agg(id ORDER BY avanco DESC, da_migracao DESC, updated_at DESC, id))[1] AS sobrevivente,
       count(*) AS cards,
       (SELECT count(*) FROM public.budgets b
         WHERE b.prospect_id = ANY (array_agg(c.id))) AS orcamentos
  FROM _card c
 GROUP BY grupo
HAVING count(*) > 1;

DO $$
DECLARE
  pendente record;
BEGIN
  FOR pendente IN
    SELECT g.grupo, string_agg(p.contact_name || ' (' || p.stage || ', ' || p.id || ')', '; ') AS cards
      FROM _grupo g JOIN _card c ON c.grupo = g.grupo JOIN public.prospects p ON p.id = c.id
     WHERE g.orcamentos > 1
     GROUP BY g.grupo
  LOOP
    RAISE NOTICE 'Não unido (dois orçamentos, decidir à mão): %', pendente.cards;
  END LOOP;
END;
$$;

DELETE FROM _grupo WHERE orcamentos > 1;

CREATE TEMP TABLE _uniao ON COMMIT DROP AS
SELECT c.id AS perdedor, g.sobrevivente
  FROM _card c
  JOIN _grupo g ON g.grupo = c.grupo
 WHERE c.id <> g.sobrevivente;

-- ---------------------------------------------------------------------------
-- 2. O arquivo: tudo o que vai mudar, como estava
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS legado_contatos;
REVOKE ALL ON SCHEMA legado_contatos FROM PUBLIC;

CREATE TABLE legado_contatos.uniao_cards AS
SELECT u.perdedor, u.sobrevivente, to_jsonb(p.*) AS card_perdedor
  FROM _uniao u JOIN public.prospects p ON p.id = u.perdedor;

CREATE TABLE legado_contatos.uniao_sobreviventes AS
SELECT p.id, to_jsonb(p.*) AS card_antes
  FROM public.prospects p
 WHERE p.id IN (SELECT sobrevivente FROM _grupo);

CREATE TABLE legado_contatos.uniao_filhos AS
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

-- Pessoa do card que sai, quando é outra e fica sem card: é unida à do que fica.
CREATE TEMP TABLE _pessoa_sai ON COMMIT DROP AS
SELECT DISTINCT pl.contact_id AS sai, ps.contact_id AS fica
  FROM _uniao u
  JOIN public.prospects pl ON pl.id = u.perdedor
  JOIN public.prospects ps ON ps.id = u.sobrevivente
 WHERE pl.contact_id <> ps.contact_id
   AND NOT EXISTS (
     SELECT 1 FROM public.prospects o
      WHERE o.contact_id = pl.contact_id AND o.id NOT IN (SELECT perdedor FROM _uniao)
   );

CREATE TABLE legado_contatos.uniao_pessoas AS
SELECT ps.sai, ps.fica, to_jsonb(c.*) AS pessoa_removida, to_jsonb(f.*) AS pessoa_que_fica_antes
  FROM _pessoa_sai ps
  JOIN public.prospect_contacts c ON c.id = ps.sai
  JOIN public.prospect_contacts f ON f.id = ps.fica;

COMMENT ON TABLE legado_contatos.uniao_cards IS
  'Cards removidos na união de duplicatas de 20261002120000, inteiros, e para qual card foram.';

-- ---------------------------------------------------------------------------
-- 3. A união
-- ---------------------------------------------------------------------------

-- Atividades: renumeradas pela data no card que fica. Em duas passadas, para o índice único
-- (prospect_id, sequence_no) nunca ver dois iguais no meio do caminho.
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

-- O card que fica completa o que falta com o que sai. O 1º toque é o mais antigo dos dois:
-- é união de dado, não edição — o trigger que o protege fica desligado só aqui.
ALTER TABLE public.prospects DISABLE TRIGGER prospects_protect_first_touch;

UPDATE public.prospects s
   SET estimated_value = COALESCE(s.estimated_value, d.estimated_value),
       lever           = COALESCE(s.lever, d.lever),
       owner_id        = COALESCE(s.owner_id, d.owner_id),
       first_touch_at  = LEAST(s.first_touch_at, d.first_touch_at),
       activity_count  = (SELECT count(*) FROM public.prospect_activities a WHERE a.prospect_id = s.id),
       notes           = NULLIF(concat_ws(E'\n\n', s.notes, d.notas), '')
  FROM (
    SELECT u.sobrevivente,
           (array_agg(p.estimated_value ORDER BY p.updated_at DESC) FILTER (WHERE p.estimated_value IS NOT NULL))[1] AS estimated_value,
           (array_agg(p.lever ORDER BY p.updated_at DESC) FILTER (WHERE p.lever IS NOT NULL))[1] AS lever,
           (array_agg(p.owner_id ORDER BY p.updated_at DESC) FILTER (WHERE p.owner_id IS NOT NULL))[1] AS owner_id,
           min(p.first_touch_at) AS first_touch_at,
           string_agg(
             'Unido de card duplicado (' || to_char(p.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || ')'
               || COALESCE(': ' || NULLIF(btrim(p.notes), ''), '.'),
             E'\n\n' ORDER BY p.created_at
           ) AS notas
      FROM _uniao u JOIN public.prospects p ON p.id = u.perdedor
     GROUP BY u.sobrevivente
  ) d
 WHERE s.id = d.sobrevivente;

ALTER TABLE public.prospects ENABLE TRIGGER prospects_protect_first_touch;

DELETE FROM public.prospects WHERE id IN (SELECT perdedor FROM _uniao);

-- Pessoas: a que sai some primeiro (libera e-mail e LinkedIn), e a que fica completa o que
-- falta com os dados dela — a cópia desce para os cards pelo trigger de 20261001190000.
DELETE FROM public.prospect_contacts WHERE id IN (SELECT sai FROM _pessoa_sai);

UPDATE public.prospect_contacts f
   SET role          = COALESCE(f.role, r.pessoa_removida->>'role'),
       email         = COALESCE(f.email, r.pessoa_removida->>'email'),
       phone         = COALESCE(f.phone, r.pessoa_removida->>'phone'),
       linkedin_url  = COALESCE(f.linkedin_url, r.pessoa_removida->>'linkedin_url'),
       instagram_url = COALESCE(f.instagram_url, r.pessoa_removida->>'instagram_url')
  FROM legado_contatos.uniao_pessoas r
 WHERE f.id = r.fica;

DO $$
DECLARE
  unidos integer;
  grupos integer;
BEGIN
  SELECT count(*) INTO unidos FROM _uniao;
  SELECT count(*) INTO grupos FROM _grupo;
  RAISE NOTICE 'Cards duplicados: % removidos, unidos em % cards.', unidos, grupos;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Daqui para frente: um card em andamento por pessoa
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prospects_um_card_aberto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_outro record;
BEGIN
  IF NEW.stage NOT IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado') THEN
    RETURN NEW;
  END IF;

  SELECT p.id, p.stage INTO v_outro
    FROM public.prospects p
   WHERE p.contact_id = NEW.contact_id
     AND p.id <> NEW.id
     AND p.stage IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado')
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Este contato já tem um card em andamento no Pipeline. Continue nele em vez de abrir outro.'
      USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospects_um_card_aberto() IS
  'Uma pessoa, um card em andamento (20261002120000): recusa abrir ou reabrir o segundo. '
  'ERRCODE PU001: mensagem escrita para o usuário final.';

-- Depois de prospects_link_contact (ordem alfabética): o contact_id já está resolvido.
CREATE TRIGGER prospects_um_card_aberto
  BEFORE INSERT OR UPDATE OF stage, contact_id ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.prospects_um_card_aberto();

-- A garantia contra dois cliques simultâneos. Só nasce se nenhum grupo ficou pendente (dois
-- orçamentos): senão a migração inteira cairia por um caso que pede decisão humana.
DO $$
BEGIN
  IF EXISTS (
    SELECT contact_id FROM public.prospects
     WHERE stage IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado')
     GROUP BY contact_id HAVING count(*) > 1
  ) THEN
    RAISE NOTICE 'Índice prospects_um_card_aberto_key NÃO criado: ainda há pessoa com dois cards em andamento.';
  ELSE
    CREATE UNIQUE INDEX prospects_um_card_aberto_key ON public.prospects (contact_id)
      WHERE stage IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado');
  END IF;
END;
$$;
