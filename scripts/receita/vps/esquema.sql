-- Tabela e índices do recorte que a tela Empresas lê (ADR-0053, US-0001, US-0003).
-- Aplicado pela carga (scripts/receita/sincronizar-base.ts -- --aplicar) como pulse_carga,
-- dono do schema pulse, antes de gravar. Reexecutável: só cria o que falta.

-- Uma linha por MATRIZ ATIVA, com o que a tela lista, filtra e ordena já calculado.
-- A nota de fit prévio vem do script (src/lib/prospecting/fit.ts, ADR-0042).
CREATE TABLE IF NOT EXISTS pulse.empresas (
  cnpj char(14) PRIMARY KEY,
  cnpj_basico char(8) NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  nome_exibicao text NOT NULL,
  cnae_principal char(7) NOT NULL,
  cnaes_secundarios char(7)[] NOT NULL DEFAULT '{}',
  natureza_juridica char(4),
  capital_social numeric(18, 2),
  data_inicio_atividade date,
  municipio text,
  uf char(2),
  funcionarios integer,
  unidades_com_funcionarios integer,
  filiais_ativas integer NOT NULL DEFAULT 0,
  socios integer NOT NULL DEFAULT 0,
  divida_total numeric(18, 2),
  divida_em_cobranca numeric(18, 2),
  divida_ajuizada numeric(18, 2),
  inscricoes_divida integer,
  tem_email boolean NOT NULL DEFAULT false,
  tem_telefone boolean NOT NULL DEFAULT false,
  fit_previo smallint NOT NULL CHECK (fit_previo BETWEEN 0 AND 100),
  fit_frente text NOT NULL CHECK (fit_frente IN ('software', 'financiamento', 'consultoria')),
  faturamento_estimado numeric(18, 2)
);

CREATE TABLE IF NOT EXISTS pulse.base (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  carregada_em timestamptz NOT NULL,
  total integer NOT NULL
);

-- Um índice por ordem da tela, na direção em que a Edge Function ordena.
CREATE INDEX IF NOT EXISTS empresas_fit_idx ON pulse.empresas (fit_previo DESC, funcionarios DESC NULLS LAST, cnpj DESC);
CREATE INDEX IF NOT EXISTS empresas_nome_idx ON pulse.empresas (nome_exibicao, cnpj);
CREATE INDEX IF NOT EXISTS empresas_func_desc_idx ON pulse.empresas (funcionarios DESC NULLS LAST, cnpj DESC);
CREATE INDEX IF NOT EXISTS empresas_func_asc_idx ON pulse.empresas (funcionarios ASC NULLS LAST, cnpj ASC);
CREATE INDEX IF NOT EXISTS empresas_abertura_idx ON pulse.empresas (data_inicio_atividade ASC NULLS LAST, cnpj ASC);
CREATE INDEX IF NOT EXISTS empresas_cnpj_basico_idx ON pulse.empresas (cnpj_basico);

-- US-0003: setor (seção da CNAE) e ramo (divisão) prontos, do principal e dos secundários,
-- calculados na carga por src/lib/prospecting/cnae.ts. Calcular na hora passou de 5 s.
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS secao text;
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS divisao text;
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS secoes_sec text[] NOT NULL DEFAULT '{}';
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS divisoes_sec text[] NOT NULL DEFAULT '{}';

-- Índices dos filtros (US-0003).
CREATE INDEX IF NOT EXISTS empresas_secao_idx ON pulse.empresas (secao);
CREATE INDEX IF NOT EXISTS empresas_divisao_idx ON pulse.empresas (divisao);
CREATE INDEX IF NOT EXISTS empresas_secoes_sec_idx ON pulse.empresas USING gin (secoes_sec);
CREATE INDEX IF NOT EXISTS empresas_divisoes_sec_idx ON pulse.empresas USING gin (divisoes_sec);
CREATE INDEX IF NOT EXISTS empresas_cnae_idx ON pulse.empresas (cnae_principal);
CREATE INDEX IF NOT EXISTS empresas_cnaes_sec_idx ON pulse.empresas USING gin (cnaes_secundarios);
CREATE INDEX IF NOT EXISTS empresas_uf_idx ON pulse.empresas (uf);

GRANT SELECT ON pulse.empresas, pulse.base TO pulse_api;

-- US-0005: busca por nome e cidade. Uma só normalização (sem acento e em minúsculas), usada
-- pelos índices e pela Edge Function: o termo e o nome passam pela mesma função. Os acentos
-- saem antes do lower, que não mexe em letra acentuada quando a base usa a collation C.
-- O índice de trechos de 3 letras (gin_trgm_ops) exige a extensão pg_trgm, que só o
-- administrador do banco cria (preparar-vps.sql).
CREATE OR REPLACE FUNCTION pulse.normalizar(texto text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  RETURN lower(translate(texto,
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'));

-- Nome: fantasia e razão social juntos, num índice só. A Edge Function repete esta expressão.
CREATE INDEX IF NOT EXISTS empresas_nome_busca_idx ON pulse.empresas
  USING gin (pulse.normalizar(coalesce(nome_fantasia, '') || ' ' || razao_social) gin_trgm_ops);
-- Cidade: só o nome inteiro, por igualdade.
CREATE INDEX IF NOT EXISTS empresas_municipio_busca_idx ON pulse.empresas (pulse.normalizar(municipio));

GRANT EXECUTE ON FUNCTION pulse.normalizar(text) TO pulse_api;
