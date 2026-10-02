-- Reversão de 20261002120000_prospect_une_cards_duplicados.sql.
--
-- Recria os cards removidos e as pessoas unidas a partir de `legado_contatos.uniao_*`, devolve
-- a cada um as atividades (com o número de toque original), tarefas, histórico, orçamento,
-- projeto e vínculo de sócio, e restaura o card que ficou como estava antes da união.
-- O que foi registrado DEPOIS da união no card que ficou continua nele. Sem BEGIN/COMMIT
-- próprio: quem executa envolve com psql --single-transaction.

DROP INDEX IF EXISTS public.prospects_um_card_aberto_key;
DROP TRIGGER IF EXISTS prospects_um_card_aberto ON public.prospects;
DROP FUNCTION IF EXISTS public.prospects_um_card_aberto();

-- Pessoas: a removida volta, e a que ficou volta ao que era (a cópia desce pelos triggers).
INSERT INTO public.prospect_contacts
SELECT (jsonb_populate_record(NULL::public.prospect_contacts, r.pessoa_removida)).*
  FROM legado_contatos.uniao_pessoas r;

UPDATE public.prospect_contacts f
   SET role = a.role, email = a.email, phone = a.phone,
       linkedin_url = a.linkedin_url, instagram_url = a.instagram_url
  FROM (
    SELECT DISTINCT ON (fica) (jsonb_populate_record(NULL::public.prospect_contacts, pessoa_que_fica_antes)).*
      FROM legado_contatos.uniao_pessoas ORDER BY fica
  ) a
 WHERE f.id = a.id;

-- Cards: recriados inteiros, sem disparar histórico, cadência nem regras de desfecho.
ALTER TABLE public.prospects DISABLE TRIGGER USER;

INSERT INTO public.prospects
SELECT (jsonb_populate_record(NULL::public.prospects, c.card_perdedor)).*
  FROM legado_contatos.uniao_cards c;

UPDATE public.prospects p
   SET estimated_value = a.estimated_value, lever = a.lever, owner_id = a.owner_id,
       first_touch_at = a.first_touch_at, activity_count = a.activity_count,
       notes = a.notes, updated_at = a.updated_at
  FROM (
    SELECT (jsonb_populate_record(NULL::public.prospects, card_antes)).*
      FROM legado_contatos.uniao_sobreviventes
  ) a
 WHERE p.id = a.id;

ALTER TABLE public.prospects ENABLE TRIGGER USER;

-- Atividades: de volta ao card e ao número de antes, em duas passadas pelo índice único.
UPDATE public.prospect_activities a
   SET prospect_id = f.prospect_id_antes, sequence_no = 1000000 + f.sequence_no_antes
  FROM legado_contatos.uniao_filhos f
 WHERE f.tabela = 'prospect_activities' AND f.id = a.id;

UPDATE public.prospect_activities a
   SET sequence_no = a.sequence_no - 1000000
  FROM legado_contatos.uniao_filhos f
 WHERE f.tabela = 'prospect_activities' AND f.id = a.id AND a.sequence_no > 1000000;

UPDATE public.prospect_tasks t SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.uniao_filhos f WHERE f.tabela = 'prospect_tasks' AND f.id = t.id;
UPDATE public.prospect_stage_changes s SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.uniao_filhos f WHERE f.tabela = 'prospect_stage_changes' AND f.id = s.id;
UPDATE public.prospect_company_partners s SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.uniao_filhos f WHERE f.tabela = 'prospect_company_partners' AND f.id = s.id;
UPDATE public.budgets b SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.uniao_filhos f WHERE f.tabela = 'budgets' AND f.id = b.id;
UPDATE public.projects j SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.uniao_filhos f WHERE f.tabela = 'projects' AND f.id = j.id;

DROP TABLE IF EXISTS legado_contatos.uniao_filhos;
DROP TABLE IF EXISTS legado_contatos.uniao_pessoas;
DROP TABLE IF EXISTS legado_contatos.uniao_sobreviventes;
DROP TABLE IF EXISTS legado_contatos.uniao_cards;
