-- Prospecção — cadastro de empresa prospectada, reutilizável entre contatos.
--
-- Decisão de 15/09/2026 (Guilherme): empresa fria NÃO entra em `clients`. Um prospect não
-- é cliente; colocá-lo lá polui a carteira, a listagem, os indicadores e a capacidade
-- `cliente:ler` desde o primeiro toque — e depois não há como distinguir quem comprou de
-- quem só foi abordado. Tabela própria e leve; `client_id` liga as duas quando a empresa
-- já é cliente, para os dados básicos virem de lá em vez de serem redigitados.
--
-- Regras:
--   * deduplicação por CNPJ OU LinkedIn, como a planilha já fazia. São índices únicos
--     PARCIAIS: a maioria das empresas entra só com nome, e um único NULL não pode
--     bloquear o cadastro seguinte;
--   * nome NÃO é único — duas empresas podem se chamar igual. Ganha índice de busca; a
--     tela avisa sobre homônimo sem bloquear;
--   * `ring` (Anel) e `tier` (Tier) são texto livre, editáveis no próprio card do contato.
--     Não viram cadastro no Portal do Admin: a decisão foi manter simples e sem tela nova.
--     Por morarem na empresa, editá-los num contato vale para todos os contatos dela —
--     que é o ponto de a empresa ser reutilizável;
--   * sem DELETE: empresa referenciada por contato não some. A limpeza, se um dia fizer
--     falta, vira inativação como no catálogo (ADR-0003).
--
-- Rollback: supabase/rollback/20260915110000_prospect_companies_rollback.sql

CREATE TABLE public.prospect_companies (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  cnpj         text,
  linkedin_url text,
  website      text,
  segment      text,
  ring         text,
  tier         text,
  client_id    uuid        REFERENCES public.clients(id),
  notes        text,
  created_by   uuid        REFERENCES public.employees(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_companies_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT prospect_companies_name_length CHECK (char_length(name) <= 160),
  -- Guardado só com dígitos, como em `clients`; a máscara é da interface.
  CONSTRAINT prospect_companies_cnpj_digits CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  CONSTRAINT prospect_companies_ring_length CHECK (ring IS NULL OR char_length(ring) <= 60),
  CONSTRAINT prospect_companies_tier_length CHECK (tier IS NULL OR char_length(tier) <= 60)
);

COMMENT ON TABLE public.prospect_companies IS
  'Empresas do pipeline de prospecção (15/09/2026). Separadas de `clients` de propósito: '
  'prospect frio não é carteira. Reutilizável entre contatos — cadastra-se uma vez e os '
  'contatos seguintes puxam os dados. Vira cliente só quando a oportunidade é criada.';

COMMENT ON COLUMN public.prospect_companies.ring IS
  'Anel — segmentação de proximidade da empresa. Texto livre, editável no card do contato.';
COMMENT ON COLUMN public.prospect_companies.tier IS
  'Tier — segmentação de porte/prioridade da empresa. Texto livre, editável no card.';
COMMENT ON COLUMN public.prospect_companies.client_id IS
  'Preenchido quando a empresa já existe em `clients`: os dados básicos passam a vir de lá.';

-- Deduplicação: CNPJ ou LinkedIn, por tenant. Parciais porque a maioria entra sem nenhum
-- dos dois, e índice único comum trataria os NULLs como distintos sem nunca ajudar.
CREATE UNIQUE INDEX prospect_companies_tenant_cnpj_key
  ON public.prospect_companies (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;

CREATE UNIQUE INDEX prospect_companies_tenant_linkedin_key
  ON public.prospect_companies (tenant_id, lower(btrim(linkedin_url)))
  WHERE linkedin_url IS NOT NULL;

-- Busca por nome no combobox de cadastro de contato.
CREATE INDEX prospect_companies_tenant_name_idx
  ON public.prospect_companies (tenant_id, lower(btrim(name)));

CREATE TRIGGER update_prospect_companies_updated_at
  BEFORE UPDATE ON public.prospect_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.prospect_companies ENABLE ROW LEVEL SECURITY;

-- Explícito: policy que passa com privilégio faltando dá "permission denied" difícil de
-- diagnosticar (lição registrada pelo time em 20260910100000).
GRANT SELECT, INSERT, UPDATE ON public.prospect_companies TO authenticated;

CREATE POLICY "Prospeccao readers can view prospect companies" ON public.prospect_companies
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Prospeccao editors can insert prospect companies" ON public.prospect_companies
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

-- USING e WITH CHECK: quem edita não pode mover a linha para outro tenant.
CREATE POLICY "Prospeccao editors can update prospect companies" ON public.prospect_companies
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));
