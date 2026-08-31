-- ═══════════════════════════════════════════════════════════════════════════
-- 05 — Pós-config: o que existe só no painel e não sobrevive a um restore.
--
-- ⚠️  RASCUNHO. Este arquivo NÃO é aplicado por ninguém. Quando validado no
--     projeto sombra, ele é promovido a migration versionada em
--     supabase/migrations/ — senão repete o TD-0009 (config que só existe no
--     painel, invisível no repo).
--
-- Buckets NÃO estão aqui de propósito: o 03-storage.mjs cria cada bucket no
-- destino copiando `public`, `file_size_limit` e `allowed_mime_types` da
-- origem, então duplicar aqui só criaria divergência.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Realtime — a caixa de entrada ──────────────────────────────────────
-- O Inbox escuta `postgres_changes` em public.notifications filtrando por
-- recipient_id (src/components/layout/InboxButton.tsx e src/pages/Inbox.tsx).
-- Isso foi ligado pelo painel do Lovable e nunca entrou em migration.

alter publication supabase_realtime add table public.notifications;

-- A página do Inbox escuta event '*', incluindo DELETE. Para o filtro por
-- recipient_id valer em DELETE, o Postgres precisa mandar a linha antiga —
-- e isso exige REPLICA IDENTITY FULL. Sem ela, o badge não zera quando uma
-- notificação é removida.
alter table public.notifications replica identity full;


-- ── 2. Segredos dos cron jobs — via Vault, não via GUC ────────────────────
-- Os jobs hoje leem current_setting('app.service_role_key'), que depende de um
-- `ALTER DATABASE ... SET` manual documentado apenas como comentário em
-- 20260622130000_installment_nf_alert_cron.sql:13-14. Na origem esse setting
-- NÃO existe: o SQL editor responde 42704 unrecognized configuration
-- parameter — ou seja, os três jobs falham a cada disparo.
--
-- Dois problemas no desenho antigo, não um: (a) o setup manual se perde em
-- qualquer projeto novo, e (b) um GUC de banco é legível por qualquer role que
-- consiga conectar. O Vault resolve os dois.
--
-- Os segredos são criados UMA vez, à mão, e nunca entram no repo:
--
--   select vault.create_secret('https://<ref>.supabase.co', 'app_supabase_url');
--   select vault.create_secret('<service role key>',        'app_service_role_key');

create or replace function public.cron_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = p_name;

  if v_secret is null then
    raise exception 'Segredo % ausente no Vault — cron job não pode rodar', p_name;
  end if;

  return v_secret;
end;
$$;

-- Função definer que devolve segredo NÃO pode ser chamável pelo app.
revoke all on function public.cron_secret(text) from public;
revoke all on function public.cron_secret(text) from anon, authenticated;

comment on function public.cron_secret(text) is
  'Uso exclusivo dos cron jobs. Levanta exceção se o segredo não existir, para a falha aparecer em cron.job_run_details em vez de sumir.';


-- ── 3. Cron jobs ──────────────────────────────────────────────────────────
-- Mesmos horários das migrations de origem. `unschedule` antes para o arquivo
-- ser reexecutável.
--
-- ⚠️  NÃO RODAR NO PROJETO SOMBRA. Estes jobs mandam e-mail para gente real:
--     lembrete de ponto, cobrança de timesheet e follow-up de oportunidade.
--     No sombra, teste as functions por invoke manual. Aqui é só no cutover.

select cron.unschedule('notify-installment-alerts-daily')      where exists (select 1 from cron.job where jobname = 'notify-installment-alerts-daily');
select cron.unschedule('notify-time-tracking-reminders-daily') where exists (select 1 from cron.job where jobname = 'notify-time-tracking-reminders-daily');
select cron.unschedule('notify-lead-follow-ups-daily')         where exists (select 1 from cron.job where jobname = 'notify-lead-follow-ups-daily');

select cron.schedule(
  'notify-installment-alerts-daily',
  '0 8 * * *',
  $$
    select net.http_post(
      url     := public.cron_secret('app_supabase_url') || '/functions/v1/notify-installment-alerts',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || public.cron_secret('app_service_role_key')
                 ),
      body    := '{}'::jsonb
    ) as request_id
  $$
);

select cron.schedule(
  'notify-time-tracking-reminders-daily',
  '0 9 * * *',
  $$
    select net.http_post(
      url     := public.cron_secret('app_supabase_url') || '/functions/v1/notify-time-tracking-reminders',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || public.cron_secret('app_service_role_key')
                 ),
      body    := '{}'::jsonb
    ) as request_id
  $$
);

select cron.schedule(
  'notify-lead-follow-ups-daily',
  '0 8 * * *',
  $$
    select net.http_post(
      url     := public.cron_secret('app_supabase_url') || '/functions/v1/notify-lead-follow-ups',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || public.cron_secret('app_service_role_key')
                 ),
      body    := '{}'::jsonb
    ) as request_id
  $$
);


-- ── 4. Conferência ────────────────────────────────────────────────────────
-- Depois do primeiro disparo:
--   select j.jobname, r.status, left(r.return_message, 200)
--     from cron.job_run_details r join cron.job j on j.jobid = r.jobid
--    order by r.start_time desc limit 10;
