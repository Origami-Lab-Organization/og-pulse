#!/usr/bin/env bash
#
# Instala o Pulse no seu chat. Não precisa do repositório, de git, de npm nem de saber
# programar — só do Node instalado.
#
#   curl -fsSL https://origamipulse.com.br/mcp/install.sh | bash
#
# O que este script faz, na ordem:
#   1. confere o Node;
#   2. baixa os dois servidores já empacotados, do mesmo site do Pulse;
#   3. pergunta seu e-mail e senha do Pulse — digitados, nunca por argumento, porque senha
#      em linha de comando fica no histórico do shell e vaza em qualquer print de tela;
#   4. confere as credenciais ANTES de gravar configuração, para o erro aparecer aqui e não
#      depois, no meio de uma conversa;
#   5. registra os dois servidores no Claude Code e no Claude Desktop, mesclando o JSON para
#      não apagar outros MCPs que você já tenha;
#   6. testa os dois e diz o que fazer em seguida.
#
# O acesso é SEU: os servidores entram com as suas credenciais e obedecem às mesmas regras
# do banco que a tela obedece. Nenhum dos dois usa chave de serviço, então não existe
# atalho por fora do seu perfil.
set -euo pipefail

BASE="${1:-${PULSE_MCP_BASE:-https://origamipulse.com.br}}"
BASE="${BASE%/}"
DEST="$HOME/.og-pulse/bin"

# A chave publicável e os ids da Microsoft ficam aqui de propósito: a chave já vai no bundle
# público do site, então qualquer pessoa a lê abrindo o JavaScript. O controle de acesso é a
# RLS, não o sigilo dela.
SUPABASE_URL="https://vkriobpmolgopbbpqeky.supabase.co"
PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmlvYnBtb2xnb3BiYnBxZWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NDMzMzksImV4cCI6MjA4NDUxOTMzOX0.z15Rvj4FN9_OtoERF6ptKlaI4zYDkLh-8OvjL2teljk"
MICROSOFT_CLIENT_ID="53d51c7c-a706-4c82-ba99-63192a93202f"
MICROSOFT_TENANT_ID="a3d591d4-0b3e-4a17-9745-b78bcf007f74"

falha() { printf '\n✗ %s\n' "$1" >&2; exit 1; }

printf '→ Instalando o Pulse no seu chat\n\n'

command -v node >/dev/null 2>&1 || falha "Node.js não encontrado. Instale em https://nodejs.org (versão 20 ou maior) e rode de novo."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || falha "Node.js $NODE_MAJOR é antigo demais. Precisa da versão 20 ou maior."
command -v curl >/dev/null 2>&1 || falha "curl não encontrado."

mkdir -p "$DEST"
chmod 700 "$HOME/.og-pulse"

printf '→ Baixando os servidores de %s\n' "$BASE"
for srv in og-pulse-drive og-pulse-activities; do
  curl -fsSL "$BASE/mcp/$srv.mjs" -o "$DEST/$srv.mjs" \
    || falha "não consegui baixar $srv de $BASE. Confira a conexão, ou se o endereço do Pulse está certo."
  # Arquivo pequeno demais é página de erro salva como se fosse o programa.
  BYTES="$(wc -c < "$DEST/$srv.mjs" | tr -d ' ')"
  [ "$BYTES" -gt 200000 ] || falha "o download de $srv veio incompleto ($BYTES bytes). Rode de novo."
  chmod 644 "$DEST/$srv.mjs"
  printf '   ✓ %s\n' "$srv"
done

# Em `curl ... | bash` a entrada padrão É O SCRIPT, então `read` não encontra o terminal e
# a instalação morre antes de perguntar qualquer coisa. Ler de /dev/tty resolve, e é por
# isso que este bloco não usa o `read` simples.
#
# Sem terminal nenhum (automação, imagem de máquina), as credenciais podem vir do ambiente.
# Nunca por argumento: argumento fica no histórico do shell e aparece em `ps`.
PULSE_EMAIL="${PULSE_EMAIL:-}"
PULSE_PASSWORD="${PULSE_PASSWORD:-}"

if [ -z "$PULSE_EMAIL" ] || [ -z "$PULSE_PASSWORD" ]; then
  if [ -r /dev/tty ]; then
    printf '\n→ Suas credenciais do Pulse (as mesmas do site)\n'
    [ -n "$PULSE_EMAIL" ] || { read -r -p "   E-mail: " PULSE_EMAIL < /dev/tty; }
    if [ -z "$PULSE_PASSWORD" ]; then
      read -r -s -p "   Senha: " PULSE_PASSWORD < /dev/tty
      printf '\n'
    fi
  else
    falha "sem terminal para perguntar as credenciais. Rode com PULSE_EMAIL e PULSE_PASSWORD no ambiente, ou baixe o instalador e execute: curl -fsSL $BASE/mcp/install.sh -o install.sh && bash install.sh"
  fi
fi

[ -n "$PULSE_EMAIL" ] && [ -n "$PULSE_PASSWORD" ] || falha "e-mail e senha são obrigatórios."

# Conferir agora evita o pior modo de falha: instalar com senha errada e a pessoa descobrir
# no meio de uma conversa, sem saber que o problema é a senha.
printf '→ Conferindo as credenciais\n'
LOGIN_JSON="$(
  PULSE_EMAIL="$PULSE_EMAIL" PULSE_PASSWORD="$PULSE_PASSWORD" node -e '
    process.stdout.write(JSON.stringify({ email: process.env.PULSE_EMAIL, password: process.env.PULSE_PASSWORD }));
  '
)"
HTTP_CODE="$(
  printf '%s' "$LOGIN_JSON" | curl -s -o /dev/null -w '%{http_code}' \
    -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $PUBLISHABLE_KEY" \
    -H "Content-Type: application/json" \
    --data @-
)"
case "$HTTP_CODE" in
  200) printf '   ✓ credenciais conferidas\n' ;;
  400|401) falha "e-mail ou senha não conferem. Rode de novo com os dados que você usa no site." ;;
  *) falha "não consegui falar com o Pulse (HTTP $HTTP_CODE). Tente mais tarde." ;;
