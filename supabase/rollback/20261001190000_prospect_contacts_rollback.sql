-- Reversão de 20261001190000_prospect_contacts.sql (ADR-0045).
--
-- Os cards voltam a ser donos dos campos de contato:
--   * cards que já existiam antes da migração recebem de volta os valores de
--     `legado_contatos.prospects_antes_dos_contatos` — inclusive o que a união por
--     e-mail/LinkedIn tinha trocado pelo dado do card mais recente;
--   * cards criados depois ficam com a cópia que tinham (o dado da pessoa naquele momento);
--   * contatos criados na tela Contatos sem nenhum card SOMEM — não há onde guardá-los.
--     Exporte `public.prospect_contacts` antes, se precisar deles.
--
-- Edições de pessoa feitas depois da migração em cards ANTIGOS se perdem: a restauração
-- prefere o valor de antes. Sem BEGIN/COMMIT próprio: quem executa envolve com
-- psql --single-transaction.

DROP TRIGGER IF EXISTS prospect_contacts_propagate ON public.prospect_contacts;
DROP TRIGGER IF EXISTS prospects_push_contact ON public.prospects;
DROP TRIGGER IF EXISTS prospects_link_contact ON public.prospects;
DROP FUNCTION IF EXISTS public.prospect_contacts_propagate();
DROP FUNCTION IF EXISTS public.prospects_push_contact();
DROP FUNCTION IF EXISTS public.prospects_link_contact();

ALTER TABLE public.prospects DISABLE TRIGGER update_prospects_updated_at;

UPDATE public.prospects p
   SET contact_name  = a.contact_name,
       contact_role  = a.contact_role,
       contact_email = a.contact_email,
       contact_phone = a.contact_phone,
       linkedin_url  = a.linkedin_url,
       instagram_url = a.instagram_url
  FROM legado_contatos.prospects_antes_dos_contatos a
 WHERE a.id = p.id;

ALTER TABLE public.prospects ENABLE TRIGGER update_prospects_updated_at;

DROP INDEX IF EXISTS public.prospects_contact_idx;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS contact_id;

COMMENT ON COLUMN public.prospects.contact_name IS NULL;

DROP TABLE IF EXISTS public.prospect_contacts;
DROP FUNCTION IF EXISTS public.prospect_contacts_normalize();

DROP TABLE IF EXISTS legado_contatos.prospects_antes_dos_contatos;
DROP SCHEMA IF EXISTS legado_contatos;
