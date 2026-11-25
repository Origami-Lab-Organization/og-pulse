-- US-0045 — a empresa é o cadastro do cliente (ADR-0056).
--
-- Decisão do Victor (24 e 25/11/2026): um cadastro só, a empresa. Cliente é a empresa com Ganho
-- ou com projeto; orçamento não cria cliente. A linha de `clients` continua existindo, porque
-- projetos, orçamentos, stakeholders, reembolsos e a conciliação do Conta Azul apontam para ela,
-- mas deixa de ser digitada: nasce da empresa no Ganho e copia dela a identificação e o endereço.
--
-- Vale daqui para frente. As empresas que já têm Ganho sem cliente e os clientes sem empresa são
-- regularizados caso a caso na US-0052.

-- 1. O cliente da empresa ------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.garantir_cliente_da_empresa(p_empresa uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_empresa public.prospect_companies%ROWTYPE;
  v_cliente uuid;
  v_cnpj text;
  v_endereco jsonb;
BEGIN
  SELECT * INTO v_empresa FROM public.prospect_companies WHERE id = p_empresa FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_empresa.client_id IS NOT NULL THEN
    RETURN v_empresa.client_id;
  END IF;

  -- Cliente já cadastrado com o mesmo CNPJ no tenant: liga em vez de duplicar.
  v_cnpj := nullif(regexp_replace(coalesce(v_empresa.cnpj, ''), '\D', '', 'g'), '');
  IF v_cnpj IS NOT NULL THEN
    SELECT c.id INTO v_cliente
      FROM public.clients c
     WHERE c.tenant_id = v_empresa.tenant_id
       AND nullif(regexp_replace(coalesce(c.cnpj, ''), '\D', '', 'g'), '') = v_cnpj
     ORDER BY c.created_at
     LIMIT 1;
  END IF;

  IF v_cliente IS NULL THEN
    v_endereco := v_empresa.receita -> 'endereco';
    INSERT INTO public.clients (
      tenant_id, company_name, trading_name, cnpj, website, segment,
      cep, logradouro, numero, complemento, bairro, cidade, estado
    ) VALUES (
      v_empresa.tenant_id,
      coalesce(nullif(btrim(v_empresa.razao_social), ''), v_empresa.name),
      coalesce(nullif(btrim(v_empresa.nome_fantasia), ''), v_empresa.name),
      v_cnpj,
      v_empresa.website,
      v_empresa.segment,
      nullif(regexp_replace(coalesce(v_endereco ->> 'cep', ''), '\D', '', 'g'), ''),
      v_endereco ->> 'logradouro',
      v_endereco ->> 'numero',
      v_endereco ->> 'complemento',
      v_endereco ->> 'bairro',
      v_endereco ->> 'municipio',
      v_endereco ->> 'uf'
    )
    RETURNING id INTO v_cliente;
  END IF;

  UPDATE public.prospect_companies SET client_id = v_cliente WHERE id = v_empresa.id;
  RETURN v_cliente;
END;
$$;

COMMENT ON FUNCTION public.garantir_cliente_da_empresa(uuid) IS
  'US-0045 (ADR-0056): devolve o cliente da empresa, ligando o de mesmo CNPJ ou criando-o com os '
  'dados da empresa. Só para gatilhos: sem EXECUTE para quem usa o app.';

REVOKE ALL ON FUNCTION public.garantir_cliente_da_empresa(uuid) FROM PUBLIC, anon, authenticated;

-- 2. O Ganho torna a empresa cliente -------------------------------------------------------------
--
-- Vale para o Ganho pela tela e pelo MCP de Prospecção (`mark_contact_won`), que só muda a etapa.
-- Definer porque quem registra o Ganho (`prospeccao:editar`) não precisa poder escrever na
-- carteira; os dados vêm da linha que a RLS da Oportunidade já deixou gravar.

CREATE OR REPLACE FUNCTION public.prospects_ganho_torna_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.stage = 'ganho'
     AND NEW.company_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM 'ganho') THEN
    PERFORM public.garantir_cliente_da_empresa(NEW.company_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospects_ganho_torna_cliente ON public.prospects;
CREATE TRIGGER trg_prospects_ganho_torna_cliente
AFTER INSERT OR UPDATE OF stage ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.prospects_ganho_torna_cliente();

-- 3. O cliente copia a identificação e o endereço da empresa -------------------------------------
--
-- Razão social só é trocada quando a empresa tem uma (empresa cadastrada só pelo nome não apaga a
-- do cliente). O endereço vem da Receita (estabelecimento da matriz); ninguém digita.

CREATE OR REPLACE FUNCTION public.prospect_companies_sincroniza_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_endereco jsonb := NEW.receita -> 'endereco';
BEGIN
  UPDATE public.clients c
     SET company_name = coalesce(nullif(btrim(NEW.razao_social), ''), c.company_name),
         trading_name = coalesce(nullif(btrim(NEW.nome_fantasia), ''), NEW.name),
         cnpj = coalesce(nullif(regexp_replace(coalesce(NEW.cnpj, ''), '\D', '', 'g'), ''), c.cnpj),
         website = coalesce(nullif(btrim(NEW.website), ''), c.website),
         cep = coalesce(nullif(regexp_replace(coalesce(v_endereco ->> 'cep', ''), '\D', '', 'g'), ''), c.cep),
         logradouro = coalesce(v_endereco ->> 'logradouro', c.logradouro),
         numero = coalesce(v_endereco ->> 'numero', c.numero),
         complemento = CASE WHEN v_endereco IS NULL THEN c.complemento ELSE v_endereco ->> 'complemento' END,
         bairro = coalesce(v_endereco ->> 'bairro', c.bairro),
         cidade = coalesce(v_endereco ->> 'municipio', c.cidade),
         estado = coalesce(v_endereco ->> 'uf', c.estado)
   WHERE c.id = NEW.client_id
     AND c.tenant_id = NEW.tenant_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospect_companies_sincroniza_cliente ON public.prospect_companies;
CREATE TRIGGER trg_prospect_companies_sincroniza_cliente
AFTER UPDATE OF name, razao_social, nome_fantasia, cnpj, website, receita, client_id
ON public.prospect_companies
FOR EACH ROW
WHEN (
  NEW.client_id IS NOT NULL
  AND (OLD.name, OLD.razao_social, OLD.nome_fantasia, OLD.cnpj, OLD.website, OLD.receita, OLD.client_id)
      IS DISTINCT FROM
      (NEW.name, NEW.razao_social, NEW.nome_fantasia, NEW.cnpj, NEW.website, NEW.receita, NEW.client_id)
)
EXECUTE FUNCTION public.prospect_companies_sincroniza_cliente();
