#!/usr/bin/env bash
#
# Instala o MCP de arquivos de projeto para quem não é desenvolvedor.
#
# Pergunta as credenciais em vez de recebê-las por argumento: senha em linha de
# comando fica no histórico do shell e vaza em qualquer print de tela.
#
#   bash apps/mcp-drive/install.sh

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SUPABASE_URL="https://vkriobpmolgopbbpqeky.supabase.co"
MICROSOFT_CLIENT_ID="53d51c7c-a706-4c82-ba99-63192a93202f"
MICROSOFT_TENANT_ID="a3d591d4-0b3e-4a17-9745-b78bcf007f74"

echo "→ Instalando o MCP de arquivos de projeto do Pulse"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js não encontrado. Instale em https://nodejs.org (versão 22 ou maior) e rode de novo."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "✗ Node.js $NODE_MAJOR é antigo demais. Precisa da versão 22 ou maior — o cliente do Supabase exige."
  exit 1
fi

# A chave sai do .env local — ela é um JWT e não é versionada, mesmo sendo
# pública. Quem não tem o repositório usa o instalador do release, que já vem
# preenchido pela CI.
ENV_FILE="$APP_DIR/../../.env"
PUBLISHABLE_KEY="$(grep -m1 '^VITE_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"

if [ -z "$PUBLISHABLE_KEY" ]; then
  echo "✗ Não encontrei VITE_SUPABASE_PUBLISHABLE_KEY no .env do repositório."
  echo "  Se você não é do time de desenvolvimento, use o instalador publicado:"
  echo "  curl -fsSL https://github.com/Origami-Lab-Organization/og-pulse/releases/latest/download/install.sh | bash"
  exit 1
fi

echo "→ Compilando..."
(cd "$APP_DIR" && npm install --silent && npm run build --silent)
echo "✓ Compilado"
echo

read -r -p "Seu e-mail do Pulse: " PULSE_EMAIL
read -r -s -p "Sua senha do Pulse: " PULSE_PASSWORD
echo
echo

if command -v claude >/dev/null 2>&1; then
  claude mcp remove og-pulse-drive >/dev/null 2>&1 || true
  claude mcp add og-pulse-drive \
    --env "SUPABASE_URL=$SUPABASE_URL" \
    --env "SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY" \
    --env "PULSE_EMAIL=$PULSE_EMAIL" \
    --env "PULSE_PASSWORD=$PULSE_PASSWORD" \
    --env "MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID" \
    --env "MICROSOFT_TENANT_ID=$MICROSOFT_TENANT_ID" \
    -- node "$APP_DIR/dist/index.js"
  echo "✓ Registrado no Claude Code"
fi

# Claude Desktop lê um JSON próprio. Mesclar com node evita destruir outros
# servidores que a pessoa já tenha configurado.
DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

if [ -d "$(dirname "$DESKTOP_CONFIG")" ]; then
  APP_DIR="$APP_DIR" \
  DESKTOP_CONFIG="$DESKTOP_CONFIG" \
  SUPABASE_URL="$SUPABASE_URL" \
  PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
  PULSE_EMAIL="$PULSE_EMAIL" \
  PULSE_PASSWORD="$PULSE_PASSWORD" \
  MICROSOFT_CLIENT_ID="$MICROSOFT_CLIENT_ID" \
  MICROSOFT_TENANT_ID="$MICROSOFT_TENANT_ID" \
  node -e '
    const fs = require("fs");
    const path = process.env.DESKTOP_CONFIG;
    let config = {};
    try { config = JSON.parse(fs.readFileSync(path, "utf-8")); } catch {}
    config.mcpServers = config.mcpServers || {};
    config.mcpServers["og-pulse-drive"] = {
      command: "node",
      args: [process.env.APP_DIR + "/dist/index.js"],
      env: {
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: process.env.PUBLISHABLE_KEY,
        PULSE_EMAIL: process.env.PULSE_EMAIL,
        PULSE_PASSWORD: process.env.PULSE_PASSWORD,
        MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
        MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID,
      },
    };
    fs.mkdirSync(require("path").dirname(path), { recursive: true });
    fs.writeFileSync(path, JSON.stringify(config, null, 2));
    fs.chmodSync(path, 0o600);
  '
  echo "✓ Registrado no Claude Desktop (reinicie o app)"
fi

# A skill ensina o Claude a operar isto: convenção de pastas da Origami, o que é
# o Pulse e como diagnosticar falha. Sem ela o MCP funciona, mas o agente não
# sabe o contexto nem como orientar quando algo quebra.
SKILL_SRC="$APP_DIR/../../.claude/skills/arquivos-de-projeto"
SKILL_DEST="$HOME/.claude/skills/arquivos-de-projeto"

if [ -d "$SKILL_SRC" ]; then
  mkdir -p "$(dirname "$SKILL_DEST")"
  rm -rf "$SKILL_DEST"
  cp -R "$SKILL_SRC" "$SKILL_DEST"
  echo "✓ Skill 'arquivos-de-projeto' instalada"
fi

echo
echo "Pronto. No Claude, peça: \"faz login na Microsoft\" — e siga a URL e o código."
