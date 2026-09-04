#!/usr/bin/env bash
#
# Empacota os servidores de MCP em arquivos únicos, servidos pelo próprio Pulse.
#
# POR QUE: a instalação antiga pedia o repositório clonado
# (`bash apps/mcp-drive/install.sh`, `cd apps/mcp-activities && npm install`). GP,
# consultor e qualquer pessoa que só usa o produto não tem o repositório, e não
# deveria precisar de git, npm e TypeScript para usar o Pulse pelo chat.
#
# COMO: esbuild resolve as dependências para dentro de um arquivo por servidor, então
# rodar exige só Node. Os arquivos vão para `public/mcp/`, que a Vercel serve estático —
# a mesma origem do app. Quem instala baixa de lá, sem clonar nada.
#
# O que é servido é o MESMO código do repositório, sem segredo dentro: as credenciais são
# digitadas na instalação e ficam na configuração do cliente de MCP, na máquina da pessoa.
# A chave publicável embutida já vai no bundle público do site (o controle de acesso é a
# RLS, não o sigilo dela).
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="public/mcp"
mkdir -p "$OUT"

# `--bundle` sem `--packages=external` é o ponto: as dependências entram no arquivo. Com
# elas externas o arquivo não rodaria fora do repositório, que é justamente o problema.
empacota() {
  local app="$1" nome="$2"
  echo "→ empacotando $nome"
  npx --yes esbuild "apps/$app/src/index.ts" \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=esm \
    --legal-comments=none \
    --outfile="$OUT/$nome.mjs" \
    --log-level=warning
  printf '   %s\n' "$(du -h "$OUT/$nome.mjs" | cut -f1) $OUT/$nome.mjs"
}

empacota mcp-drive og-pulse-drive
empacota mcp-activities og-pulse-activities

# O manifesto serve ao instalador (conferir que baixou os dois) e ao suporte (saber qual
# build a pessoa tem na máquina quando algo não funciona).
node -e '
const fs = require("fs");
const files = ["og-pulse-drive", "og-pulse-activities"];
const manifest = {
  generatedAt: new Date().toISOString(),
  servers: files.map((f) => ({
    name: f,
    file: f + ".mjs",
    bytes: fs.statSync("public/mcp/" + f + ".mjs").size,
  })),
};
fs.writeFileSync("public/mcp/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log("→ manifest.json escrito");
'
echo "✓ pacotes de MCP prontos em $OUT"
