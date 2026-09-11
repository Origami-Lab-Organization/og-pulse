# ADR 0034: O instalador de MCP no Windows exige Git Bash

- Status: aceito
- Data: 2026-09-11
- Decisores: Italo Castro
- Relacionados: `public/mcp/install.sh`, `scripts/build-mcp-bundles.sh`,
  `src/components/help/McpSetupCard.tsx`

## Contexto

O Pulse serve o próprio instalador de MCP em `/mcp/install.sh`, e a Central de Ajuda mostra
um `curl … | bash`. A promessa escrita no card é "um comando, uma vez por computador, não
precisa de repositório, de git nem de saber programar". No Mac ela se cumpre.

No Windows, não. A pessoa rodava, via `✓ Pronto. Reinicie o Claude Desktop`, reiniciava, e o
chat não enxergava o Pulse. Não havia erro em lugar nenhum.

A causa estava em `registra_claude_desktop`, que escolhia o arquivo de configuração por
`uname -s`:

```sh
case "$(uname -s)" in
  Darwin) … ;;
  Linux)  … ;;
  *)      return 0 ;;   # Git Bash devolve MINGW64_NT-… e cai aqui
esac
```

O script baixava os servidores, conferia as credenciais contra o Supabase, testava os dois
por JSON-RPC — e terminava se declarando bem-sucedido sem ter escrito uma linha de
configuração. **Um instalador que falha em silêncio e ainda assim diz "Pronto" é pior que um
que quebra**: ele manda a pessoa procurar o problema em todo lugar menos onde ele está.

Atrás desse, dois problemas de caminho esperavam:

1. O bash do Git Bash escreve `/c/Users/Fulano`. O Claude Desktop e o Claude Code são
   programas nativos do Windows e só abrem `C:\Users\Fulano`.
2. O MSYS traduz sozinho os **argumentos** de linha de comando passados a um programa
   nativo, mas **não traduz variável de ambiente** — e era por variável de ambiente que o
   caminho da configuração chegava ao `node` que monta o JSON.

E um terceiro, específico do Windows: o Claude Desktop lança o servidor de MCP sem shell,
sem o PATH da sessão do usuário. Quem instalou o Node por nvm-windows ou fnm teria
`"command": "node"` gravado e o servidor jamais subindo — de novo, sem erro visível.

### Alternativas consideradas

1. **`install.ps1` nativo.** Alcança qualquer Windows sem instalar nada antes. Custo: um
   segundo instalador com a mesma lógica em outra linguagem — duas implementações de "pede a
   senha sem ecoar", "valida as credenciais antes de gravar", "mescla o JSON sem perder MCP
   de terceiro", "testa e diz o que fazer". Toda correção futura passa a ser feita duas
   vezes, e a segunda é a que alguém esquece.
2. **Git Bash.** Um script só, o mesmo caminho de código no Mac, no Linux e no Windows.
   Custo: quem está no Windows instala o Git antes.
3. **Instrução manual por plataforma no card.** Mata a promessa do "um comando".

## Decisão

Alternativa 2. O `install.sh` passa a reconhecer `MINGW*|MSYS*|CYGWIN*`, grava em
`%APPDATA%\Claude\claude_desktop_config.json`, e traduz caminho com `cygpath` nos três pontos
em que o Claude nativo o recebe: os `.mjs` gravados no JSON, o `claude mcp add`, e o caminho
do próprio arquivo de configuração. A Central de Ajuda leva ao download do Git para Windows
(`https://git-scm.com/download/win`) — junto do comando, e de novo no card de problemas, para
quem já colou no PowerShell e levou `"bash" não é reconhecido`.

Duas correções da mesma sessão valem além do Windows:

- **O ramo desconhecido avisa, em vez de `return 0` calado**, e uma guarda aborta a instalação
  quando nenhum cliente foi registrado. O script não diz mais "Pronto" sem ter feito nada —
  era esse silêncio, e não o Windows, que custou o diagnóstico.
- **No Windows grava-se o caminho absoluto do `node.exe`** na configuração, não `"node"`. Só
  para `.exe`: um atalho `.cmd` precisaria de `cmd /c`, e aí `"node"` puro erra menos.

## Consequências

- **Benefícios**: um instalador só, um caminho de código, uma correção por bug. O modo de
  falha silenciosa que originou este ADR deixa de existir em qualquer plataforma, inclusive
  numa futura que ninguém previu.
- **Custos**: no Windows é preciso instalar o Git antes — um passo a mais que Mac e Linux não
  têm. O script passa a carregar conhecimento de `cygpath` e da fronteira MSYS/Windows, que
  quem mexer nele precisa entender: está comentado nos pontos em que acontece.
- **Riscos**: a verificação foi feita por **simulação no macOS** (stubs de `uname` e
  `cygpath`, executando o código real extraído do arquivo), não em Windows real. Foi provado
  que o JSON sai com `C:\\Users\\…`, que o Mac não regrediu, que MCP de terceiro sobrevive ao
  merge e que sistema desconhecido aborta. **Não** foi medido em Windows: o valor exato de
  `uname -s`, a presença do `cygpath`, a tradução de argumentos pelo MSYS e o comportamento
  do `claude mcp add`. A primeira instalação real no Windows é a prova que falta — e o script
  agora imprime `✓ Claude Desktop — <caminho>` justamente para que ela seja lida em segundos.
- **Diferença de plataforma a saber**: o arquivo de configuração guarda a senha do Pulse. No
  Unix o script fecha em `0600`; no Windows `fs.chmodSync` não vira ACL, e a proteção passa a
  ser a ACL padrão de `%APPDATA%`, que já é por usuário. Não é brecha, é uma garantia mais
  fraca.
- **Como reverter**: a decisão é revertida escrevendo o `install.ps1` e fazendo o card
  escolher o comando pela plataforma. Nada do que foi feito aqui atrapalha essa rota — o
  `install.sh` continua correto para Mac, Linux e Git Bash.

## Quando revisar

Na segunda pessoa no Windows que não tem Git e não quer instalar, ou na primeira falha real
que a simulação não pegou. Qualquer uma das duas paga o custo do segundo instalador.

## Evidências

- `public/mcp/install.sh` — detecção, `para_o_cliente`, `registra_claude_desktop`, guarda de
  `REGISTROU`.
- `src/components/help/McpSetupCard.tsx` — link do Git para Windows e sintoma no card de
  problemas.
- commit `d86506b6`.
