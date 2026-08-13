#!/usr/bin/env bash
#
# Instalador do MCP de arquivos de projeto do Pulse.
#
# Não exige o repositório: baixa o servidor já compilado do último release.
# Quem só quer subir arquivo não precisa do código do Pulse na máquina.
#
#   gh release download --repo Origami-Lab-Organization/og-pulse \
#     --pattern install.sh --output /tmp/install.sh --clobber && bash /tmp/install.sh
#
# Usa o gh, nao curl: o repositorio e privado e asset de release privado exige
# autenticacao. O gh ja resolve isso com o login que a pessoa tem.

set -euo pipefail

REPO="Origami-Lab-Organization/og-pulse"

INSTALL_DIR="$HOME/.og-pulse/mcp-drive"
SERVER_PATH="$INSTALL_DIR/og-pulse-mcp-drive.mjs"
SKILL_DIR="$HOME/.claude/skills/arquivos-de-projeto"

# Os placeholders abaixo sao substituidos pela CI na publicacao do release.
# Ficam como marcador no repositorio de proposito: a chave publicavel e um JWT e
# nao deve ser versionada, mesmo sendo publica (ela ja vai no bundle do site).
SUPABASE_URL="__SUPABASE_URL__"
SUPABASE_PUBLISHABLE_KEY="__SUPABASE_PUBLISHABLE_KEY__"
MICROSOFT_CLIENT_ID="__MICROSOFT_CLIENT_ID__"
MICROSOFT_TENANT_ID="__MICROSOFT_TENANT_ID__"

INSTALL_CMD="gh release download --repo $REPO --pattern install.sh --output /tmp/install.sh --clobber && bash /tmp/install.sh"

if [ "$SUPABASE_URL" = "__SUPABASE_URL__" ]; then
  echo "✗ Este script é um template do repositório, sem os valores preenchidos."
  echo "  Use o instalador publicado:"
  echo "  $INSTALL_CMD"
  exit 1
fi

echo "→ Instalando o MCP de arquivos de projeto do Pulse"
echo

if ! command -v gh >/dev/null 2>&1; then
  echo "✗ GitHub CLI (gh) não encontrado — ele é necessário porque o repositório é privado."
  echo "  Instale com:  brew install gh"
  echo "  Depois entre com:  gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "✗ Você não está autenticado no GitHub."
  echo "  Rode:  gh auth login"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js não encontrado."
  echo "  Instale em https://nodejs.org (escolha a opção LTS) e rode este comando de novo."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "✗ Node.js $NODE_MAJOR é antigo demais. Precisa da versão 22 ou maior — o cliente do Supabase exige."
  exit 1
fi

echo "→ Baixando o servidor..."
mkdir -p "$INSTALL_DIR"
gh release download --repo "$REPO" --pattern og-pulse-mcp-drive.mjs \
  --output "$SERVER_PATH" --clobber

# A skill ensina o Claude a convenção de pastas da Origami, o que é o Pulse e
# como diagnosticar falha. Sem ela o MCP funciona, mas o agente não sabe o
# contexto nem como orientar quando algo quebra.
mkdir -p "$SKILL_DIR"
gh release download --repo "$REPO" --pattern SKILL.md \
  --output "$SKILL_DIR/SKILL.md" --clobber
echo "✓ Baixado"
echo

PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY"

read -r -p "Seu e-mail do Pulse: " PULSE_EMAIL
# -s: a senha não aparece na tela nem entra no histórico do shell.
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
    -- node "$SERVER_PATH"
  echo "✓ Registrado no Claude Code"
fi

DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

if [ -d "$(dirname "$DESKTOP_CONFIG")" ]; then
  # Mesclar com node evita apagar outros servidores já configurados.
  DESKTOP_CONFIG="$DESKTOP_CONFIG" \
  SERVER_PATH="$SERVER_PATH" \
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
      args: [process.env.SERVER_PATH],
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
  echo "✓ Registrado no Claude Desktop (feche e abra o app)"
fi

echo
echo "Pronto. No Claude, peça: \"faz login na Microsoft\" — e siga a URL e o código."
