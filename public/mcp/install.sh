#!/usr/bin/env bash
#
# Instala o Pulse no seu chat. Não precisa do repositório, de git, de npm nem de saber
# programar — só do Node instalado.
#
#   curl -fsSL https://origamipulse.com.br/mcp/install.sh | bash
#
# No Windows, dentro do Git Bash — vem com o Git para Windows, em
# https://git-scm.com/download/win (o PowerShell não executa este arquivo). Ali o bash enxerga
# /c/Users/Fulano enquanto o Claude, que é programa nativo do Windows, só abre
# C:\Users\Fulano — a tradução entre os dois está marcada nos pontos em que acontece.
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

# No Windows este script só roda dentro do Git Bash, e ali o bash mente sobre o mundo: ele
# enxerga /c/Users/Fulano, enquanto o Claude Desktop e o Claude Code são processos nativos
# do Windows, que só abrem C:\Users\Fulano. Instalar sem traduzir isso grava uma
# configuração que parece certa e nunca sobe — foi o que aconteceu.
SISTEMA="$(uname -s)"
case "$SISTEMA" in
  MINGW*|MSYS*|CYGWIN*) WINDOWS=1 ;;
  *)                    WINDOWS=0 ;;
esac

# Caminho como quem vai EXECUTAR o servidor precisa dele, não como o bash o escreve.
para_o_cliente() {
  if [ "$WINDOWS" = 1 ] && command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s' "$1"
  fi
}

printf '→ Instalando o Pulse no seu chat\n\n'

# "Instale em nodejs.org e rode de novo" é verdade e não ajuda: quem recebe essa linha não
# sabe qual dos downloads pegar, e no Windows ainda cai na pegadinha de o Node não aparecer
# no Git Bash que já estava aberto. Instrução que não desbloqueia é a mesma coisa que erro.
falta_node() {
  printf '\n✗ %s\n\n' "$1" >&2
  printf 'O Node.js é o programa que executa os servidores do Pulse — sem ele o chat não tem\n' >&2
  printf 'o que abrir. Instalar leva dois minutos, e é uma vez só nesta máquina:\n\n' >&2
  printf '   1. abra https://nodejs.org/en/download\n' >&2
  if [ "$WINDOWS" = 1 ]; then
    printf '   2. baixe o instalador do Windows (LTS) e avance até o fim\n' >&2
    printf '   3. FECHE este Git Bash e abra um novo — o Node só aparece em terminal novo\n' >&2
  else
    printf '   2. baixe a versão LTS do seu sistema e conclua a instalação\n' >&2
    printf '   3. feche este terminal e abra um novo\n' >&2
  fi
  printf '   4. cole o comando do Pulse de novo\n\n' >&2
  exit 1
}

command -v node >/dev/null 2>&1 || falta_node "Node.js não encontrado nesta máquina."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || falta_node "Node.js $NODE_MAJOR é antigo demais — o Pulse precisa da versão 20 ou maior."
command -v curl >/dev/null 2>&1 || falha "curl não encontrado."

# O Claude Desktop lança o servidor SEM shell: ele não tem o PATH do seu terminal. Quem
# instalou o Node por fnm ou nvm-windows tem o node só no PATH da sessão, e o servidor nunca
# sobe — "o chat não vê o Pulse", sem erro em lugar nenhum.
#
# Quem responde onde o node está é o próprio node, não uma heurística sobre `command -v`:
# aquele devolve o atalho `.cmd` dos gerenciadores de versão, que o Claude Desktop não
# executa; `process.execPath` devolve o executável de verdade, e no Git Bash já vem no
# formato nativo do Windows, sem precisar de tradução.
NODE_CLIENTE="node"
if [ "$WINDOWS" = 1 ]; then
  NODE_CLIENTE="$(node -p 'process.execPath' 2>/dev/null || printf 'node')"
  [ -n "$NODE_CLIENTE" ] || NODE_CLIENTE="node"
fi

# No WSL o instalador funciona, mas instala dentro do Linux: o Claude Desktop do Windows
# não enxerga este disco nem este node. Sem este aviso o sintoma é idêntico ao de uma
# instalação quebrada, e a pessoa procura o problema no lugar errado.
if [ "$WINDOWS" = 0 ] && [ "$SISTEMA" = "Linux" ] && grep -qi microsoft /proc/version 2>/dev/null; then
  printf '   ! Você está no WSL. Isto instala para o Claude Code do WSL.\n'
  printf '     Para o Claude Desktop do Windows, rode este mesmo comando no Git Bash.\n\n'
