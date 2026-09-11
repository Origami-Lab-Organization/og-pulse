#!/usr/bin/env bash
#
# Diz por que o Pulse não aparece no seu chat. Um comando, um relatório.
#
#   curl -fsSL https://origamipulse.com.br/mcp/doctor.sh | bash
#
# POR QUE ESTE ARQUIVO EXISTE: quando a instalação não pega, o sintoma é sempre o mesmo —
# "o Claude não acha" — e as causas são muitas (falta Node, o Desktop nunca abriu, o
# servidor está registrado noutro lugar, o caminho gravado não existe). Descobrir qual
# delas é, por mensagem, custa uma tarde de ida e volta pedindo "roda esse comando e me
# diz". Este script roda todos de uma vez e entrega o veredito pronto.
#
# Ele NÃO altera nada: só lê e relata. E não imprime a sua senha — mostra que o campo
# existe, nunca o valor.
set -uo pipefail   # sem -e de propósito: um check que falha não pode interromper os outros

DEST="$HOME/.og-pulse/bin"
PROBLEMAS=()

ok()    { printf '   \033[32m✓\033[0m %s\n' "$1"; }
nao()   { printf '   \033[31m✗\033[0m %s\n' "$1"; PROBLEMAS+=("$2"); }
nota()  { printf '     %s\n' "$1"; }
titulo(){ printf '\n\033[1m%s\033[0m\n' "$1"; }

printf '\n\033[1m→ Diagnóstico do Pulse no chat\033[0m\n'

# ---------------------------------------------------------------- 1. onde estamos
titulo '1. Sistema'
SISTEMA="$(uname -s 2>/dev/null || echo desconhecido)"
case "$SISTEMA" in
  MINGW*|MSYS*|CYGWIN*) WINDOWS=1; ok "Windows, no Git Bash ($SISTEMA)" ;;
  Darwin)               WINDOWS=0; ok "macOS" ;;
  Linux)
    WINDOWS=0
    if grep -qi microsoft /proc/version 2>/dev/null; then
      ok "Linux dentro do WSL"
      nota "Atenção: o Claude Desktop do Windows NÃO enxerga o que está instalado aqui."
      nota "Para usá-lo, rode a instalação no Git Bash, fora do WSL."
    else
      ok "Linux"
    fi ;;
  *) WINDOWS=0; nao "sistema não reconhecido ($SISTEMA)" "sistema-desconhecido" ;;
esac

# ------------------------------------------------------------------- 2. o motor
titulo '2. Node.js'
if command -v node >/dev/null 2>&1; then
  V="$(node -p 'process.versions.node' 2>/dev/null)"
  EXEC="$(node -p 'process.execPath' 2>/dev/null)"
  if [ "${V%%.*}" -ge 20 ] 2>/dev/null; then
    ok "versão $V"
  else
    nao "versão $V é antiga demais (precisa de 20 ou maior)" "node-antigo"
  fi
  nota "executável: $EXEC"
else
  nao "não está instalado — é ele que executa os servidores do Pulse" "sem-node"
  EXEC=""
fi

# -------------------------------------------------------------- 3. os servidores
titulo '3. Servidores baixados'
for srv in og-pulse-drive og-pulse-activities; do
  if [ -f "$DEST/$srv.mjs" ]; then
    BYTES="$(wc -c < "$DEST/$srv.mjs" 2>/dev/null | tr -d ' ')"
    if [ "${BYTES:-0}" -gt 200000 ]; then
      ok "$srv ($((BYTES / 1024)) KB)"
    else
      nao "$srv está truncado ($BYTES bytes) — o download falhou" "download-incompleto"
    fi
  else
    nao "$srv não foi baixado" "sem-servidores"
  fi
done

# ------------------------------------------------------- 4. quem deveria executá-los
titulo '4. Claude Desktop'
case "$SISTEMA" in
  Darwin) CFG="$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
  MINGW*|MSYS*|CYGWIN*)
    RO="${APPDATA:-}"
    [ -n "$RO" ] && command -v cygpath >/dev/null 2>&1 && RO="$(cygpath -u "$RO")"
    [ -n "$RO" ] || RO="$HOME/AppData/Roaming"
    CFG="$RO/Claude/claude_desktop_config.json" ;;
  *) CFG="$HOME/.config/Claude/claude_desktop_config.json" ;;
esac

