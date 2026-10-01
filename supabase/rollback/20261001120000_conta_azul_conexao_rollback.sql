-- Reverte 20261001120000_conta_azul_conexao.sql.
--
-- Antes de rodar: desconectar as empresas pela tela (revoga no Conta Azul). Apagar as tabelas
-- direto deixa a autorização viva do lado do Conta Azul até o refresh token vencer.
-- Sem BEGIN/COMMIT próprio: envolver por fora com `psql --single-transaction`.

DROP FUNCTION IF EXISTS public.conta_azul_claim_refresh(uuid, integer);
DROP TABLE IF EXISTS public.conta_azul_oauth_states;
DROP TABLE IF EXISTS public.conta_azul_tokens;
DROP TABLE IF EXISTS public.conta_azul_connections;

-- A guarda do último admin também roda em DELETE; tirar estas capacidades não mexe em
-- `pessoa:editar-papel`, e tenant com teste encerrado travaria a reversão.
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

DELETE FROM public.user_capability_overrides
 WHERE capability IN ('integracoes:gerir', 'conciliacao:receber', 'conciliacao:pagar');
DELETE FROM public.default_role_capabilities
 WHERE capability IN ('integracoes:gerir', 'conciliacao:receber', 'conciliacao:pagar');
DELETE FROM public.role_capabilities
 WHERE capability IN ('integracoes:gerir', 'conciliacao:receber', 'conciliacao:pagar');
DELETE FROM public.capabilities
 WHERE key IN ('integracoes:gerir', 'conciliacao:receber', 'conciliacao:pagar');

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;
