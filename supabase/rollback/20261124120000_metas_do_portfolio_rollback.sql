-- Rollback de 20261124120000_metas_do_portfolio.sql: remove a tabela de metas do portfólio.
-- As metas gravadas se perdem; anote-as antes, se precisar.
-- Sem BEGIN/COMMIT próprio: rode com `psql --single-transaction` (ai-review-checklist).

DROP TABLE IF EXISTS public.portfolio_goals;