if [ -f "$CFG" ]; then
  ok "configuração encontrada"
  nota "$CFG"
  # Só command e args. Os `env` guardam a sua senha e não são impressos.
  if [ -n "$EXEC" ]; then
    CFG_NATIVO="$CFG"
    [ "$WINDOWS" = 1 ] && command -v cygpath >/dev/null 2>&1 && CFG_NATIVO="$(cygpath -w "$CFG")"
    CFG_PATH="$CFG_NATIVO" node -e '
      const fs = require("fs");
      let c; try { c = JSON.parse(fs.readFileSync(process.env.CFG_PATH, "utf8")); }
      catch (e) { console.log("     ! o arquivo existe mas não é JSON válido: " + e.message); process.exit(0); }
      const s = c.mcpServers || {};
      const meus = Object.keys(s).filter((k) => k.startsWith("og-pulse"));
      if (!meus.length) { console.log("     ! nenhum servidor do Pulse está registrado aqui"); process.exit(0); }
      for (const k of meus) {
        const v = s[k];
        console.log("     " + k);
        console.log("       executa: " + v.command);
        console.log("       arquivo: " + (v.args || [])[0]);
        console.log("       credenciais: " + Object.keys(v.env || {}).join(", "));
      }
      const outros = Object.keys(s).filter((k) => !k.startsWith("og-pulse"));
      if (outros.length) console.log("     outros MCPs preservados: " + outros.join(", "));
    '
  fi
else
  nao "não existe configuração em $CFG" "sem-config-desktop"
fi

# O app está instalado? Esta pergunta se responde procurando o PROGRAMA, não contando
# arquivos ao lado da configuração: no Windows o Claude Desktop instala em
# %LOCALAPPDATA%\AnthropicClaude e apenas LÊ o config de %APPDATA%\Claude, então aquela
# pasta pode estar enxuta com o app instalado e aberto. Contar rastros ali dava veredito
# errado — "nunca abriu" para quem tinha acabado de instalar.
case "$SISTEMA" in
  MINGW*|MSYS*|CYGWIN*)
    LA="${LOCALAPPDATA:-}"
    [ -n "$LA" ] && command -v cygpath >/dev/null 2>&1 && LA="$(cygpath -u "$LA")"
    [ -n "$LA" ] || LA="$HOME/AppData/Local"
    APP="$LA/AnthropicClaude" ;;
  Darwin) APP="/Applications/Claude.app" ;;
  *)      APP="" ;;
esac

if [ -n "$APP" ]; then
  if [ -e "$APP" ]; then
    ok "aplicativo instalado"
  else
    nao "não encontrei o aplicativo em $APP" "sem-desktop"
  fi
fi

