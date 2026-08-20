# Integracao: OneDrive / Microsoft Graph (arquivos de projeto)

- Status: **parcial** — seletor de pasta raiz implementado; sincronizacao da arvore nao existe.
- Decisao de arquitetura: ADR-0019 (proposto, aguardando decisao).
- Autenticacao: ADR-0016 (MSAL no navegador, token delegado).

## O que existe hoje

O GP abre o seletor na aba Arquivos, navega pelo proprio OneDrive e escolhe uma
pasta. O Pulse guarda **apenas o ponteiro** para ela. Nenhum arquivo e movido,
lido ou copiado, e nenhuma permissao e transferida.

## Escopos

| Escopo | Onde e pedido | Por que |
|---|---|---|
| `Calendars.ReadWrite`, `Mail.Read` | `GRAPH_SCOPES`, toda aquisicao de token | agenda e caixa de entrada (pre-existente) |
| `Files.ReadWrite.All` | `FILES_SCOPES`, **so** ao abrir o seletor | navegar pastas do OneDrive |

**Contorno importante — nao juntar os dois conjuntos.** `GRAPH_SCOPES` e usado
em toda aquisicao, inclusive nas silenciosas de agenda. Somar o escopo de
arquivos ali faria o pedido inteiro exigir o consentimento de arquivos; num
tenant sem esse consentimento de admin, **agenda e e-mail parariam para todos**.
Por isso o seletor usa `acquireGraphTokenForScopes(FILES_SCOPES)`: consentimento
incremental, pedido no momento do uso, e a falha fica contida no seletor.

`Files.ReadWrite.All` delegado costuma exigir aprovacao de admin do tenant.
Delegado, nunca application permission — app-only daria ao Pulse acesso a todos
os arquivos da empresa.

## Mapa de campos (nosso ↔ Graph)

| Pulse (`projects`) | Graph (driveItem) | Observacao |
|---|---|---|
| `onedrive_drive_id` | `parentReference.driveId` | obrigatorio junto do item: um driveItem id so resolve dentro do drive dele |
| `onedrive_root_item_id` | `id` | identidade estavel da pasta |
| `onedrive_root_path` | `parentReference.path` + `name` | **so exibicao** — muda quando alguem renomeia a pasta no OneDrive |
| `onedrive_linked_at` / `onedrive_linked_by` | — | auditoria local, sem equivalente no Graph |

CHECK `projects_onedrive_root_complete` garante que drive e item andam juntos:
meia raiz quebraria a chamada ao Graph longe da origem do erro.

| Pulse (`DriveFolder`) | Graph | Observacao |
|---|---|---|
| `childFolderCount` | `folder.childCount` | conta filhos de qualquer tipo, nao so pastas — serve so para decidir se mostra a seta |

## Quirks conhecidos

- **`$filter` por faceta `folder` nao e confiavel** no endpoint `children`. A
  separacao pasta/arquivo e feita no cliente, em `listChildFolders`.
- **`parentReference.path` tem dois formatos.** No drive proprio vem
  `/drive/root:/A/B`; quando o item mora em outro drive vem
  `/drives/{driveId}/root:/A/B`. Cortar so `/drive/root:` faz o id do drive
  (`b!ieoqP-wE-0OMU...`) vazar para a tela como se fosse parte do caminho —
  observado em 2026-08-11. `readablePath` corta ate o primeiro `root:` e
  decodifica o percent-encoding.
- **`sharedWithMe` devolve atalhos, nao os itens reais.** A identidade utilizavel
  esta em `remoteItem`: usar o `id` de fora navega no drive errado ou em nenhum.
  `listSharedWithMe` le `remoteItem.id` e `remoteItem.parentReference.driveId`.
  E o caminho provavel na pratica — pasta de projeto raramente vive no OneDrive
  pessoal do GP.
- **`sharedWithMe` e uma lista plana**, nao uma pasta navegavel: nao existe item
  selecionavel antes de entrar em um dos compartilhamentos.
- **Pasta que chega por LINK nao aparece em `sharedWithMe`.** Aquele endpoint
  lista concessoes diretas; um link (`?e=...&sharingv2=true&fromShare=true`)
  nao vira entrada la. Observado em 2026-08-11 com uma pasta do OneDrive pessoal
  de outra pessoa acessivel no navegador e ausente na API. Contorno: a aba
  "Colar link" resolve a URL por `GET /shares/u!{base64url}/driveItem`.
  Codificacao: base64 da URL, `+`->`-`, `/`->`_`, sem `=` no fim, prefixo `u!`.
- **Atalho para pasta compartilhada nao tem faceta `folder` no nivel de fora.**
  "Adicionar atalho aos Meus arquivos" cria item com `remoteItem` contendo a
  faceta. Filtrar so por `folder` esconde a pasta nas duas abas — `folderFacetOf`
  resolve os dois formatos e devolve sempre a identidade de dentro.
- **`parentReference.path` vem prefixado** com `/drive/root:`. O prefixo e
  removido ao montar o caminho legivel.
- **A raiz nao tem `parentReference.driveId`** em alguns tenants; `getMyDriveRoot`
  cai para string vazia e as chamadas seguintes usam `/me/drive/...` em vez de
  `/drives/{id}/...`.
- **Erro de consentimento** volta como `AADSTS65001` no corpo. Sem traducao a
  pessoa ve o codigo cru e abre chamado — mapeado em `describeError`.

## Permissao por subpasta

Token delegado: cada pessoa chama o Graph como ela mesma, e o OneDrive ja poda a
listagem por permissao de item. Quem so pode ver parte do conteudo ve so aquela
parte, sem filtro nosso.

