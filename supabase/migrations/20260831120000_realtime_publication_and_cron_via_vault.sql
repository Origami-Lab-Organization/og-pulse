-- Duas coisas que existiam só no painel do Lovable Cloud e por isso não
-- sobreviveram à migração para o Supabase próprio. Ambas passam a ser código.
--
-- 1. A publication de realtime do Inbox. Descoberto na migração: no projeto
--    antigo a `supabase_realtime` estava VAZIA, então o `postgres_changes` que
--    src/components/layout/InboxButton.tsx e src/pages/Inbox.tsx escutam nunca
--    recebeu evento nenhum. O badge só atualizava no refetch do TanStack Query,
--    e foi por isso que ninguém percebeu.
--
-- 2. Os três cron jobs de notificação. No projeto antigo eles falhavam a cada
--    disparo desde 22/06 com `42704 unrecognized configuration parameter`,
--    porque liam `current_setting('app.supabase_url')` e o
--    `ALTER DATABASE ... SET` correspondente estava documentado apenas como
--    comentário em 20260622130000 e nunca foi executado. Aqui a fonte passa a
--    ser o Vault: o segredo não fica em GUC legível por qualquer role que
--    conecte, e a ausência dele levanta exceção visível em cron.job_run_details
--    em vez de sumir.
--
-- Pré-requisito manual (uma vez por projeto, fora de migration por conter
-- credencial):
--   select vault.create_secret('https://<ref>.supabase.co', 'app_supabase_url');
--   select vault.create_secret('<service role key>',        'app_service_role_key');

-- ── 1. Realtime do Inbox ──────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- A página do Inbox escuta event '*', DELETE incluído, filtrando por
-- recipient_id. Para o filtro valer em DELETE o Postgres precisa mandar a linha
-- antiga, e isso exige REPLICA IDENTITY FULL. Sem ela o badge não zera quando
-- uma notificação é removida.
alter table public.notifications replica identity full;


-- ── 2. Segredo dos cron jobs, via Vault ───────────────────────────────────
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

-- Função definer que devolve segredo não pode ser chamável pelo app.
revoke all on function public.cron_secret(text) from public;
revoke all on function public.cron_secret(text) from anon, authenticated;

comment on function public.cron_secret(text) is
  'Uso exclusivo dos cron jobs. Levanta exceção quando o segredo não existe, para a falha aparecer em cron.job_run_details em vez de sumir silenciosamente.';


-- ── 3. Os três jobs ───────────────────────────────────────────────────────
-- `unschedule` antes para a migration ser reexecutável.
select cron.unschedule('notify-installment-alerts-daily')      where exists (select 1 from cron.job where jobname = 'notify-installment-alerts-daily');
select cron.unschedule('notify-time-tracking-reminders-daily') where exists (select 1 from cron.job where jobname = 'notify-time-tracking-reminders-daily');
select cron.unschedule('notify-lead-follow-ups-daily')         where exists (select 1 from cron.job where jobname = 'notify-lead-follow-ups-daily');

select cron.schedule('notify-installment-alerts-daily', '0 8 * * *', $job$
  select net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/notify-installment-alerts',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb
  ) as request_id
$job$);

select cron.schedule('notify-time-tracking-reminders-daily', '0 9 * * *', $job$
  select net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/notify-time-tracking-reminders',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb
  ) as request_id
$job$);

select cron.schedule('notify-lead-follow-ups-daily', '0 8 * * *', $job$
  select net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/notify-lead-follow-ups',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb
  ) as request_id
$job$);