# Os logs são a única fonte que diz por que um servidor não subiu DENTRO do Claude: o app
# grava um arquivo por MCP. Quando existem, eles valem mais que todo o resto deste script.
LOGS="$(dirname "$CFG")/logs"
if [ -d "$LOGS" ]; then
  ok "logs do Claude Desktop encontrados"
  for L in "$LOGS"/*og-pulse*; do
    [ -f "$L" ] || continue
    nota "$(basename "$L"), últimas linhas:"
    tail -n 6 "$L" 2>/dev/null | sed 's/^/       /'
  done
else
  nota "sem pasta de logs em $LOGS"
  nota "o Claude Desktop cria os logs ao abrir com um MCP configurado."
fi

# ------------------------------------------------------------------ 5. Claude Code
titulo '5. Claude Code'
if command -v claude >/dev/null 2>&1; then
  ok "instalado"
  LISTA="$(claude mcp list 2>&1 | grep -i "og-pulse" || true)"
  if [ -n "$LISTA" ]; then
    printf '%s\n' "$LISTA" | sed 's/^/     /'
  else
    nao "os servidores do Pulse não aparecem em 'claude mcp list'" "sem-registro-code"
  fi
else
  nota "não instalado nesta máquina (tudo bem, se você usa só o Claude Desktop)"
fi

# ----------------------------------------------------- 6. a prova: o servidor sobe?
titulo '6. Os servidores respondem?'
if [ -z "$EXEC" ]; then
  nota "sem Node não dá para testar."
elif [ ! -f "$CFG" ]; then
  nota "sem a configuração não dá para testar (é dela que saem as credenciais)."
else
  CFG_NATIVO="$CFG"
  [ "$WINDOWS" = 1 ] && command -v cygpath >/dev/null 2>&1 && CFG_NATIVO="$(cygpath -w "$CFG")"
  for srv in og-pulse-drive og-pulse-activities; do
    [ -f "$DEST/$srv.mjs" ] || continue
    N="$(
      printf '%s\n%s\n' \
        '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"doctor","version":"1"}}}' \
        '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
      | CFG_PATH="$CFG_NATIVO" SRV="$srv" DEST_MJS="$DEST/$srv.mjs" node -e '
          // As credenciais vêm do próprio arquivo de configuração: assim o teste exercita
          // exatamente o que o Claude Desktop executaria, e nada é digitado de novo.
          const fs = require("fs"), cp = require("child_process");
          const c = JSON.parse(fs.readFileSync(process.env.CFG_PATH, "utf8"));
          const s = (c.mcpServers || {})[process.env.SRV];
          if (!s) { process.stdout.write("SEM-REGISTRO"); process.exit(0); }
          let entrada = ""; process.stdin.on("data", (d) => (entrada += d));
          process.stdin.on("end", () => {
            const r = cp.spawnSync(process.execPath, [process.env.DEST_MJS],
              { input: entrada, env: { ...process.env, ...s.env }, encoding: "utf8", timeout: 45000 });
            for (const linha of String(r.stdout || "").split("\n")) {
              try { const m = JSON.parse(linha);
                if (m.id === 2 && m.result?.tools) return process.stdout.write(String(m.result.tools.length));
              } catch {}
            }
            process.stdout.write("FALHOU");
          });
        ' 2>/dev/null
    )"
    case "$N" in
      SEM-REGISTRO) nao "$srv não está na configuração" "sem-registro-desktop" ;;
      ''|FALHOU|0)  nao "$srv não respondeu" "servidor-nao-sobe"
                    nota "pode ser senha trocada, ou sem internet." ;;
      *)            ok "$srv respondeu — $N ferramentas" ;;
    esac
  done
fi

# ------------------------------------------------------------------- 7. o veredito
titulo 'Veredito'
if [ ${#PROBLEMAS[@]} -eq 0 ]; then
  printf '   Está tudo certo por aqui.\n\n'
  printf '   Se mesmo assim o chat não vê o Pulse, é o app que não releu a configuração:\n'
  if [ "$WINDOWS" = 1 ]; then
    printf '   feche o Claude Desktop pelo ícone ao lado do relógio (botão direito → Quit),\n'
    printf '   não pelo X da janela, e abra de novo.\n\n'
  else
    printf '   feche o Claude Desktop por completo e abra de novo.\n\n'
  fi
  exit 0
fi

for p in "${PROBLEMAS[@]}"; do
  case "$p" in
    sem-node)
      printf '   \033[1mFalta o Node.js.\033[0m Instale em https://nodejs.org/en/download (versão LTS).\n'
      [ "$WINDOWS" = 1 ] && printf '   No Windows, feche este Git Bash e abra um novo depois de instalar.\n'
      printf '   Depois rode a instalação do Pulse de novo.\n\n' ;;
    node-antigo)
      printf '   \033[1mO Node.js é antigo demais.\033[0m Instale a versão LTS em\n'
      printf '   https://nodejs.org/en/download e rode a instalação do Pulse de novo.\n\n' ;;
    sem-servidores|download-incompleto)
      printf '   \033[1mOs servidores não estão na máquina.\033[0m Rode a instalação de novo,\n'
      printf '   pela Central de Ajuda do Pulse, em Ajuda → Usar o Pulse pelo chat.\n\n' ;;
    sem-desktop)
      printf '   \033[1mO Claude Desktop não está instalado.\033[0m A configuração está pronta e\n'
      printf '   correta, mas não há programa nenhum lendo ela. Instale em\n'
      printf '   https://claude.ai/download e abra uma vez — ele lê a configuração ao abrir.\n'
      printf '   Se você usa o Claude pelo navegador: os servidores rodam nesta máquina, e\n'
      printf '   só o aplicativo ou o Claude Code conversam com eles. Pelo site não aparece.\n\n' ;;
    sem-config-desktop)
      printf '   \033[1mO Claude Desktop não foi configurado.\033[0m Rode a instalação de novo.\n\n' ;;
    sem-registro-desktop|sem-registro-code)
      printf '   \033[1mOs servidores não estão registrados.\033[0m Rode a instalação de novo.\n\n' ;;
    servidor-nao-sobe)
      printf '   \033[1mUm servidor não respondeu.\033[0m Em geral é senha trocada: rode a\n'
      printf '   instalação de novo e digite a senha atual do site.\n\n' ;;
    sistema-desconhecido)
      printf '   \033[1mSistema não reconhecido.\033[0m Mande esta saída para quem cuida do Pulse.\n\n' ;;
  esac
done

printf '   Se nada disso resolver, mande esta saída inteira para quem cuida do Pulse.\n'
printf '   Ela não contém a sua senha.\n\n'
