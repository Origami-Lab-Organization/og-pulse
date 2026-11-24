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
  fit_frente text NOT NULL CHECK (fit_frente IN ('studio', 'lei_do_bem', 'captacao', 'consultoria')),
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


-- US-0006: de onde vem o faturamento estimado — RAIS, modelo de empresas parecidas ou só o
-- piso do porte (src/lib/prospecting/faturamentoEstimado.ts).
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS faturamento_base text
  CHECK (faturamento_base IN ('rais', 'modelo', 'piso'));

-- US-0018: a base "capital" (sem RAIS, pelo capital social a partir de R$ 10 mi). Troca o CHECK
-- de cima, que o ADD COLUMN IF NOT EXISTS não refaz numa base já criada.
ALTER TABLE pulse.empresas DROP CONSTRAINT IF EXISTS empresas_faturamento_base_check;
ALTER TABLE pulse.empresas ADD CONSTRAINT empresas_faturamento_base_check
  CHECK (faturamento_base IN ('rais', 'capital', 'modelo', 'piso'));

-- Ordem por faturamento: só as estimadas (RAIS e modelo, cerca de 300 mil). As de piso têm
-- todas o mesmo valor e a Edge Function as ordena pelo CNPJ, à parte (US-0006).
DROP INDEX IF EXISTS pulse.empresas_fat_desc_idx;
DROP INDEX IF EXISTS pulse.empresas_fat_asc_idx;
CREATE INDEX IF NOT EXISTS empresas_fat_estimado_desc_idx ON pulse.empresas (faturamento_estimado DESC NULLS LAST, cnpj DESC)
  WHERE faturamento_base IS DISTINCT FROM 'piso';
CREATE INDEX IF NOT EXISTS empresas_fat_estimado_asc_idx ON pulse.empresas (faturamento_estimado ASC NULLS LAST, cnpj ASC)
  WHERE faturamento_base IS DISTINCT FROM 'piso';

-- US-0015: distância em linha reta da sede de Formiga à sede do município (km inteiros; nulo
-- sem município reconhecido), gravada pela carga. Ordem nos dois sentidos, sem município no fim.
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS distancia_km integer;
CREATE INDEX IF NOT EXISTS empresas_distancia_asc_idx ON pulse.empresas (distancia_km ASC NULLS LAST, cnpj ASC);
CREATE INDEX IF NOT EXISTS empresas_distancia_desc_idx ON pulse.empresas (distancia_km DESC NULLS LAST, cnpj DESC);

-- Ordem por capital social (18/11/2026): capital zero é o "não declarado" da Receita e fica no
-- fim, com os nulos, nos dois sentidos.
CREATE INDEX IF NOT EXISTS empresas_capital_desc_idx ON pulse.empresas ((nullif(capital_social, 0)) DESC NULLS LAST, cnpj DESC);
CREATE INDEX IF NOT EXISTS empresas_capital_asc_idx ON pulse.empresas ((nullif(capital_social, 0)) ASC NULLS LAST, cnpj ASC);

-- US-0014 (24/11/2026): fit por serviço — Studio de Produto, Lei do Bem, Captação de recursos e
-- Consultoria Estratégica (src/lib/prospecting/fit.ts, ADR-0055). A nota de cada serviço, para a
-- tela ordenar e filtrar por ele; `fit_previo` segue sendo a maior e `fit_frente`, de qual
-- serviço. O CHECK novo entra NOT VALID: as linhas antigas (frentes software/financiamento)
-- somem no TRUNCATE logo depois, e as novas já são conferidas.
ALTER TABLE pulse.empresas DROP CONSTRAINT IF EXISTS empresas_fit_frente_check;
ALTER TABLE pulse.empresas ADD CONSTRAINT empresas_fit_frente_check
  CHECK (fit_frente IN ('studio', 'lei_do_bem', 'captacao', 'consultoria')) NOT VALID;
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS fit_studio smallint NOT NULL DEFAULT 0 CHECK (fit_studio BETWEEN 0 AND 100);
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS fit_lei_do_bem smallint NOT NULL DEFAULT 0 CHECK (fit_lei_do_bem BETWEEN 0 AND 100);
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS fit_captacao smallint NOT NULL DEFAULT 0 CHECK (fit_captacao BETWEEN 0 AND 100);
ALTER TABLE pulse.empresas ADD COLUMN IF NOT EXISTS fit_consultoria smallint NOT NULL DEFAULT 0 CHECK (fit_consultoria BETWEEN 0 AND 100);
CREATE INDEX IF NOT EXISTS empresas_fit_studio_idx ON pulse.empresas (fit_studio DESC, funcionarios DESC NULLS LAST, cnpj DESC);
CREATE INDEX IF NOT EXISTS empresas_fit_lei_do_bem_idx ON pulse.empresas (fit_lei_do_bem DESC, funcionarios DESC NULLS LAST, cnpj DESC);
CREATE INDEX IF NOT EXISTS empresas_fit_captacao_idx ON pulse.empresas (fit_captacao DESC, funcionarios DESC NULLS LAST, cnpj DESC);
CREATE INDEX IF NOT EXISTS empresas_fit_consultoria_idx ON pulse.empresas (fit_consultoria DESC, funcionarios DESC NULLS LAST, cnpj DESC);
