-- Prospecção — dados da Receita na empresa e quadro de sócios (29/09/2026).
--
-- Pedido de 29/09/2026 (Italo): a busca por CNPJ traz o máximo da empresa e já grava tudo.
-- O dado que mais pesa para a Origami é o REGIME TRIBUTÁRIO: Lei do Bem só alcança empresa
-- no Lucro Real, e a Receita informa a forma de tributação por ano. Porte, abertura e
-- situação cadastral completam o retrato para financiamento de inovação e software (ADR-0041).
--
-- Duas decisões do mesmo dia:
--   - sócios ficam na EMPRESA, não viram contato sozinhos: quem conduz escolhe quem abordar
--     ("Virar contato" liga o sócio ao contato por `prospect_id`);
--   - os selos (Lei do Bem, porte, situação) aparecem só na ficha — sem filtro novo.
--
-- Colunas tipadas para o que vira selo; o resto do retrato (endereço, CNAEs, histórico de
-- regime, telefones) fica em `receita` jsonb, que a tela só exibe.
--
-- MINIMIZAÇÃO (LGPD, ADR-0041): do sócio pessoa física guardamos nome, qualificação e data
-- de entrada. Nunca faixa etária nem CPF — a Receita entrega o CPF mascarado, e mascarado ou
-- não é dado pessoal que o comercial não usa. CNPJ só de sócio que é outra empresa.
-- Redes sociais dos sócios não são buscadas: o LinkedIn é colado pela pessoa, a partir do
-- link de busca que a tela monta (raspagem violaria os termos do LinkedIn).
--
-- Acesso: `prospeccao:ler` / `prospeccao:editar`, como o resto do módulo — sem capacidade
-- nova (capability-matrix §4).
--
-- Rollback: supabase/rollback/20260929140000_prospect_company_receita_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Retrato da Receita na empresa
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS razao_social          text,
  ADD COLUMN IF NOT EXISTS nome_fantasia         text,
  ADD COLUMN IF NOT EXISTS porte                 text,
  ADD COLUMN IF NOT EXISTS capital_social        numeric(18, 2),
  ADD COLUMN IF NOT EXISTS data_abertura         date,
  ADD COLUMN IF NOT EXISTS situacao_cadastral    text,
  ADD COLUMN IF NOT EXISTS regime_tributario     text,
  ADD COLUMN IF NOT EXISTS regime_tributario_ano integer,
  ADD COLUMN IF NOT EXISTS receita               jsonb,
  ADD COLUMN IF NOT EXISTS receita_consultada_em timestamptz;

ALTER TABLE public.prospect_companies
  ADD CONSTRAINT prospect_companies_razao_social_length
    CHECK (razao_social IS NULL OR char_length(razao_social) <= 300),
  ADD CONSTRAINT prospect_companies_capital_social_valid
    CHECK (capital_social IS NULL OR capital_social >= 0),
  ADD CONSTRAINT prospect_companies_regime_ano_valid
    CHECK (regime_tributario_ano IS NULL OR regime_tributario_ano BETWEEN 1990 AND 2100);

COMMENT ON COLUMN public.prospect_companies.regime_tributario IS
  'Forma de tributação do ano mais recente informado pela Receita (LUCRO REAL, LUCRO '
  'PRESUMIDO...). É o filtro da Lei do Bem, que só alcança o Lucro Real. NULL = a Receita não '
  'informou — confirmar na conversa, não é "não elegível".';
COMMENT ON COLUMN public.prospect_companies.porte IS
  'Porte na Receita: MICRO EMPRESA, EMPRESA DE PEQUENO PORTE ou DEMAIS.';
COMMENT ON COLUMN public.prospect_companies.receita IS
  'Resto do retrato da Receita, só exibido: natureza jurídica, matriz/filial, CNAEs, histórico '
  'de regime por ano, Simples/MEI, endereço, telefones e e-mail de cadastro.';
COMMENT ON COLUMN public.prospect_companies.receita_consultada_em IS
  'Última consulta à Receita (BrasilAPI). Os dados valem até esta data.';

-- ---------------------------------------------------------------------------
-- 2. Quadro de sócios
-- ---------------------------------------------------------------------------