fi

mkdir -p "$DEST"
chmod 700 "$HOME/.og-pulse"

DRIVE_CLIENTE="$(para_o_cliente "$DEST/og-pulse-drive.mjs")"
ACTIVITIES_CLIENTE="$(para_o_cliente "$DEST/og-pulse-activities.mjs")"

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

REGISTROU=0

registra_claude_code() {
  if ! command -v claude >/dev/null 2>&1; then
    # Antes isto era um `return 0` mudo. Quem usa o Claude Code e o tem fora do PATH deste
    # shell ficava sem registro nenhum e sem nenhuma pista disso.
    printf '   ! não encontrei o comando `claude` neste terminal — pulei o Claude Code.\n'
    printf '     Se você usa o Claude Code, abra o terminal onde ele funciona e rode de novo.\n'
    return 0
  fi
  printf '→ Registrando no Claude Code\n'
  # `-s user`: sem isto o `claude mcp add` grava no escopo LOCAL, que vale só na pasta em que
  # este terminal está aberto. O card promete "uma vez por computador", e escopo local
  # entrega o oposto: a pessoa instala em C:\Users\Fulano, abre o Claude Code num projeto
  # qualquer e o Pulse não existe ali. Foi assim que a instalação no Windows "sumiu".
  claude mcp remove og-pulse-drive -s user >/dev/null 2>&1 || true
  claude mcp remove og-pulse-drive >/dev/null 2>&1 || true
  claude mcp add -s user og-pulse-drive \
    -e "SUPABASE_URL=$SUPABASE_URL" \
    -e "SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY" \
    -e "PULSE_EMAIL=$PULSE_EMAIL" \
    -e "PULSE_PASSWORD=$PULSE_PASSWORD" \
    -e "MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID" \
    -e "MICROSOFT_TENANT_ID=$MICROSOFT_TENANT_ID" \
    -- "$NODE_CLIENTE" "$DRIVE_CLIENTE" >/dev/null
  claude mcp remove og-pulse-activities -s user >/dev/null 2>&1 || true
  claude mcp remove og-pulse-activities >/dev/null 2>&1 || true
  claude mcp add -s user og-pulse-activities \
    -e "SUPABASE_URL=$SUPABASE_URL" \
    -e "SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY" \
    -e "PULSE_EMAIL=$PULSE_EMAIL" \
    -e "PULSE_PASSWORD=$PULSE_PASSWORD" \
    -- "$NODE_CLIENTE" "$ACTIVITIES_CLIENTE" >/dev/null
  REGISTROU=1
  printf '   ✓ Claude Code — vale em qualquer pasta\n'
}

# Onde o Claude Desktop procura a configuração. No Windows pode ser MAIS DE UM lugar, e foi
# isso que derrubou a primeira instalação real: a versão baixada do site lê
# %APPDATA%\Claude, mas a versão instalada pela Microsoft Store roda em container MSIX, e ali
# o Windows REDIRECIONA o %APPDATA% do aplicativo para
# %LOCALAPPDATA%\Packages\Claude_<id>\LocalCache\Roaming\Claude.
#
# Escrever só no caminho comum deixa quem instalou pela Store com uma configuração perfeita
# num lugar que o programa nunca abre: nenhum erro, nenhum log, nenhuma pista — só o Pulse
# que não aparece. Por isso aqui se escreve em todos os que existirem.
caminhos_de_configuracao() {
  local roaming local_app pkg
  case "$SISTEMA" in
    Darwin) printf '%s\n' "$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
    Linux)  printf '%s\n' "$HOME/.config/Claude/claude_desktop_config.json" ;;
    MINGW*|MSYS*|CYGWIN*)
      # %APPDATA% e %LOCALAPPDATA% chegam no formato do Windows (C:\Users\...). O bash precisa
      # da forma POSIX para criar as pastas; o node recebe a nativa, mais adiante.
      roaming="${APPDATA:-}"
      if [ -n "$roaming" ] && command -v cygpath >/dev/null 2>&1; then
        roaming="$(cygpath -u "$roaming")"
      fi
      [ -n "$roaming" ] || roaming="$HOME/AppData/Roaming"
      printf '%s\n' "$roaming/Claude/claude_desktop_config.json"

      local_app="${LOCALAPPDATA:-}"
      if [ -n "$local_app" ] && command -v cygpath >/dev/null 2>&1; then
        local_app="$(cygpath -u "$local_app")"
      fi
      [ -n "$local_app" ] || local_app="$HOME/AppData/Local"
      # O glob não casa nada quando não há instalação da Store: o teste descarta o literal.
      for pkg in "$local_app/Packages"/Claude_*; do
        [ -d "$pkg/LocalCache/Roaming" ] || continue
        printf '%s\n' "$pkg/LocalCache/Roaming/Claude/claude_desktop_config.json"
      done
      ;;
  esac
}

