-- Reversão de 20261013120000_lei_do_bem_automatica.sql.
-- As linhas já carregadas em fomento_publico ficam: são as mesmas que o script carregaria.
-- `prospect_companies.fomento` também fica como está; o próximo "Atualizar" recalcula.
select cron.unschedule('lei-do-bem-sync-hourly')
 where exists (select 1 from cron.job where jobname = 'lei-do-bem-sync-hourly');

DROP FUNCTION IF EXISTS public.recalcular_lei_do_bem_nas_empresas();
DROP FUNCTION IF EXISTS public.lei_do_bem_lista_completa();
DROP TABLE IF EXISTS public.fomento_publico_varreduras;
DROP TABLE IF EXISTS public.fomento_publico_arquivos;
