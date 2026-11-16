-- Empresas da Receita no Pulse (16/11/2026) — US-0001 e US-0002, ADR-0053.
--
-- A tela Comercial > Empresas passa a listar as médias e grandes empresas ativas do país,
-- a partir da base montada na VPS (Receita, RAIS e dívida ativa da PGFN). Esta migration
-- cria o lugar da cópia; quem enche é `scripts/receita/sincronizar-base.ts`.
--
--   * `receita_empresas`  uma linha por MATRIZ ATIVA, com o que a tela lista, filtra e ordena
--                         já calculado, inclusive a nota de fit prévio (regra única em
--                         src/lib/prospecting/fit.ts, ADR-0042 — calculada pelo script).
--   * `receita_cnaes` e `receita_naturezas`  descrições, fora da tabela grande de propósito.
--   * `receita_base`      data e total da última carga (uma linha só).
--
-- A base é pública e igual para todos os tenants: sem `tenant_id`. Quem lê precisa de
-- `prospeccao:ler` no próprio tenant. O predicado vai dentro de (SELECT ...) para ser
-- avaliado uma vez por consulta, e não uma vez em cada uma das 3 milhões de linhas.
--
-- Ninguém do app escreve aqui: não há policy de escrita. A carga entra com a connection
-- string do banco (dono das tabelas), fora do PostgREST.

