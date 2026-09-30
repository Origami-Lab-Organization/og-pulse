-- Reversão de 20260929170000_company_watch_cron.sql: só tira o agendamento.
select cron.unschedule('company-watch-daily')
 where exists (select 1 from cron.job where jobname = 'company-watch-daily');
