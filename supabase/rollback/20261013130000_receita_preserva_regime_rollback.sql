-- Reversão de 20261013130000_receita_preserva_regime.sql: volta a função de 20260929140000,
-- em que o retrato sempre substitui o regime gravado.

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
