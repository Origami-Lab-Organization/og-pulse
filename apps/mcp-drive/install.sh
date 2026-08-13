#!/usr/bin/env bash
#
# Instala o MCP de arquivos de projeto do Pulse.
#
# Funciona dos dois jeitos, detectando sozinho onde está:
#
#   - dentro do repositório og-pulse: compila do código-fonte
#   - solto em qualquer pasta: baixa o servidor pronto do release
#
# A detecção existe porque antes havia dois scripts parecidos, e o que ficava
# visível no repositório era justamente o que não funcionava sozinho — quem
# recebia uma cópia por mensagem batia em erro de package.json ausente.
#
#   gh release download --repo Origami-Lab-Organization/og-pulse \
#     --pattern install.sh --output /tmp/install.sh --clobber && bash /tmp/install.sh

set -euo pipefail

REPO="Origami-Lab-Organization/og-pulse"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/.og-pulse/mcp-drive"
SKILL_DIR="$HOME/.claude/skills/arquivos-de-projeto"

# Preenchidos pela CI ao publicar o release. No repositório ficam como marcador:
# a chave publicável é um JWT e não é versionada, mesmo sendo pública.
SUPABASE_URL="__SUPABASE_URL__"
SUPABASE_PUBLISHABLE_KEY="__SUPABASE_PUBLISHABLE_KEY__"
MICROSOFT_CLIENT_ID="__MICROSOFT_CLIENT_ID__"
MICROSOFT_TENANT_ID="__MICROSOFT_TENANT_ID__"

# Rodando de dentro do repositório? O package.json ao lado é o sinal.
IS_SOURCE_CHECKOUT=false
[ -f "$APP_DIR/package.json" ] && IS_SOURCE_CHECKOUT=true

echo "→ Instalando o MCP de arquivos de projeto do Pulse"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js não encontrado."
  echo "  Instale em https://nodejs.org (escolha a opção LTS) e rode de novo."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "✗ Node.js $NODE_MAJOR é antigo demais. Precisa da versão 22 ou maior — o cliente do Supabase exige."
  exit 1
fi

# ── Identificadores ───────────────────────────────────────────────────────────
# Ordem: valores do release, .env do repositório, pergunta. Nunca aborta sem
# antes perguntar — a versão anterior desistia e virava beco sem saída.

if [ "$SUPABASE_URL" = "__SUPABASE_URL__" ]; then
  SUPABASE_URL="https://vkriobpmolgopbbpqeky.supabase.co"
  MICROSOFT_CLIENT_ID="53d51c7c-a706-4c82-ba99-63192a93202f"
  MICROSOFT_TENANT_ID="a3d591d4-0b3e-4a17-9745-b78bcf007f74"
  SUPABASE_PUBLISHABLE_KEY=""
fi

PUBLISHABLE_KEY="${SUPABASE_PUBLISHABLE_KEY:-}"

if [ -z "$PUBLISHABLE_KEY" ] && [ "$IS_SOURCE_CHECKOUT" = true ]; then
  ENV_FILE="$APP_DIR/../../.env"
  PUBLISHABLE_KEY="$(grep -m1 '^VITE_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
fi

if [ -z "$PUBLISHABLE_KEY" ]; then
  echo "Não achei a chave publicável do Supabase automaticamente."
  echo "Ela está no .env do projeto, em VITE_SUPABASE_PUBLISHABLE_KEY (começa com eyJ)."
  read -r -p "Cole a chave aqui: " PUBLISHABLE_KEY
fi

if [ -z "$PUBLISHABLE_KEY" ]; then
  echo "✗ Sem a chave não dá para continuar."
  exit 1
fi

# ── Servidor ──────────────────────────────────────────────────────────────────

mkdir -p "$INSTALL_DIR" "$SKILL_DIR"

if [ "$IS_SOURCE_CHECKOUT" = true ]; then
  # Sem --silent: na primeira vez o npm baixa dependências e demora. Sem saída
  # nenhuma isso parece travamento, e a pessoa mata o processo no meio.
  echo "→ Instalando dependências (a primeira vez demora)..."
  (cd "$APP_DIR" && npm install --no-fund --no-audit)
  echo "→ Compilando..."
  (cd "$APP_DIR" && npm run build)
  SERVER_PATH="$APP_DIR/dist/index.js"
  cp -R "$APP_DIR/../../.claude/skills/arquivos-de-projeto/." "$SKILL_DIR/" 2>/dev/null || true
  echo "✓ Compilado"
else
  if ! command -v gh >/dev/null 2>&1; then
    echo "✗ GitHub CLI (gh) não encontrado — necessário porque o repositório é privado."
    echo "  macOS:  brew install gh"
    echo "  Fedora: sudo dnf install gh"
    echo "  Depois: gh auth login"
    exit 1
  fi

  if ! gh auth status >/dev/null 2>&1; then
    echo "✗ Você não está autenticado no GitHub. Rode:  gh auth login"
    exit 1
  fi

  echo "→ Baixando o servidor..."
  SERVER_PATH="$INSTALL_DIR/og-pulse-mcp-drive.mjs"
  gh release download --repo "$REPO" --pattern og-pulse-mcp-drive.mjs \
    --output "$SERVER_PATH" --clobber
  gh release download --repo "$REPO" --pattern SKILL.md \
    --output "$SKILL_DIR/SKILL.md" --clobber
  echo "✓ Baixado"
fi

echo

# ── Credenciais e registro ────────────────────────────────────────────────────

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

# O caminho do Claude Desktop muda por sistema — Linux não usa o do macOS.
case "$(uname -s)" in
  Darwin) DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
  *) DESKTOP_CONFIG="$HOME/.config/Claude/claude_desktop_config.json" ;;
esac

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