CREATE TABLE IF NOT EXISTS public.receita_cnaes (
  codigo char(7) PRIMARY KEY,
  descricao text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.receita_naturezas (
  codigo char(4) PRIMARY KEY,
  descricao text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.receita_empresas (
  cnpj char(14) PRIMARY KEY,
  cnpj_basico char(8) NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  -- Nome fantasia, senão a razão social: o que a tela mostra e por onde ordena.
  nome_exibicao text NOT NULL,
  cnae_principal char(7) NOT NULL,
  cnaes_secundarios char(7)[] NOT NULL DEFAULT '{}',
  natureza_juridica char(4),
  capital_social numeric(18, 2),
  data_inicio_atividade date,
  municipio text,
  uf char(2),
  -- RAIS: funcionários somados de todas as unidades da empresa. Nulo = sem RAIS.
  funcionarios integer,
  unidades_com_funcionarios integer,
  filiais_ativas integer NOT NULL DEFAULT 0,
  socios integer NOT NULL DEFAULT 0,
  -- Dívida ativa da União (PGFN). Nulo = sem inscrição.
  divida_total numeric(18, 2),
  divida_em_cobranca numeric(18, 2),
  divida_ajuizada numeric(18, 2),
  inscricoes_divida integer,
  tem_email boolean NOT NULL DEFAULT false,
  tem_telefone boolean NOT NULL DEFAULT false,
  fit_previo smallint NOT NULL CHECK (fit_previo BETWEEN 0 AND 100),
  fit_frente text NOT NULL CHECK (fit_frente IN ('software', 'financiamento', 'consultoria')),
  -- US-0006: preenchido quando a tabela de receita por funcionário for aprovada.
  faturamento_estimado numeric(18, 2)
);

COMMENT ON TABLE public.receita_empresas IS
  'Matrizes ativas, médias e grandes, copiadas da base da Receita da VPS (ADR-0053). '
  'Carga: scripts/receita/sincronizar-base.ts. Leitura: listar_empresas_receita().';

CREATE TABLE IF NOT EXISTS public.receita_base (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  carregada_em timestamptz NOT NULL,
  total integer NOT NULL
);

-- Índices de ordenação: um por ordem da tela, na direção em que a função ordena.
-- A ordem padrão (maior fit) desempata por mais funcionários.
CREATE INDEX IF NOT EXISTS receita_empresas_fit_idx
  ON public.receita_empresas (fit_previo DESC, funcionarios DESC NULLS LAST, cnpj DESC);
CREATE INDEX IF NOT EXISTS receita_empresas_nome_idx
  ON public.receita_empresas (nome_exibicao, cnpj);
CREATE INDEX IF NOT EXISTS receita_empresas_func_desc_idx
  ON public.receita_empresas (funcionarios DESC NULLS LAST, cnpj DESC);
CREATE INDEX IF NOT EXISTS receita_empresas_func_asc_idx
  ON public.receita_empresas (funcionarios ASC NULLS LAST, cnpj ASC);
CREATE INDEX IF NOT EXISTS receita_empresas_abertura_idx
  ON public.receita_empresas (data_inicio_atividade ASC NULLS LAST, cnpj ASC);
CREATE INDEX IF NOT EXISTS receita_empresas_cnpj_basico_idx
  ON public.receita_empresas (cnpj_basico);

-- RLS: leitura com `prospeccao:ler`; nenhuma escrita pelo app.
ALTER TABLE public.receita_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_cnaes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_naturezas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receita_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS receita_empresas_select ON public.receita_empresas;
CREATE POLICY receita_empresas_select ON public.receita_empresas
  FOR SELECT TO authenticated
  USING ((SELECT public.has_capability(auth.uid(), public.get_user_tenant_id(auth.uid()), 'prospeccao:ler')));

DROP POLICY IF EXISTS receita_cnaes_select ON public.receita_cnaes;
CREATE POLICY receita_cnaes_select ON public.receita_cnaes
  FOR SELECT TO authenticated
  USING ((SELECT public.has_capability(auth.uid(), public.get_user_tenant_id(auth.uid()), 'prospeccao:ler')));

DROP POLICY IF EXISTS receita_naturezas_select ON public.receita_naturezas;
CREATE POLICY receita_naturezas_select ON public.receita_naturezas
  FOR SELECT TO authenticated
  USING ((SELECT public.has_capability(auth.uid(), public.get_user_tenant_id(auth.uid()), 'prospeccao:ler')));

DROP POLICY IF EXISTS receita_base_select ON public.receita_base;
CREATE POLICY receita_base_select ON public.receita_base
  FOR SELECT TO authenticated
  USING ((SELECT public.has_capability(auth.uid(), public.get_user_tenant_id(auth.uid()), 'prospeccao:ler')));

REVOKE ALL ON public.receita_empresas, public.receita_cnaes, public.receita_naturezas, public.receita_base FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.receita_empresas, public.receita_cnaes, public.receita_naturezas, public.receita_base FROM authenticated;
GRANT SELECT ON public.receita_empresas, public.receita_cnaes, public.receita_naturezas, public.receita_base TO authenticated;

-- Uma página da lista. SECURITY INVOKER: a RLS acima vale. A checagem explícita existe para
-- a tela distinguir "sem permissão" (erro 42501) de "base vazia" — lista vazia em silêncio
-- seria indistinguível das duas (ai-review-checklist).
-- A ordem vem de uma lista fechada: nada do cliente vira SQL.
CREATE OR REPLACE FUNCTION public.listar_empresas_receita(
  p_ordem text DEFAULT 'fit',
  p_crescente boolean DEFAULT false,
  p_pagina integer DEFAULT 0,
  p_por_pagina integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_ordem text;
  v_linhas jsonb;
  v_base public.receita_base%ROWTYPE;
BEGIN
  IF NOT public.has_capability(auth.uid(), public.get_user_tenant_id(auth.uid()), 'prospeccao:ler') THEN
    RAISE EXCEPTION 'Sem permissão para ver a base da Receita.' USING ERRCODE = '42501';
  END IF;
  IF p_pagina < 0 OR p_por_pagina NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Página inválida.' USING ERRCODE = '22023';
  END IF;
  -- Navegação até as 10 mil primeiras de cada ordem. Medido com a base real (16/11/2026):
  -- até aqui qualquer ordem responde abaixo de 0,7 s; com 250 mil de deslocamento, 20 s.
  -- Daí em diante, o caminho são os filtros.
  IF (p_pagina + 1) * p_por_pagina > 10000 THEN
    RAISE EXCEPTION 'A lista vai até as 10 mil primeiras empresas. Use os filtros.' USING ERRCODE = '22023';
  END IF;

  -- Cada ordem casa com um índice acima, inclusive na direção (o inverso lê o índice de trás
  -- para a frente). "idade" decrescente = abertas há mais tempo primeiro.
  v_ordem := CASE p_ordem || CASE WHEN p_crescente THEN ':asc' ELSE ':desc' END
    WHEN 'fit:desc'          THEN 'e.fit_previo DESC, e.funcionarios DESC NULLS LAST, e.cnpj DESC'
    WHEN 'fit:asc'           THEN 'e.fit_previo ASC, e.funcionarios ASC NULLS FIRST, e.cnpj ASC'
    WHEN 'nome:asc'          THEN 'e.nome_exibicao ASC, e.cnpj ASC'
    WHEN 'nome:desc'         THEN 'e.nome_exibicao DESC, e.cnpj DESC'
    WHEN 'funcionarios:desc' THEN 'e.funcionarios DESC NULLS LAST, e.cnpj DESC'
    WHEN 'funcionarios:asc'  THEN 'e.funcionarios ASC NULLS LAST, e.cnpj ASC'
    WHEN 'idade:desc'        THEN 'e.data_inicio_atividade ASC NULLS LAST, e.cnpj ASC'
    WHEN 'idade:asc'         THEN 'e.data_inicio_atividade DESC NULLS FIRST, e.cnpj DESC'
  END;
  IF v_ordem IS NULL THEN
    RAISE EXCEPTION 'Ordem desconhecida: %', p_ordem USING ERRCODE = '22023';
  END IF;

  EXECUTE format($q$
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'cnpj', e.cnpj,
      'razao_social', e.razao_social,
      'nome_fantasia', e.nome_fantasia,
      'cnae_principal', e.cnae_principal,
      'cnae_descricao', c.descricao,
      'municipio', e.municipio,
      'uf', e.uf,
      'data_inicio_atividade', e.data_inicio_atividade,
      'funcionarios', e.funcionarios,
      'divida_total', e.divida_total,
      'divida_ajuizada', e.divida_ajuizada,
      'fit_previo', e.fit_previo,
      'fit_frente', e.fit_frente,
      'faturamento_estimado', e.faturamento_estimado
    ) ORDER BY %1$s), '[]'::jsonb)
    FROM (SELECT * FROM public.receita_empresas e ORDER BY %1$s LIMIT $1 OFFSET $2) e
    LEFT JOIN public.receita_cnaes c ON c.codigo = e.cnae_principal
  $q$, v_ordem)
  INTO v_linhas
  USING p_por_pagina, p_pagina * p_por_pagina;

  SELECT * INTO v_base FROM public.receita_base WHERE id;

  RETURN jsonb_build_object(
    'total', v_base.total,
    'carregada_em', v_base.carregada_em,
    'linhas', v_linhas
  );
END;
$$;

COMMENT ON FUNCTION public.listar_empresas_receita(text, boolean, integer, integer) IS
  'Uma página da base da Receita (ADR-0053). Exige prospeccao:ler (42501). '
  'Ordens: fit, nome, funcionarios, idade. Navega até as 10 mil primeiras. Total e data vêm da última carga.';

REVOKE ALL ON FUNCTION public.listar_empresas_receita(text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_empresas_receita(text, boolean, integer, integer) TO authenticated;
