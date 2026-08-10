-- Habilita extensões necessárias (idempotentes)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agenda a Edge Function notify-lead-follow-ups diariamente às 08:00 UTC.
-- Cobra o retorno de contato das oportunidades do Pipeline:
--   - no dia agendado (tipo lead_follow_up_due)
--   - enquanto seguir vencido e pendente (tipo lead_follow_up_overdue)
--
-- Mesmo padrão de notify-installment-alerts (ADR-0004).
--
-- PRÉ-REQUISITO (configurar fora desta migration, sem commitar credenciais):
--   ALTER DATABASE postgres SET app.supabase_url     = 'https://<project-ref>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
-- Sem esses settings o job falha silenciosamente e nenhum lembrete é enviado.
DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'notify-lead-follow-ups-daily') THEN
    PERFORM cron.unschedule('notify-lead-follow-ups-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-lead-follow-ups-daily',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notify-lead-follow-ups',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || current_setting('app.service_role_key')
                 ),
      body    := '{}'::jsonb
    ) AS request_id
  $$
);
