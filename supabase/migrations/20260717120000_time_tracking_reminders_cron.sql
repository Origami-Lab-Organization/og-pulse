-- Agenda a Edge Function notify-time-tracking-reminders para rodar diariamente
-- às 09:00 UTC. Envia:
--   - lembrete de fechamento mensal para admin/rh nos últimos 3 dias do mês,
--     se o período ainda não tiver sido fechado;
--   - lembrete para admin de solicitações de ajuste/hora extra pendentes há
--     mais de 2 dias.
--
-- Reaproveita as extensões pg_cron/pg_net já habilitadas em
-- 20260622130000_installment_nf_alert_cron.sql.
--
-- PRÉ-REQUISITO (já configurado para os outros crons do projeto):
--   ALTER DATABASE postgres SET app.supabase_url    = 'https://<project-ref>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'notify-time-tracking-reminders-daily') THEN
    PERFORM cron.unschedule('notify-time-tracking-reminders-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-time-tracking-reminders-daily',
  '0 9 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notify-time-tracking-reminders',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || current_setting('app.service_role_key')
                 ),
      body    := '{}'::jsonb
    ) AS request_id
  $$
);
