-- Retrato da Receita sem regime tributário não apaga o regime gravado (13/10/2026).
--
-- A consulta de CNPJ ganhou uma reserva: quando a BrasilAPI falha, a tela e o MCP consultam a
-- CNPJá aberta (src/services/cnpjLookupService.ts). Ela traz o mesmo cadastro, menos o regime.
-- Sem esta mudança, "Atualizar da Receita" pela reserva gravaria regime nulo por cima do
-- "Lucro Real (2024)" que veio antes, e a empresa perderia o sinal da Lei do Bem.
--
-- Regra: retrato sem regime nenhum (nem o do ano, nem histórico) mantém regime_tributario,
-- regime_tributario_ano e receita->'regimes' como estavam. Retrato com regime substitui, como
-- antes. O resto da função é o de 20260929140000, sem mudança.
--
-- Rollback: supabase/rollback/20261013130000_receita_preserva_regime_rollback.sql

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
  -- Retrato sem regime nenhum (a CNPJá não informa): o que já estava gravado fica.
  sem_regime boolean := p_receita->>'regimeTributario' IS NULL
    AND jsonb_array_length(COALESCE(p_receita->'detalhes'->'regimes', '[]'::jsonb)) = 0;
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
         regime_tributario     = CASE WHEN sem_regime THEN c.regime_tributario
                                      ELSE p_receita->>'regimeTributario' END,
         regime_tributario_ano = CASE WHEN sem_regime THEN c.regime_tributario_ano
                                      ELSE (p_receita->>'regimeTributarioAno')::integer END,
         receita               = CASE WHEN sem_regime AND c.receita ? 'regimes'
                                      THEN jsonb_set(p_receita->'detalhes', '{regimes}', c.receita->'regimes')
                                      ELSE p_receita->'detalhes' END,
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
