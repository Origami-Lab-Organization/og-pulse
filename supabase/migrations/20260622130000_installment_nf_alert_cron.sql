-- Habilita extensões necessárias (idempotentes)
-- pg_cron: agendamento de jobs no banco
-- pg_net: chamadas HTTP de dentro do PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agenda a Edge Function notify-installment-alerts para rodar diariamente às 08:00 UTC.
-- Envia alertas de emissão de NF para GPs e admins:
--   - 3 dias antes da invoice_date (tipo installment_nf_alert_3d)
--   - no dia da invoice_date      (tipo installment_nf_alert)
--
-- PRÉ-REQUISITO (configurar fora desta migration, sem commitar credenciais):
--   ALTER DATABASE postgres SET app.supabase_url    = 'https://<project-ref>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'notify-installment-alerts-daily') THEN
    PERFORM cron.unschedule('notify-installment-alerts-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-installment-alerts-daily',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notify-installment-alerts',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || current_setting('app.service_role_key')
                 ),
      body    := '{}'::jsonb
    ) AS request_id
  $$
);
