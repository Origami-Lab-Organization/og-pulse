#!/usr/bin/env bash
#
# Build da Vercel — aplica as migrations pendentes ANTES de buildar o frontend.
#
# Por que aqui e não num pipeline separado (ADR-0026): o deploy do frontend é
# feito pela Vercel. Migration num pipeline e deploy noutro é uma corrida sem
# primitiva de ordem — se a Vercel publicar primeiro, o frontend novo consulta
# coluna que ainda não existe e o usuário vê query falhando. Rodando aqui, a
# ordem é garantida e a falha é útil: migration quebrada derruba o build, e o
# frontend novo não entra no ar.
#
# Env vars necessárias no projeto da Vercel (apenas no ambiente Production):
#   SUPABASE_DB_URL  connection string do pooler, com a senha percent-encoded
#
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo "❌ SUPABASE_DB_URL não está definida no ambiente Production." >&2
    echo "   Sem ela não há como aplicar migration, e publicar o frontend" >&2
    echo "   sem saber o estado do schema é pior que falhar aqui." >&2
    exit 1
  fi

  echo "→ Production: aplicando migrations pendentes"
  # stdin fechado de propósito: o build não é interativo.
  npx supabase db push --db-url "$SUPABASE_DB_URL" < /dev/null
  echo "→ schema em dia"
else
  # Preview e development NUNCA aplicam migration: o build de uma branch
  # experimental não pode alterar o banco de produção.
  echo "→ VERCEL_ENV=${VERCEL_ENV:-local}: migrations não são aplicadas fora de produção"
fi

npm run build
