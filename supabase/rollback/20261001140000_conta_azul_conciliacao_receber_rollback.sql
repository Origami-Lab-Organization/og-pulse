-- Reverte 20261001140000_conta_azul_conciliacao_receber.sql.
--
-- ATENÇÃO: parcelas que a baixa automática marcou como recebidas CONTINUAM recebidas — apagar
-- a tabela de casamentos não desfaz a baixa. Para voltar cada uma, rodar antes, por casamento,
-- `select public.conta_azul_undo_match(id)` (ou o UPDATE equivalente com previous_status).
-- O acesso do Gerente à conciliação de receber volta pelo toggle em Perfis de Acesso.
-- Sem BEGIN/COMMIT próprio: envolver por fora com `psql --single-transaction`.

DROP FUNCTION IF EXISTS public.conta_azul_receivables_reconciliation(uuid, date, date);
DROP FUNCTION IF EXISTS public.conta_azul_apply_payment(uuid);
DROP FUNCTION IF EXISTS public.conta_azul_undo_match(uuid);
DROP FUNCTION IF EXISTS public.conta_azul_confirm_match(uuid);
DROP FUNCTION IF EXISTS public.conta_azul_match_for_action(uuid);
DROP FUNCTION IF EXISTS public.conta_azul_reconcile_receivables(uuid);
DROP FUNCTION IF EXISTS public.conta_azul_nf_key(text);
DROP TABLE IF EXISTS public.conta_azul_match_rejections;
DROP TABLE IF EXISTS public.conta_azul_matches;
