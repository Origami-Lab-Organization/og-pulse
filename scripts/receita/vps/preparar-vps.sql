-- Preparação da VPS para a tela Empresas (ADR-0053). Rodar UMA vez, como postgres, no banco cnpj:
--   docker exec -it <container> psql -U postgres -d cnpj -f /caminho/preparar-vps.sql
-- Depois, definir as senhas à mão (nunca neste arquivo):
--   \password pulse_carga
--   \password pulse_api
--
-- Dois usuários novos, cada um com o mínimo:
--   * pulse_carga  grava o recorte em pulse.* — usado pelo script de carga, pelo túnel SSH.
--   * pulse_api    só LÊ pulse.* e public.cnaes — o único que entra de fora, e só por SSL
--                  (regra no pg_hba: .harness/integrations/base-receita-vps.md).
-- O pulse_leitura de 15/11/2026 continua: o script lê a base original com ele.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pulse_carga') THEN
    CREATE ROLE pulse_carga LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pulse_api') THEN
    CREATE ROLE pulse_api LOGIN CONNECTION LIMIT 20;
  END IF;
END $$;

-- A API nunca segura uma consulta longa: a tela espera no máximo 2 s (US-0001).
ALTER ROLE pulse_api SET statement_timeout = '5s';
ALTER ROLE pulse_api SET default_transaction_read_only = on;

GRANT CONNECT ON DATABASE cnpj TO pulse_carga, pulse_api;

CREATE SCHEMA IF NOT EXISTS pulse AUTHORIZATION pulse_carga;
REVOKE ALL ON SCHEMA pulse FROM PUBLIC;
GRANT USAGE ON SCHEMA pulse TO pulse_api;

SET ROLE pulse_carga;

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

GRANT SELECT ON pulse.empresas, pulse.base TO pulse_api;

RESET ROLE;

-- A descrição do CNAE vem da tabela que já existe na base.
GRANT USAGE ON SCHEMA public TO pulse_api;
GRANT SELECT ON public.cnaes TO pulse_api;
