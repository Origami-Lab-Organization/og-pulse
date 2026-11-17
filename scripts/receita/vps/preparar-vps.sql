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

-- A tabela e os índices de pulse.* ficam em esquema.sql, que a carga aplica como pulse_carga
-- (dono do schema) a cada --aplicar: mudar o recorte não exige entrar como root na VPS.

-- A descrição do CNAE vem da tabela que já existe na base.
GRANT USAGE ON SCHEMA public TO pulse_api;
GRANT SELECT ON public.cnaes TO pulse_api;
