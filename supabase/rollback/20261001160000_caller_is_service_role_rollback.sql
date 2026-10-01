-- Reverte 20261001160000_caller_is_service_role.sql. Antes, voltar company-watch e
-- conta-azul-sync a comparar a chave por texto — sem a função, elas recusam todo cron.
DROP FUNCTION IF EXISTS public.caller_is_service_role();