CREATE TABLE public.prospect_company_partners (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id                 uuid        NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  nome                       text        NOT NULL,
  qualificacao               text,
  data_entrada               date,
  tipo                       text        NOT NULL DEFAULT 'pessoa',
  cnpj                       text,
  representante_nome         text,
  representante_qualificacao text,
  linkedin_url               text,
  instagram_url              text,
  telefone                   text,
  prospect_id                uuid        REFERENCES public.prospects(id) ON DELETE SET NULL,
  ativo                      boolean     NOT NULL DEFAULT true,
  fonte                      text        NOT NULL DEFAULT 'receita_qsa',
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prospect_company_partners_nome_valid
    CHECK (char_length(btrim(nome)) BETWEEN 1 AND 200),
  CONSTRAINT prospect_company_partners_tipo_valid
    CHECK (tipo IN ('pessoa', 'empresa', 'estrangeiro')),
  -- CNPJ só de sócio-empresa: de pessoa física, nenhum documento é guardado.
  CONSTRAINT prospect_company_partners_cnpj_only_company
    CHECK (cnpj IS NULL OR (tipo = 'empresa' AND cnpj ~ '^[0-9]{14}$')),
  CONSTRAINT prospect_company_partners_linkedin_length
    CHECK (linkedin_url IS NULL OR char_length(linkedin_url) <= 300),
  CONSTRAINT prospect_company_partners_instagram_length
    CHECK (instagram_url IS NULL OR char_length(instagram_url) <= 300),
  CONSTRAINT prospect_company_partners_telefone_length
    CHECK (telefone IS NULL OR char_length(telefone) <= 40),
  CONSTRAINT prospect_company_partners_fonte_valid
    CHECK (fonte IN ('receita_qsa', 'manual'))
);

COMMENT ON TABLE public.prospect_company_partners IS
  'Sócios e representantes da empresa prospectada, do QSA da Receita (29/09/2026). Ficam na '
  'empresa; viram contato só quando alguém escolhe ("Virar contato" preenche prospect_id). '
  'Minimização LGPD: sem CPF e sem faixa etária (ADR-0041).';
COMMENT ON COLUMN public.prospect_company_partners.ativo IS
  'false = saiu do quadro societário na última consulta. Não apaga: o LinkedIn colado e o '
  'contato ligado continuam valendo como histórico.';
COMMENT ON COLUMN public.prospect_company_partners.linkedin_url IS
  'Perfil do sócio, colado pela pessoa a partir da busca por nome e empresa. Nunca raspado.';
COMMENT ON COLUMN public.prospect_company_partners.telefone IS
  'Telefone do sócio, informado por quem conduz (cartão, assinatura, conversa). A Receita não '
  'publica telefone de pessoa, e nenhuma fonte automática preenche este campo.';

-- Um sócio por nome na empresa: é a chave da atualização (reconsultar não duplica).
CREATE UNIQUE INDEX prospect_company_partners_company_nome_key
  ON public.prospect_company_partners (company_id, lower(btrim(nome)));

CREATE INDEX prospect_company_partners_tenant_idx
  ON public.prospect_company_partners (tenant_id);

CREATE TRIGGER update_prospect_company_partners_updated_at
  BEFORE UPDATE ON public.prospect_company_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- O tenant vem SEMPRE da empresa, e o contato ligado tem de ser dela: parâmetro de cliente
-- não escolhe tenant (ADR-0021), e sócio de uma conta não aponta para contato de outra.
CREATE OR REPLACE FUNCTION public.prospect_company_partners_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  empresa_tenant uuid;
BEGIN
  SELECT tenant_id INTO empresa_tenant FROM public.prospect_companies WHERE id = NEW.company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa de prospecção não encontrada.' USING ERRCODE = 'PU001';
  END IF;
  NEW.tenant_id := empresa_tenant;

  IF NEW.prospect_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = NEW.prospect_id AND p.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'O contato ligado ao sócio precisa ser desta empresa.' USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospect_company_partners_guard() IS
  'Herda o tenant da empresa e recusa ligar o sócio a contato de outra empresa.';

CREATE TRIGGER prospect_company_partners_guard
  BEFORE INSERT OR UPDATE ON public.prospect_company_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_company_partners_guard();

-- ---------------------------------------------------------------------------
-- 3. RLS — a mesma da empresa
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospect_company_partners ENABLE ROW LEVEL SECURITY;

-- Explícito: policy que passa com privilégio faltando dá "permission denied" (20260910100000).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_company_partners TO authenticated;

CREATE POLICY "Prospeccao readers can view company partners" ON public.prospect_company_partners
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Prospeccao editors can insert company partners" ON public.prospect_company_partners
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

CREATE POLICY "Prospeccao editors can update company partners" ON public.prospect_company_partners
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

CREATE POLICY "Prospeccao editors can delete company partners" ON public.prospect_company_partners
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