grava_configuracao() {
  local cfg="$1"
  mkdir -p "$(dirname "$cfg")"
  # Mesclar com node, não sobrescrever: quem já tem outros MCPs não os perde.
  #
  # O node é o do sistema: no Git Bash é node.exe, que não abre "/c/Users/...". Argumento de
  # linha de comando o MSYS converte sozinho, variável de ambiente NÃO — por isso o caminho
  # da configuração e os dos servidores vão daqui já traduzidos.
  CFG_PATH="$(para_o_cliente "$cfg")" \
  DRIVE_PATH="$DRIVE_CLIENTE" ACTIVITIES_PATH="$ACTIVITIES_CLIENTE" NODE_CMD="$NODE_CLIENTE" \
  SUPABASE_URL="$SUPABASE_URL" PUBLISHABLE_KEY="$PUBLISHABLE_KEY" \
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
      command: process.env.NODE_CMD,
      args: [process.env.DRIVE_PATH],
      env: { ...comum, MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID },
    };
    cfg.mcpServers["og-pulse-activities"] = {
      command: process.env.NODE_CMD,
      args: [process.env.ACTIVITIES_PATH],
      env: { ...comum },
    };
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
    // `mode` só vale na criação: em arquivo que já existia o modo antigo fica. E este
    // arquivo passa a ter a sua senha do Pulse dentro.
    fs.chmodSync(p, 0o600);
  '
  REGISTROU=1
  printf '   ✓ %s\n' "$cfg"
}

registra_claude_desktop() {
  local cfg achou=0
  printf '→ Registrando no Claude Desktop\n'
  # fd 3 em vez de stdin: o bloco de gravação não pode consumir a lista de caminhos.
  while IFS= read -r cfg <&3; do
    [ -n "$cfg" ] || continue
    achou=1
    grava_configuracao "$cfg"
  done 3<<< "$(caminhos_de_configuracao)"

  if [ "$achou" = 0 ]; then
    # Em sistema desconhecido o script não grava nada; dizer isso evita o "✓ Pronto" que
    # manda a pessoa reiniciar um programa que nunca recebeu configuração nenhuma.
    printf '   ! não sei onde fica a configuração do Claude Desktop em %s — pulei esta parte.\n' "$SISTEMA"
  fi
}

registra_claude_code
registra_claude_desktop

# Os servidores baixados não servem de nada se nenhum cliente sabe deles. Seguir daqui só
# produziria o "✓ Pronto" que já enganou uma instalação inteira no Windows.
[ "$REGISTROU" = 1 ] || falha "baixei os servidores, mas não encontrei onde registrá-los: nem o comando \`claude\` no PATH, nem a pasta de configuração do Claude Desktop. Instale um dos dois e rode de novo."

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

# Fechar a janela no Windows deixa o app vivo na bandeja, e a configuração só é lida na
# abertura de verdade: quem "reinicia" pelo X continua sem ver o Pulse.
if [ "$WINDOWS" = 1 ]; then
  FECHAR="Feche o Claude Desktop pelo ícone ao lado do relógio (botão direito → Quit),
não só pelo X da janela, e abra de novo."
else
  FECHAR="Reinicie o Claude Desktop (feche e abra)."
fi

cat <<FIM

✓ Pronto.

$FECHAR Depois experimente pedir:

   "Quais projetos eu tenho em andamento?"
   "Como está a sprint atual do projeto <nome>?"

Para chegar nos arquivos do projeto, autorize sua conta Microsoft uma vez:

   "Inicia o login da Microsoft"

Se algo não funcionar, a Central de Ajuda do Pulse tem o passo a passo em
Ajuda → Usar o Pulse pelo chat.
FIM
