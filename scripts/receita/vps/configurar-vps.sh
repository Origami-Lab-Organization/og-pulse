#!/usr/bin/env bash
# Configura a VPS da base da Receita (ADR-0053) a partir do Mac, de ponta a ponta.
#   bash scripts/receita/vps/configurar-vps.sh
#
# Usa o pacote gerado em ~/.config/og-pulse (fora do repositório):
#   vps-pacote/   preparar-vps.sql, senhas.sql (só verificadores SCRAM), server.crt, server.key
#   receita-tls/  ac.crt (autoridade própria), ac.key
#   receita-api.env, receita-carga.env, receita-db.env.novo
# Pede a senha da chave SSH uma vez. Para e pergunta antes de recriar o container e antes da carga.
# Pode rodar de novo: cada etapa é reexecutável.
set -euo pipefail

IP=187.127.48.154
VPS=root@$IP
CFG="$HOME/.config/og-pulse"
PAC="$CFG/vps-pacote"
TLS="$CFG/receita-tls"
RAIZ="$(cd "$(dirname "$0")/../../.." && pwd)"
SOCK="/tmp/pulse-vps-$$"
TMP="$(mktemp -d)"
STAMP="$(date +%Y%m%d%H%M%S)"
PENDENTE=""

etapa() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok() { printf '   ✓ %s\n' "$*"; }
aviso() { printf '   ! %s\n' "$*"; PENDENTE="$PENDENTE\n   - $*"; }
falha() { printf '\n   ✗ %s\n\n' "$*" >&2; exit 1; }
perguntar() { local r; read -r -p "   $1 [s/N] " r; [[ "$r" == [sS] ]]; }
encerrar() { ssh -S "$SOCK" -O exit "$VPS" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap encerrar EXIT

for f in "$PAC/preparar-vps.sql" "$PAC/server.crt" "$PAC/server.key" \
         "$TLS/ac.crt" "$CFG/receita-api.env" "$CFG/receita-carga.env"; do
  [[ -f "$f" ]] || falha "Falta o arquivo $f. Peça ao Claude para gerar o pacote de novo."
done
docker info >/dev/null 2>&1 || falha "O Docker Desktop não está aberto. Abra-o e rode o script de novo."

# ---------------------------------------------------------------------------
etapa "1/8 Entrando na VPS (pode pedir a senha da chave SSH)"
ssh -M -S "$SOCK" -fN -o ControlPersist=yes -o ConnectTimeout=15 "$VPS" \
  || falha "Não consegui entrar na VPS."
vps() { ssh -S "$SOCK" "$VPS" "$@"; }
ok "conectado em $IP"

C="$(vps "docker ps --format '{{.Names}} {{.Ports}}'" | awk '/5432->5432/ {print $1}')"
[[ -n "$C" && "$(echo "$C" | wc -l | tr -d ' ')" == 1 ]] \
  || falha "Não achei um único container com a porta 5432. Containers: $(vps "docker ps --format '{{.Names}} {{.Ports}}'")"
ok "container do Postgres: $C"
sql() { vps "docker exec -i $C psql -U postgres -d cnpj -v ON_ERROR_STOP=1 -qtAX"; }

# ---------------------------------------------------------------------------
etapa "2/8 Schema pulse e usuários pulse_carga e pulse_api"
sql < "$PAC/preparar-vps.sql" >/dev/null
ok "schema e usuários criados"
if [[ -f "$PAC/senhas.sql" ]]; then
  sql < "$PAC/senhas.sql" >/dev/null
  rm -f "$PAC/senhas.sql"
  ok "senhas novas de pulse_carga, pulse_api e pulse_leitura definidas"
fi
if [[ -f "$CFG/receita-db.env.novo" ]]; then
  mv -f "$CFG/receita-db.env.novo" "$CFG/receita-db.env"
  ok "senha antiga do pulse_leitura (a do print) deixou de valer"
fi

# ---------------------------------------------------------------------------
etapa "3/8 Conexão cifrada (TLS) no Postgres"
DATA="$(echo "SHOW data_directory" | sql)"
vps "docker exec -i $C sh -c 'cat > $DATA/server.crt'" < "$PAC/server.crt"
vps "docker exec -i $C sh -c 'umask 077; cat > $DATA/server.key'" < "$PAC/server.key"
vps "docker exec $C sh -c 'chown postgres:postgres $DATA/server.crt $DATA/server.key && chmod 600 $DATA/server.key'"
printf "ALTER SYSTEM SET ssl_cert_file = '%s/server.crt';\nALTER SYSTEM SET ssl_key_file = '%s/server.key';\nALTER SYSTEM SET ssl = on;\nSELECT pg_reload_conf();\n" \
  "$DATA" "$DATA" | sql >/dev/null
sleep 2
if [[ "$(echo "SHOW ssl" | sql)" != on ]]; then
  ORIGEM="$(echo "SELECT source FROM pg_settings WHERE name = 'ssl'" | sql)"
  falha "O TLS não ligou (ssl definido por: $ORIGEM). Mande esta mensagem para o Claude."
fi
ok "TLS ligado, com o certificado da autoridade própria"

# ---------------------------------------------------------------------------
etapa "4/8 Regras de acesso (pg_hba.conf)"
HBA="$(echo "SHOW hba_file" | sql)"
vps "docker exec $C cat $HBA" > "$TMP/pg_hba.antes"
{
  grep -vE '^[[:space:]]*host' "$TMP/pg_hba.antes" || true
  cat <<'REGRAS'

# Pulse (ADR-0053) — a primeira regra que casa vale
# túnel SSH e rede do Docker: todos os usuários
host    all     all        127.0.0.1/32    scram-sha-256
host    all     all        172.16.0.0/12   scram-sha-256
# da internet: só pulse_api, só no banco cnpj, só por SSL
hostssl cnpj    pulse_api  0.0.0.0/0       scram-sha-256
hostssl cnpj    pulse_api  ::/0            scram-sha-256
# o resto que vier de fora é recusado
host    all     all        0.0.0.0/0       reject
host    all     all        ::/0            reject
REGRAS
} > "$TMP/pg_hba.novo"
vps "docker exec -i $C sh -c 'cp $HBA $HBA.antes-$STAMP && cat > $HBA'" < "$TMP/pg_hba.novo"
ERROS="$(echo "SELECT count(*) FROM pg_hba_file_rules WHERE error IS NOT NULL" | sql)"
if [[ "$ERROS" != 0 ]]; then
  vps "docker exec $C cp $HBA.antes-$STAMP $HBA"
  falha "As regras novas tinham erro; voltei o arquivo anterior. Mande esta mensagem para o Claude."
fi
echo "SELECT pg_reload_conf()" | sql >/dev/null
ok "só pulse_api entra de fora, e só cifrado (cópia do anterior: $HBA.antes-$STAMP)"

# ---------------------------------------------------------------------------
etapa "5/8 Porta 5432 aberta para a internet"
PORTA_OK=0
if vps "docker port $C 5432" | grep -q '^0\.0\.0\.0:5432$'; then
  PORTA_OK=1; ok "a porta já está publicada para fora"
else
  echo "   Hoje a porta está publicada assim: $(vps "docker port $C 5432" | tr '\n' ' ')"
  DIR="$(vps "docker inspect -f '{{index .Config.Labels \"com.docker.compose.project.working_dir\"}}' $C")"
  ARQ="$(vps "docker inspect -f '{{index .Config.Labels \"com.docker.compose.project.config_files\"}}' $C")"
  SERV="$(vps "docker inspect -f '{{index .Config.Labels \"com.docker.compose.service\"}}' $C")"
  if [[ -z "$DIR" || -z "$ARQ" ]]; then
    aviso "o container não foi criado pelo docker compose; a porta precisa ser aberta à mão (mande ao Claude a saída de: docker inspect $C)"
  elif ! vps "grep -q '127.0.0.1:5432:5432' $ARQ"; then
    aviso "não achei '127.0.0.1:5432:5432' em $ARQ; mande ao Claude a saída de: grep -n 5432 $ARQ"
  else
    echo "   Vou trocar 127.0.0.1:5432:5432 por 0.0.0.0:5432:5432 em $ARQ e recriar o container."
    echo "   O Postgres fica fora do ar por alguns segundos. Os dados não são apagados."
    if perguntar "Seguir?"; then
      COMPOSE="docker compose"; vps "docker compose version" >/dev/null 2>&1 || COMPOSE="docker-compose"
      vps "sed -i.antes-$STAMP 's/127\.0\.0\.1:5432:5432/0.0.0.0:5432:5432/' $ARQ && cd $DIR && $COMPOSE -f $ARQ up -d $SERV"
      for _ in $(seq 1 30); do vps "docker exec $C pg_isready -q" 2>/dev/null && break; sleep 2; done
      vps "docker exec $C pg_isready -q" || falha "O Postgres não voltou. Na VPS: cd $DIR && $COMPOSE logs --tail 50 $SERV"
      PORTA_OK=1; ok "container recriado, porta aberta (cópia do compose: $ARQ.antes-$STAMP)"
    else
      aviso "porta não foi aberta (você preferiu não recriar o container)"
    fi
  fi
fi
if vps "command -v ufw >/dev/null && ufw status | grep -q 'Status: active'"; then
  vps "ufw allow 5432/tcp" >/dev/null; ok "liberada no firewall ufw"
fi

# ---------------------------------------------------------------------------
etapa "6/8 Conferindo de fora, deste Mac"
# shellcheck disable=SC1091
source "$CFG/receita-api.env"
pg() { docker run --rm -v "$TLS/ac.crt:/ac.crt:ro" postgres:16-alpine psql -w -qtAX "$1" -c "select 1" 2>&1 || true; }
if [[ "$PORTA_OK" == 1 ]]; then
  R="$(pg "$RECEITA_DB_URL?sslmode=verify-full&sslrootcert=/ac.crt&connect_timeout=10")"
  if [[ "$R" == 1 ]]; then ok "pulse_api entra, cifrado e com o certificado conferido"
  elif echo "$R" | grep -qiE 'timeout|timed out'; then
    aviso "a porta 5432 não responde de fora: libere-a no painel de firewall do provedor da VPS e rode o script de novo"
  else falha "pulse_api não entrou: $R"; fi
  R="$(pg "$RECEITA_DB_URL?sslmode=disable&connect_timeout=10")"
  echo "$R" | grep -q 'no pg_hba.conf entry\|rejects connection' && ok "sem cifra: recusado" \
    || aviso "conexão sem cifra não foi recusada como esperado: $R"
  R="$(pg "postgres://postgres@$IP:5432/cnpj?sslmode=require&connect_timeout=10")"
  if echo "$R" | grep -q 'rejects connection\|no pg_hba.conf entry'; then ok "usuário postgres de fora: recusado"
  elif echo "$R" | grep -qiE 'timeout|timed out'; then :
  else falha "ATENÇÃO: o usuário postgres não foi recusado de fora ($R). Feche a porta e chame o Claude."; fi
else
  aviso "teste de fora pulado: a porta ainda não está aberta"
fi

# ---------------------------------------------------------------------------
etapa "7/8 Edge Function empresas-receita no Supabase"
cd "$RAIZ"
if ! npx supabase functions list >/dev/null 2>&1; then
  echo "   O Supabase pediu login com uma conta que tenha acesso ao projeto do Pulse."
  npx supabase login
fi
if npx supabase functions list >/dev/null 2>&1; then
  npx supabase secrets set "RECEITA_DB_URL=$RECEITA_DB_URL" >/dev/null
  npx supabase secrets set "RECEITA_DB_CA=$(cat "$TLS/ac.crt")" >/dev/null
  ok "segredos RECEITA_DB_URL e RECEITA_DB_CA definidos"
  npx supabase functions deploy empresas-receita
  ok "função publicada"
else
  aviso "Supabase: esta conta não tem acesso ao projeto; segredos e publicação ficaram para depois"
fi

# ---------------------------------------------------------------------------
etapa "8/8 Carga das empresas no recorte (cerca de 15 minutos)"
if perguntar "Rodar a carga agora?"; then
  if ! lsof -nP -iTCP:5433 -sTCP:LISTEN >/dev/null 2>&1; then
    ssh -S "$SOCK" -O forward -L 5433:localhost:5432 "$VPS" >/dev/null
  fi
  npx vite-node scripts/receita/sincronizar-base.ts -- --aplicar
  ok "carga concluída"
else
  aviso "carga não rodada"
fi

printf '\n\033[1m== Fim.\033[0m\n'
if [[ -n "$PENDENTE" ]]; then printf "   Ficou pendente:$PENDENTE\n"; else echo "   Tudo feito. Avise o Claude para medir."; fi
