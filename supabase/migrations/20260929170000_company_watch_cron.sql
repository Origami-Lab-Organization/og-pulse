-- Prospecção — gatilhos comerciais: reconsulta diária da Receita (29/09/2026).
--
-- A Edge Function company-watch roda todo dia às 07:00 (horário de Brasília = 10:00 UTC):
-- reconsulta até 120 empresas cuja última consulta tem mais de 30 dias e avisa, na caixa de
-- entrada, os responsáveis pelos contatos e quem cadastrou a empresa quando ela:
--   - entrou no Lucro Real (pode usar a Lei do Bem);
--   - mudou de porte;
--   - deixou de estar ATIVA na Receita;
--   - ganhou sócio ou diretor novo.
-- Mesmo padrão dos outros crons: URL e chave vêm do Vault (public.cron_secret, 20260831120000).
--
-- Rollback: supabase/rollback/20260929170000_company_watch_cron_rollback.sql

select cron.unschedule('company-watch-daily')
 where exists (select 1 from cron.job where jobname = 'company-watch-daily');

select cron.schedule('company-watch-daily', '0 10 * * *', $job$
  select net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/company-watch',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb
  ) as request_id
$job$);
