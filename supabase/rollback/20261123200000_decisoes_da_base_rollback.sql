-- Rollback de 20261123200000_decisoes_da_base.sql: tira o aviso agendado, os gatilhos, as
-- funções e a tabela de decisões. As empresas descartadas e em "Não agora" voltam para a lista;
-- os avisos já enviados ficam no sino.

SELECT cron.unschedule('prospeccao-avisar-retomadas-daily')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prospeccao-avisar-retomadas-daily');

DROP TRIGGER IF EXISTS prospects_encerra_decisao_reaberta ON public.prospects;
DROP TRIGGER IF EXISTS prospects_encerra_decisao_criada ON public.prospects;
DROP FUNCTION IF EXISTS public.prospects_encerra_decisao_da_base();
DROP FUNCTION IF EXISTS public.avisar_empresas_para_retomar();
DROP TABLE IF EXISTS public.prospect_decisoes_da_base;
DROP FUNCTION IF EXISTS public.prospect_decisoes_da_base_guarda();
DROP FUNCTION IF EXISTS public.prospect_employee_da_sessao(uuid);
