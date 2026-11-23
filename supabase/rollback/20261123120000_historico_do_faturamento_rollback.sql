-- Rollback de 20261123120000_historico_do_faturamento.sql: tira os gatilhos, a função e a
-- tabela do histórico. O faturamento atual continua em prospect_companies; perde-se só o
-- registro de quem informou e quando.

DROP TRIGGER IF EXISTS prospect_companies_faturamento_mudou ON public.prospect_companies;
DROP TRIGGER IF EXISTS prospect_companies_faturamento_criado ON public.prospect_companies;
DROP FUNCTION IF EXISTS public.prospect_companies_registra_faturamento();
DROP TABLE IF EXISTS public.prospect_company_faturamentos;
