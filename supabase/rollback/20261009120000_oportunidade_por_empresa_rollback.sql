-- Reversão de 20261009120000_oportunidade_por_empresa.sql.
--
-- Recria os cards unidos a partir de `legado_contatos.oportunidade_*`, devolve a cada um as
-- atividades (com o número de toque original), tarefas, histórico, orçamento, projeto e
-- vínculo de sócio, restaura a oportunidade que ficou como estava antes da união e volta a
-- exigir uma pessoa por card. Sem BEGIN/COMMIT próprio: quem executa envolve com
-- psql --single-transaction.
--
-- Perda de dado, por construção:
--   * papéis dos contatos e contatos acrescentados depois a cada oportunidade (exportar
--     `public.prospect_opportunity_contacts` antes);
--   * "com quem" de cada atividade (exportar `public.prospect_activities.contact_id`);
--   * oportunidades criadas depois SEM contato não cabem no modelo antigo: precisam ganhar um
--     contato ou ser excluídas antes, senão o NOT NULL abaixo recusa a reversão;
--   * se, depois da migração, alguém abriu duas oportunidades em andamento com o mesmo contato
--     principal, o índice "um card aberto por pessoa" não é recriado (aviso no NOTICE).

DROP TRIGGER IF EXISTS prospects_link_opportunity_contact ON public.prospects;
DROP FUNCTION IF EXISTS public.prospects_link_opportunity_contact();
DROP TRIGGER IF EXISTS prospect_opportunity_contacts_replace_principal ON public.prospect_opportunity_contacts;
DROP FUNCTION IF EXISTS public.prospect_opportunity_contacts_replace_principal();
DROP TRIGGER IF EXISTS prospect_opportunity_contacts_set_principal ON public.prospect_opportunity_contacts;
DROP FUNCTION IF EXISTS public.prospect_opportunity_contacts_set_principal();

-- Cards: recriados inteiros, sem disparar histórico, cadência nem regras de desfecho.
ALTER TABLE public.prospects DISABLE TRIGGER USER;

INSERT INTO public.prospects
SELECT (jsonb_populate_record(NULL::public.prospects, c.card_perdedor)).*
  FROM legado_contatos.oportunidade_cards c;

UPDATE public.prospects p
   SET estimated_value = a.estimated_value, lever = a.lever, owner_id = a.owner_id,
       first_touch_at = a.first_touch_at,
       activity_count = GREATEST(a.activity_count, COALESCE((
         SELECT max(x.sequence_no) FROM public.prospect_activities x
          WHERE x.prospect_id = p.id
            AND NOT EXISTS (SELECT 1 FROM legado_contatos.oportunidade_filhos f
                             WHERE f.tabela = 'prospect_activities' AND f.id = x.id)), 0)),
       notes = a.notes, updated_at = a.updated_at
  FROM (
    SELECT (jsonb_populate_record(NULL::public.prospects, card_antes)).*
      FROM legado_contatos.oportunidade_sobreviventes
  ) a
 WHERE p.id = a.id;

ALTER TABLE public.prospects ENABLE TRIGGER USER;

-- Atividades: de volta ao card e ao número de antes, em duas passadas pelo índice único.
UPDATE public.prospect_activities a
   SET prospect_id = f.prospect_id_antes, sequence_no = 1000000 + f.sequence_no_antes
  FROM legado_contatos.oportunidade_filhos f
 WHERE f.tabela = 'prospect_activities' AND f.id = a.id;

UPDATE public.prospect_activities a
   SET sequence_no = a.sequence_no - 1000000
  FROM legado_contatos.oportunidade_filhos f
 WHERE f.tabela = 'prospect_activities' AND f.id = a.id AND a.sequence_no > 1000000;

ALTER TABLE public.prospect_tasks DISABLE TRIGGER update_prospect_tasks_updated_at;
ALTER TABLE public.prospect_company_partners DISABLE TRIGGER update_prospect_company_partners_updated_at;
UPDATE public.prospect_tasks t SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.oportunidade_filhos f WHERE f.tabela = 'prospect_tasks' AND f.id = t.id;
UPDATE public.prospect_stage_changes s SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.oportunidade_filhos f WHERE f.tabela = 'prospect_stage_changes' AND f.id = s.id;
UPDATE public.prospect_company_partners s SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.oportunidade_filhos f WHERE f.tabela = 'prospect_company_partners' AND f.id = s.id;
UPDATE public.budgets b SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.oportunidade_filhos f WHERE f.tabela = 'budgets' AND f.id = b.id;
UPDATE public.projects j SET prospect_id = f.prospect_id_antes
  FROM legado_contatos.oportunidade_filhos f WHERE f.tabela = 'projects' AND f.id = j.id;
ALTER TABLE public.prospect_company_partners ENABLE TRIGGER update_prospect_company_partners_updated_at;
ALTER TABLE public.prospect_tasks ENABLE TRIGGER update_prospect_tasks_updated_at;

-- Vínculos, colunas e guardas novos.
DROP TABLE public.prospect_opportunity_contacts;

DROP TRIGGER IF EXISTS prospect_activities_contact_same_tenant ON public.prospect_activities;
DROP TRIGGER IF EXISTS prospect_company_partners_contact_same_tenant ON public.prospect_company_partners;
DROP FUNCTION IF EXISTS public.prospect_contact_same_tenant();
DROP FUNCTION IF EXISTS public.prospect_opportunity_contacts_guard();

ALTER TABLE public.prospect_activities DROP COLUMN contact_id;
ALTER TABLE public.prospect_company_partners DROP COLUMN contact_id;

-- O card volta a exigir pessoa (ver o cabeçalho: oportunidade sem contato bloqueia aqui).
ALTER TABLE public.prospects ALTER COLUMN contact_name SET NOT NULL;
ALTER TABLE public.prospects ALTER COLUMN contact_id SET NOT NULL;

-- prospects_link_contact como em 20261001190000.
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

-- Um card em andamento por pessoa, como em 20261002120000.
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

CREATE TRIGGER prospects_um_card_aberto
  BEFORE INSERT OR UPDATE OF stage, contact_id ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.prospects_um_card_aberto();

DO $$
BEGIN
  IF EXISTS (
    SELECT contact_id FROM public.prospects
     WHERE stage IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado')
     GROUP BY contact_id HAVING count(*) > 1
  ) THEN
    RAISE NOTICE 'Índice prospects_um_card_aberto_key NÃO recriado: há pessoa com dois cards em andamento.';
  ELSE
    CREATE UNIQUE INDEX prospects_um_card_aberto_key ON public.prospects (contact_id)
      WHERE stage IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado');
  END IF;
END;
$$;

DROP TABLE IF EXISTS legado_contatos.oportunidade_filhos;
DROP TABLE IF EXISTS legado_contatos.oportunidade_sobreviventes;
DROP TABLE IF EXISTS legado_contatos.oportunidade_cards;