-- ---------------------------------------------------------------------------
-- 4. Gravar o retrato — uma chamada, tudo ou nada
-- ---------------------------------------------------------------------------
--
-- A tela e o MCP mandam o retrato já traduzido (`src/lib/prospecting/receita.ts`) e esta
-- função grava empresa e sócios na mesma transação: consulta pela metade (empresa atualizada,
-- sócios não) não existe. SECURITY INVOKER: passa pela RLS de quem chama (prospeccao:editar).
--
-- Sócio é casado pelo nome (sem caixa nem espaço nas pontas): reconsultar atualiza
-- qualificação e datas sem tocar no LinkedIn colado nem no contato ligado. Quem saiu do
-- quadro fica `ativo = false`, não é apagado.
--
-- Nome, CNPJ e segmento da empresa só são preenchidos se estiverem vazios: o que a pessoa
-- escreveu vence o que a Receita diz.

CREATE OR REPLACE FUNCTION public.save_prospect_company_receita(
  p_company_id uuid,
  p_receita jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  socio jsonb;
  nomes text[] := ARRAY[]::text[];
BEGIN
  IF p_receita IS NULL OR p_receita->>'razaoSocial' IS NULL THEN
    RAISE EXCEPTION 'Retrato da Receita incompleto.' USING ERRCODE = 'PU001';
  END IF;

  UPDATE public.prospect_companies c
     SET razao_social          = p_receita->>'razaoSocial',
         nome_fantasia         = p_receita->>'nomeFantasia',
         porte                 = p_receita->>'porte',
         capital_social        = (p_receita->>'capitalSocial')::numeric,
         data_abertura         = (p_receita->>'dataAbertura')::date,
         situacao_cadastral    = p_receita->>'situacaoCadastral',
         regime_tributario     = p_receita->>'regimeTributario',
         regime_tributario_ano = (p_receita->>'regimeTributarioAno')::integer,
         receita               = p_receita->'detalhes',
         receita_consultada_em = now(),
         cnpj    = COALESCE(c.cnpj, NULLIF(regexp_replace(COALESCE(p_receita->>'cnpj', ''), '\D', '', 'g'), '')),
         segment = COALESCE(NULLIF(btrim(c.segment), ''), p_receita->>'segmento')
   WHERE c.id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada (ou sem permissão para editá-la).' USING ERRCODE = 'PU001';
  END IF;

  FOR socio IN SELECT * FROM jsonb_array_elements(COALESCE(p_receita->'socios', '[]'::jsonb))
  LOOP
    CONTINUE WHEN NULLIF(btrim(socio->>'nome'), '') IS NULL;
    nomes := nomes || lower(btrim(socio->>'nome'));

    INSERT INTO public.prospect_company_partners AS s (
      company_id, nome, qualificacao, data_entrada, tipo, cnpj,
      representante_nome, representante_qualificacao, ativo, fonte
    ) VALUES (
      p_company_id,
      btrim(socio->>'nome'),
      socio->>'qualificacao',
      (socio->>'dataEntrada')::date,
      COALESCE(socio->>'tipo', 'pessoa'),
      CASE WHEN socio->>'tipo' = 'empresa' THEN socio->>'cnpj' END,
      socio->>'representanteNome',
      socio->>'representanteQualificacao',
      true,
      'receita_qsa'
    )
    ON CONFLICT (company_id, lower(btrim(nome))) DO UPDATE
      SET qualificacao               = EXCLUDED.qualificacao,
          data_entrada               = EXCLUDED.data_entrada,
          tipo                       = EXCLUDED.tipo,
          cnpj                       = EXCLUDED.cnpj,
          representante_nome         = EXCLUDED.representante_nome,
          representante_qualificacao = EXCLUDED.representante_qualificacao,
          ativo                      = true;
  END LOOP;

  UPDATE public.prospect_company_partners
     SET ativo = false
   WHERE company_id = p_company_id
     AND fonte = 'receita_qsa'
     AND ativo
     AND NOT (lower(btrim(nome)) = ANY (nomes));
END;
$$;

COMMENT ON FUNCTION public.save_prospect_company_receita(uuid, jsonb) IS
  'Grava o retrato da Receita (ReceitaSnapshot de src/types/receita.ts) na empresa e no quadro '
  'de sócios, numa transação. Roda como quem chama, sob a RLS da Prospecção.';

REVOKE ALL ON FUNCTION public.save_prospect_company_receita(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_prospect_company_receita(uuid, jsonb) TO authenticated;