**Mas acesso a subpasta nao da acesso a pasta pai.** O modelo real do time e GP
na raiz, analista so em `3.Execucao` — e listar a raiz devolve 403 para o
analista.

Resolvido com duas fontes, em `useDriveRootEntries`:

1. Quem alcanca a raiz (GP) lista pelo Graph e, de quebra, grava as subpastas de
   primeiro nivel em `project_folders` com `external_id` (`indexDriveFolders`).
   A policy de INSERT ja restringe isso a GP/admin.
2. Quem nao alcanca cai no indice: le os `external_id` conhecidos (SELECT liberado
   a membro alocado) e chama `getDriveItemOrNull` para cada um. O Graph responde
   quem ele pode abrir; negacao vira `null` e some da lista.

**O Pulse nao decide acesso em nenhum momento** — so pergunta ao OneDrive item a
item. A tela marca esse estado (`isPartial`), avisa que a visao e parcial e
esconde criar-pasta/upload na raiz, que dariam 403.

Limite conhecido: o indice so conhece o que um GP ja navegou pela aba. Pasta
criada direto no OneDrive e ainda nao vista por um GP nao aparece para o analista,
mesmo que ele tenha acesso. Auto-corrige quando um GP abre a aba.

## Compartilhamento pelo Pulse

`GET/POST/DELETE /drives/{d}/items/{id}/permissions` e `/invite`. O ganho real
nao e replicar a tela do OneDrive: e que o **Pulse sabe quem esta alocado no
projeto** e o OneDrive nao. A lista de sugestao do dialogo sai de
`project_role_allocations` (alocados com horas > 0 e e-mail), ja descontando
quem consta nas permissoes — em vez de digitar e-mail um a um.

- `invite` vai com `requireSignIn: true` e `sendInvitation: true`: exige login
  corporativo e avisa por e-mail, que e o comportamento esperado do OneDrive.
- `createLink` usa `scope: 'organization'`, nunca `anonymous`. Link publico sai
  do controle da empresa e vive para sempre; nao e default.
- Permissao com `inheritedFrom` nao pode ser removida no item — so na pasta de
  origem. A tela mostra cadeado em vez de botao que daria erro.
- Identidade vem em `grantedToV2.user` (ou `siteUser`); `grantedToIdentitiesV2`
  aparece em link com destinatarios. Formato antigo (`grantedTo`) nao e lido.
- Conceder acesso exige ser dono do item no OneDrive. GP que so tem escrita
  recebe erro do Graph — a mensagem da tela explica isso.

`employees.email` entrou no select de `equipeService.getProjectAllocations` para
alimentar esse fluxo (campo opcional no contrato, aditivo).

## MCP: subir arquivo pelo chat (`apps/mcp-drive`)

Servidor MCP em stdio para Claude Desktop e afins: "sobe esse arquivo na pasta
Execucao do projeto X". Ferramentas: `microsoft_status`, `microsoft_login`,
`find_project`, `list_project_folder`, `create_project_folder`,
`upload_to_project`.

**Autenticacao delegada, por pessoa** — `@azure/msal-node` com device code, cache
em `~/.og-pulse/msal-drive-cache.json` (0600, contem refresh token). Mesma
decisao do ADR-0019: application permission daria a um processo dirigido por LLM
escrita em todos os arquivos do tenant.

O `SUPABASE_SERVICE_KEY` le apenas `projects.onedrive_*` — o vinculo
projeto→pasta. Quem abre a pasta continua sendo decidido pelo OneDrive.

Contornos proprios do MCP:

- **Device code nao cabe numa chamada de ferramenta** (leva minutos).
  `microsoft_login` devolve URL e codigo na hora e guarda a promessa; a proxima
  ferramenta que precisar de token aguarda.
- **Caminho de pasta comparado sem acento nem caixa** — quem fala no chat nao
  digita `3.Execucao` exato. Pasta inexistente devolve as opcoes disponiveis.
- **URL de origem**: so https, sem seguir redirecionamento, e resolucao de DNS
  recusada quando aponta para rede interna (loopback, 10.x, 192.168.x,
  172.16–31.x, link-local). O MCP roda na maquina da pessoa; sem isso, uma URL
  escolhida pelo modelo viraria porta para a rede local dela.
- `fetch` do Node nao aceita `Uint8Array` no tipo de `body`; a view e convertida
  em `ArrayBuffer` proprio antes do PUT.

## O que falta (depende do ADR-0019)

Sincronizacao bidirecional: arquivo/pasta criado no OneDrive aparecer no Pulse e
vice-versa. Pontos que precisam de decisao antes do codigo:

- **Reconciliacao**: item renomeado, movido ou apagado no OneDrive. O ponteiro e
  o `external_id` sobrevivem a renomeacao; `onedrive_root_path` nao.
- **Gatilho do sync**: polling na abertura da aba, `delta` do Graph, ou webhook
  (`subscriptions`) — webhook exige endpoint publico e renovacao periodica.
- **Autorizacao**: o item 3 do ADR-0019. Com token delegado, quem decide acesso
  e o compartilhamento do OneDrive, nao a RLS do Postgres. A regra "GP cria
  pasta, membro sobe arquivo" deixa de ser enforceavel.
- **Conflito**: mesmo nome criado dos dois lados entre sincronizacoes.

## Verificacao pendente

Nada foi exercitado contra o Graph real — falta o consentimento de admin para
`Files.ReadWrite.All`. Casos que importam antes de liberar: consentimento
negado, conta sem OneDrive provisionado, pasta raiz apagada depois de vinculada,
tenant onde a raiz e biblioteca do SharePoint em vez de OneDrive pessoal.
