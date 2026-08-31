#!/usr/bin/env bash
#
# 01 — Restore do dump do Lovable Cloud no projeto de destino.
#
# Uso:
#   set -a; source .env.migration; set +a
#   scripts/migration/01-restore.sh ~/Downloads/og-pulse_260821.backup [etapa]
#
# Etapas, na ordem em que `todas` executa:
#   roles    stubs sandbox_exec_* que os 453 GRANTs do dump referenciam
#   reset    apaga o conteúdo de public (mantém o schema e seus grants)
#   pre      pre-data de public: tabelas, funções, CHECKs — sem dados, sem FK
#   auth     dados de auth (os 35 usuários). ANTES do public, senão 9 FKs falham
#   dados    dados de public, com as 2 CHECKs cross-table suspensas
#   buckets  storage.buckets (NÃO storage.objects — o 03-storage cria essas linhas)
#   pos      post-data de public: FKs, índices, triggers, policies
#   final    desagenda crons, remove stubs, imprime contagens
#
# Por que separado em pre/dados/pos: FK criada depois do dado não depende da
# ordem de carga das tabelas, e o restore fica em blocos pequenos — o pooler
# derruba conexão em restore longo e o cliente pendura num socket morto.
set -uo pipefail

DUMP="${1:?informe o caminho do .backup}"
ETAPA="${2:-todas}"
PG="$(brew --prefix postgresql@17)/bin"
LOG="scripts/migration/.restore.log"

: "${TARGET_DB_PASSWORD:?falta TARGET_DB_PASSWORD no ambiente}"
: "${TARGET_SUPABASE_URL:?falta TARGET_SUPABASE_URL no ambiente}"
: "${ORIGIN_SUPABASE_URL:?falta ORIGIN_SUPABASE_URL no ambiente}"

[ -f supabase/.temp/pooler-url ] || { echo "❌ falta supabase/.temp/pooler-url — rode 'supabase link'"; exit 1; }
DB_HOST="$(sed -E 's|.*@([^:]+):.*|\1|' supabase/.temp/pooler-url)"
DB_USER="$(sed -E 's|postgresql://([^@]+)@.*|\1|' supabase/.temp/pooler-url)"
ORIGIN_REF="$(sed -E 's|https://([a-z0-9]+)\.supabase\.co.*|\1|' <<<"$ORIGIN_SUPABASE_URL")"

# Keepalives não são luxo: sem eles o pooler fecha a conexão no meio de um
# bloco demorado e o pg_restore fica esperando para sempre num socket morto.
export PGPASSWORD="$TARGET_DB_PASSWORD"
DSN="host=$DB_HOST port=5432 user=$DB_USER dbname=postgres connect_timeout=15"
DSN="$DSN keepalives=1 keepalives_idle=30 keepalives_interval=10 keepalives_count=5"

psql_do()  { $PG/psql "$DSN" -v ON_ERROR_STOP=1 -q -c "$1"; }
psql_out() { $PG/psql "$DSN" -c "$1"; }
banner()   { echo; echo "── $1 ────────────────────────────────"; }

# grep -c imprime "0" E sai com status 1 quando não acha nada, então um
# `|| echo 0` duplica a saída e quebra a aritmética. head -1 resolve.
conta_erros() { grep -c '^pg_restore: error' "$LOG" 2>/dev/null | head -1; }

erros_novos() {
  local antes="$1" agora
  agora=$(conta_erros)
  echo "   erros nesta etapa: $((agora - antes))"
  [ "$agora" -gt "$antes" ] && grep '^pg_restore: error' "$LOG" | tail -4 | cut -c1-160 | sed 's/^/   · /'
  return 0
}

restore_parte() {
  local rotulo="$1"; shift
  banner "$rotulo"
  local antes; antes=$(conta_erros)
  local t0=$SECONDS
  $PG/pg_restore -d "$DSN" --no-owner --verbose "$@" "$DUMP" >>"$LOG" 2>&1
  echo "   $((SECONDS - t0))s"
  erros_novos "$antes"
}

