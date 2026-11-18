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

-- Busca por nome (US-0005): índice de trechos de 3 letras. Extensão só o administrador cria;
-- o resto da busca (função e índices) fica em esquema.sql.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- A tabela e os índices de pulse.* ficam em esquema.sql, que a carga aplica como pulse_carga
-- (dono do schema) a cada --aplicar: mudar o recorte não exige entrar como root na VPS.

-- A descrição do CNAE vem da tabela que já existe na base.
GRANT USAGE ON SCHEMA public TO pulse_api;
GRANT SELECT ON public.cnaes TO pulse_api;

-- A natureza jurídica por extenso, para a ficha da empresa (US-0007).
GRANT SELECT ON public.naturezas_juridicas TO pulse_api;

-- Sócios para a ficha da empresa (US-0007), com minimização (LGPD, ADR-0041): só nome,
-- qualificação, data de entrada e tipo; o CNPJ só quando o sócio é empresa. CPF (mesmo
-- mascarado), faixa etária e representante legal ficam fora. A visão roda com os direitos do
-- dono (postgres): o pulse_api lê a visão, nunca a tabela public.socios.
CREATE OR REPLACE VIEW pulse.socios AS
SELECT cnpj_basico,
       nome_socio AS nome,
       qualificacao_codigo,
       data_entrada_sociedade AS entrada,
       tipo_socio AS tipo,
       CASE WHEN tipo_socio = 'Pessoa jurídica' THEN cpf_cnpj_socio END AS cnpj
  FROM public.socios;
GRANT SELECT ON pulse.socios TO pulse_api;

-- Contato público da empresa na Receita (e-mail e telefones do estabelecimento), para a
-- ficha (US-0007; decisão do Victor em 18/11/2026: aparece antes da Prospecção). Só essas
-- colunas, pela mesma razão da visão de sócios.
CREATE OR REPLACE VIEW pulse.contatos AS
SELECT cnpj, nullif(trim(email), '') AS email,
       nullif(trim(telefone_1), '') AS telefone_1, nullif(trim(telefone_2), '') AS telefone_2
  FROM public.estabelecimentos;
GRANT SELECT ON pulse.contatos TO pulse_api;
