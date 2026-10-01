-- Quem chama é a service role? Para as Edge Functions chamadas pelo cron reconhecerem o cron.
--
-- O cron manda a chave de serviço guardada no Vault (JWT legado do projeto, emitido em 31/08). As
-- funções comparavam essa string com a SUPABASE_SERVICE_ROLE_KEY do ambiente delas, que está em
-- outro formato: nunca batia, e company-watch e conta-azul-sync respondiam 401 a todo cron
-- (descoberto em 01/10/2026 pelo net._http_response). Em vez de comparar texto de chave, a função
-- pergunta ao banco com a chave recebida: no PostgREST, o papel do banco é o papel da chave.
--
-- SECURITY INVOKER de propósito: `current_user` precisa ser o papel de quem chama. Não devolve
-- dado nenhum, então pode ser chamada por qualquer papel.
--
-- Rollback: supabase/rollback/20261001160000_caller_is_service_role_rollback.sql

CREATE FUNCTION public.caller_is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT current_user = 'service_role'
$$;

GRANT EXECUTE ON FUNCTION public.caller_is_service_role() TO anon, authenticated, service_role;
