-- Reversão de 20260924120000_prospect_tasks.sql.
--
-- Destrutiva: as tarefas cadastradas se perdem. Exporte antes se precisar.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP TABLE IF EXISTS public.prospect_tasks;
DROP FUNCTION IF EXISTS public.prospect_tasks_inherit_parent();
