-- ═══════════════════════════════════════════════════════════════════════════
-- Verificação de catálogo — o que a API não alcança.
--
-- Rode as TRÊS consultas no SQL editor da ORIGEM (painel do Lovable Cloud) e
-- no SQL editor do DESTINO (dashboard do Supabase), e compare lado a lado.
-- Qualquer linha que não bata é bloqueio de cutover.
--
-- Nenhuma delas lê dado de pessoa, salário ou senha — só metadado de schema.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. Placar geral ────────────────────────────────────────────────────────
-- Compare valor por valor. `tabelas public SEM RLS` é o número mais importante
-- do cutover: se subir no destino, colaborador comum passa a ver salário,
-- custo e margem de todo mundo.

select 'tabelas em public'                as verificacao,
       count(*)::text                     as valor
  from pg_tables where schemaname = 'public'
union all
select 'tabelas public SEM RLS',
       count(*)::text
  from pg_tables where schemaname = 'public' and not rowsecurity
union all
select 'policies em public',
       count(*)::text
  from pg_policies where schemaname = 'public'
union all
select 'policies em storage.objects',
       count(*)::text
  from pg_policies where schemaname = 'storage' and tablename = 'objects'
union all
select 'functions em public',
       count(*)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
union all
select 'functions SECURITY DEFINER',
       count(*)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
union all
select 'definer SEM search_path fixo',
       count(*)::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
   and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path%'
union all
select 'triggers em public',
       count(*)::text
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and not t.tgisinternal
union all
select 'tabelas no realtime',
       count(*)::text
  from pg_publication_tables where pubname = 'supabase_realtime'
union all
select 'buckets de storage',
       count(*)::text
  from storage.buckets
union all
select 'extensions relevantes',
       string_agg(extname, ', ' order by extname)
  from pg_extension where extname in ('pg_cron', 'pg_net', 'btree_gist', 'pgcrypto', 'uuid-ossp')
order by verificacao;


-- ── 2. Quais tabelas estão sem RLS ─────────────────────────────────────────
-- O ideal é vazio nos dois lados. Se a origem já tiver linhas aqui, é o
-- alerta de segurança do painel do Lovable — trate como bug próprio, não
-- como ruído da migração.

select tablename
  from pg_tables
 where schemaname = 'public' and not rowsecurity
 order by tablename;


-- ── 3. Cron jobs e realtime ────────────────────────────────────────────────
-- No projeto sombra o esperado é ZERO cron job: os jobs mandam e-mail para
-- gente real. Só crie no cutover de verdade.
-- (Se pg_cron ainda não existe no destino, esta consulta acusa relação
--  inexistente — é resposta válida, significa "nenhum job".)

select jobname, schedule, active from cron.job order by jobname;

select schemaname, tablename from pg_publication_tables
 where pubname = 'supabase_realtime' order by tablename;