esac

registra_claude_code() {
  command -v claude >/dev/null 2>&1 || return 0
  printf '→ Registrando no Claude Code\n'
  claude mcp remove og-pulse-drive >/dev/null 2>&1 || true
  claude mcp add og-pulse-drive \
    -e "SUPABASE_URL=$SUPABASE_URL" \
    -e "SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY" \
    -e "PULSE_EMAIL=$PULSE_EMAIL" \
    -e "PULSE_PASSWORD=$PULSE_PASSWORD" \
    -e "MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID" \
    -e "MICROSOFT_TENANT_ID=$MICROSOFT_TENANT_ID" \
    -- node "$DEST/og-pulse-drive.mjs" >/dev/null
  claude mcp remove og-pulse-activities >/dev/null 2>&1 || true
  claude mcp add og-pulse-activities \
    -e "SUPABASE_URL=$SUPABASE_URL" \
    -e "SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY" \
    -e "PULSE_EMAIL=$PULSE_EMAIL" \
    -e "PULSE_PASSWORD=$PULSE_PASSWORD" \
    -- node "$DEST/og-pulse-activities.mjs" >/dev/null
  printf '   ✓ Claude Code\n'
}

registra_claude_desktop() {
  local cfg
  case "$(uname -s)" in
    Darwin) cfg="$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
    Linux)  cfg="$HOME/.config/Claude/claude_desktop_config.json" ;;
    *)      return 0 ;;
  esac
  mkdir -p "$(dirname "$cfg")"
  printf '→ Registrando no Claude Desktop\n'
  # Mesclar com node, não sobrescrever: quem já tem outros MCPs não os perde.
  CFG_PATH="$cfg" DEST="$DEST" SUPABASE_URL="$SUPABASE_URL" PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
  PULSE_EMAIL="$PULSE_EMAIL" PULSE_PASSWORD="$PULSE_PASSWORD" \
  MICROSOFT_CLIENT_ID="$MICROSOFT_CLIENT_ID" MICROSOFT_TENANT_ID="$MICROSOFT_TENANT_ID" node -e '
    const fs = require("fs");
    const p = process.env.CFG_PATH;
    let cfg = {};
    if (fs.existsSync(p)) {
      try { cfg = JSON.parse(fs.readFileSync(p, "utf8")); }
      catch { 
        fs.copyFileSync(p, p + ".bak");
        console.error("   ! configuração anterior ilegível; salvei uma cópia em " + p + ".bak");
        cfg = {};
      }
    }
    cfg.mcpServers = cfg.mcpServers || {};
    const comum = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: process.env.PUBLISHABLE_KEY,
      PULSE_EMAIL: process.env.PULSE_EMAIL,
      PULSE_PASSWORD: process.env.PULSE_PASSWORD,
    };
    cfg.mcpServers["og-pulse-drive"] = {
      command: "node",
      args: [process.env.DEST + "/og-pulse-drive.mjs"],
      env: { ...comum, MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID },
    };
    cfg.mcpServers["og-pulse-activities"] = {
      command: "node",
      args: [process.env.DEST + "/og-pulse-activities.mjs"],
      env: { ...comum },
    };
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
    // `mode` só vale na criação: em arquivo que já existia o modo antigo fica. E este
    // arquivo passa a ter a sua senha do Pulse dentro.
    fs.chmodSync(p, 0o600);
  '
  printf '   ✓ Claude Desktop\n'
}

registra_claude_code
registra_claude_desktop

printf '\n→ Testando\n'
for srv in og-pulse-drive og-pulse-activities; do
  N="$(
    printf '%s\n%s\n' \
      '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"instalador","version":"1"}}}' \
      '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
    | SUPABASE_URL="$SUPABASE_URL" SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
      PULSE_EMAIL="$PULSE_EMAIL" PULSE_PASSWORD="$PULSE_PASSWORD" \
      MICROSOFT_CLIENT_ID="$MICROSOFT_CLIENT_ID" MICROSOFT_TENANT_ID="$MICROSOFT_TENANT_ID" \
      node "$DEST/$srv.mjs" 2>/dev/null \
    | node -e '
        let buf = "";
        process.stdin.on("data", (d) => (buf += d));
        process.stdin.on("end", () => {
          for (const line of buf.split("\n")) {
            if (!line.trim()) continue;
            try {
              const m = JSON.parse(line);
              if (m.id === 2 && m.result?.tools) return process.stdout.write(String(m.result.tools.length));
            } catch { /* linha parcial */ }
          }
          process.stdout.write("0");
        });
      '
  )"
  [ "${N:-0}" -gt 0 ] || falha "$srv não respondeu. Rode de novo; se persistir, mande esta mensagem para quem cuida do Pulse."
  printf '   ✓ %s — %s ferramentas\n' "$srv" "$N"
done

cat <<'FIM'

✓ Pronto.

Reinicie o Claude Desktop (feche e abra) e experimente pedir:

   "Quais projetos eu tenho em andamento?"
   "Como está a sprint atual do projeto <nome>?"

Para chegar nos arquivos do projeto, autorize sua conta Microsoft uma vez:

   "Inicia o login da Microsoft"

Se algo não funcionar, a Central de Ajuda do Pulse tem o passo a passo em
Ajuda → Usar o Pulse pelo chat.
FIM