etapa_roles() {
  banner "roles stub"
  for r in sandbox_exec "sandbox_exec_$ORIGIN_REF"; do
    psql_do "do \$\$ begin
      if not exists (select 1 from pg_roles where rolname = '$r') then
        execute 'create role $r nologin';
      end if;
    end \$\$;" && echo "   ✓ $r"
  done
}

etapa_reset() {
  banner "reset de public"
  # Não uso DROP SCHEMA: o dump não recria o schema public nem os grants dele
  # (não estão no TOC), então derrubar o schema perderia configuração que eu
  # teria de adivinhar. Apago só o conteúdo.
  psql_do "do \$\$
    declare r record;
    begin
      for r in select tablename from pg_tables where schemaname = 'public' loop
        execute format('drop table if exists public.%I cascade', r.tablename);
      end loop;
      for r in select p.oid::regprocedure::text as f
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' loop
        execute format('drop function if exists %s cascade', r.f);
      end loop;
      for r in select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
                where n.nspname = 'public' and t.typtype = 'e' loop
        execute format('drop type if exists public.%I cascade', r.typname);
      end loop;
      for r in select sequencename from pg_sequences where schemaname = 'public' loop
        execute format('drop sequence if exists public.%I cascade', r.sequencename);
      end loop;
    end \$\$;"
  psql_out "select count(*) as tabelas_restantes from pg_tables where schemaname='public';"
}

etapa_extensoes() {
  banner "extensões"
  # ARMADILHA: no TOC do dump as extensões não têm schema, então --schema=public
  # as filtra e nenhuma é criada. O destino já vem com pgcrypto, uuid-ossp,
  # pg_stat_statements e supabase_vault; faltam sempre estas duas — e sem elas
  # cron.job nem existe.
  psql_do "create extension if not exists pg_cron with schema pg_catalog;" && echo "   ✓ pg_cron"
  psql_do "create extension if not exists pg_net  with schema public;"     && echo "   ✓ pg_net"
}

etapa_pre() { restore_parte "pre-data de public" --section=pre-data --schema=public; }

etapa_auth() {
  # Duas passadas, na ordem certa: `identities` referencia `users`, e o
  # pg_restore carrega em ordem alfabética — identities viria primeiro e
  # falharia com FK. users → identities resolve.
  restore_parte "auth.users (os 35, com hash)"  --section=data --schema=auth --table=users
  restore_parte "auth.identities (vínculo com provedor)" --section=data --schema=auth --table=identities

  # NÃO restauramos sessions, refresh_tokens, one_time_tokens nem mfa_*: são
  # estado de sessão viva do projeto antigo, sem valor no destino (todo mundo
  # reloga no cutover) e é o que gerava a maior parte do ruído de FK.
  # auth.schema_migrations também não: é do GoTrue, pertence a
  # supabase_auth_admin, e o destino já está na versão dele.
}

etapa_dados() {
  banner "CHECKs cross-table suspensas"
  # As duas chamam public.project_child_tenant_matches(project_id, tenant_id),
  # que consulta projects. Durante a carga, project_files vem antes de projects
  # (ordem alfabética do pg_restore) e a checagem falha com a tabela ainda vazia.
  psql_do "alter table public.project_files   drop constraint if exists project_files_tenant_matches_project;
           alter table public.project_folders drop constraint if exists project_folders_tenant_matches_project;"
  echo "   ✓ suspensas"

  restore_parte "dados de public" --section=data --schema=public

  banner "CHECKs recolocadas (valida os dados carregados)"
  psql_do "alter table public.project_files
             add constraint project_files_tenant_matches_project
             check (public.project_child_tenant_matches(project_id, tenant_id));" \
    && echo "   ✓ project_files" || echo "   ❌ project_files — há linha com tenant divergente do projeto"
  psql_do "alter table public.project_folders
             add constraint project_folders_tenant_matches_project
             check (public.project_child_tenant_matches(project_id, tenant_id));" \
    && echo "   ✓ project_folders" || echo "   ❌ project_folders — há linha com tenant divergente do projeto"
}

etapa_buckets() {
  restore_parte "storage.buckets" --section=data --schema=storage --table=buckets --table=migrations
}

etapa_pos() { restore_parte "post-data de public (FKs, índices, policies)" --section=post-data --schema=public; }

etapa_storagepol() {
  # As 38 policies de storage.objects vivem no schema storage e não vêm com
  # --schema=public. Sem elas nenhum upload ou download funciona.
  # Os erros de "must be owner" nas tabelas de sistema do storage são esperados
  # e inofensivos: elas já vêm com RLS ligada no projeto novo.
  restore_parte "policies de storage" --section=post-data --schema=storage
}

etapa_final() {
  banner "desagendar crons"
  # Vêm no dump e mandam e-mail para gente real. No sombra, nenhum pode disparar.
  psql_do "do \$\$
    declare j record;
    begin
      for j in select jobname from cron.job loop
        perform cron.unschedule(j.jobname);
      end loop;
    exception when undefined_table or invalid_schema_name then
      null;
    end \$\$;" && echo "   ✓ ok"

  banner "remover stubs"
  # `drop owned by ... cascade` NÃO resolve: os stubs aparecem em DEFAULT
  # PRIVILEGES (pg_default_acl) herdados do dump, e o drop role falha com
  # "privileges for ... in schema X" enquanto isso existir. A ordem é:
  # 1) revogar os default privileges, 2) revogar os grants concretos,
  # 3) só então dropar o role.
  psql_do "do \$\$
    declare r record; tipo text;
    begin
      for r in select n.nspname, d.defaclobjtype
                 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
                where array_to_string(d.defaclacl, ',') like '%sandbox%' loop
        tipo := case r.defaclobjtype
                  when 'r' then 'TABLES' when 'S' then 'SEQUENCES'
                  when 'f' then 'FUNCTIONS' when 'T' then 'TYPES' end;
        if tipo is not null then
          execute format(
            'alter default privileges for role postgres in schema %I revoke all on %s from sandbox_exec, sandbox_exec_$ORIGIN_REF',
            r.nspname, tipo);
        end if;
      end loop;
    end \$\$;" >/dev/null 2>&1 && echo "   ✓ default privileges revogados"

  for r in sandbox_exec "sandbox_exec_$ORIGIN_REF"; do
    for esquema in public storage; do
      psql_do "revoke all on all tables in schema $esquema from $r;
               revoke all on all sequences in schema $esquema from $r;
               revoke all on all routines in schema $esquema from $r;
               revoke all on schema $esquema from $r;" >/dev/null 2>&1
    done
    psql_do "drop role if exists $r;" >/dev/null 2>&1 && echo "   ✓ $r removido"
  done

  banner "contagens no destino"
  psql_out "select (select count(*) from pg_tables   where schemaname='public')                     as tabelas,
                   (select count(*) from pg_policies where schemaname='public')                     as policies,
                   (select count(*) from pg_tables   where schemaname='public' and not rowsecurity) as sem_rls,
                   (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                     where n.nspname='public')                                                      as functions,
                   (select count(*) from auth.users)                                                as usuarios,
                   (select count(*) from storage.buckets)                                           as buckets;"
}

$PG/psql "$DSN" -At -c 'select 1' >/dev/null 2>"$LOG" || {
  echo "❌ não conectou:"; sed 's/^/   /' "$LOG" | head -3; exit 1; }
echo "✓ conexão OK — destino $TARGET_SUPABASE_URL"

case "$ETAPA" in
  roles|reset|extensoes|pre|auth|dados|buckets|pos|storagepol|final) : >"$LOG"; "etapa_$ETAPA" ;;
  todas) : >"$LOG"
         etapa_roles; etapa_reset; etapa_extensoes; etapa_pre; etapa_auth
         etapa_dados; etapa_buckets; etapa_pos; etapa_storagepol; etapa_final ;;
  *) echo "❌ etapa inválida: $ETAPA"; exit 1 ;;
esac

echo; echo "📄 log: $LOG (erros totais: $(conta_erros))"
