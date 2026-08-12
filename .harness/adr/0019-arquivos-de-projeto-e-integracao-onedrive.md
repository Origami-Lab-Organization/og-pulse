# ADR 0019: Arquivos de projeto e a integracao com o OneDrive

- Status: **aceito** (2026-08-11) — ver "Decisao registrada" no fim
- Data: 2026-08-11
- Decisores: Italo Castro (tech lead)
- Relacionados: ADR-0006 (fonte unica de alocacao), ADR-0016 (SSO Microsoft e
  token do Graph), GP-J9 (contrato do projeto)

## Contexto

A aba Arquivos nasceu (GP-J9) para um unico PDF: o contrato assinado, guardado
no bucket privado `project-contracts` e refletido em `projects.contract_url`
(campo removido depois — ver item 2 revisado).
A demanda cresceu para arquivos gerais, com pastas e subpastas, e com uma regra
de autorizacao propria: **GP cria pastas, membro alocado sobe arquivo**.

Durante o desenho, a direcao da integracao futura foi definida assim:

> "o GP vai abrir o OneDrive pelo sistema e escolher a pasta raiz, dali ele
> consegue criar outras pastas e tal, e ver as pastas que foram criadas la
> tambem"

Isso e uma definicao de **propriedade do dado**, nao um detalhe de UI. Se o GP
escolhe uma pasta raiz no OneDrive e o que for criado la aparece aqui, entao a
arvore de pastas passa a ser do OneDrive, e o og-pulse e uma janela sobre ela.

A integracao esta mais perto do que parece: o ADR-0016 ja usa MSAL no navegador,
que devolve o access token do Microsoft Graph junto com o ID token. A porta de
autenticacao ja existe; falta o consentimento do escopo de arquivos.

## Decisao proposta

### 1. O OneDrive e a fonte da verdade da arvore; o og-pulse indexa

Depois da integracao, `project_folders` deixa de ser a autoridade e vira o
**indice local dos driveItems**. Por isso a tabela ja nasceu (20260811170000)
com `external_provider`, `external_id` e `external_synced_at` nulaveis: quando a
integracao chegar, e backfill de coluna, nao migration de tabela cheia.

Criar pasta passa a ser: chamar o Graph -> criar no OneDrive -> upsert da linha
local com o `external_id`. Ler passa a ser: listar o `children` do driveItem raiz
e reconciliar com o indice. Pasta criada direto no OneDrive aparece na
reconciliacao — que e exatamente o comportamento pedido.

### 2. O contrato tambem vai para o OneDrive — revisado em 2026-08-11

A versao original desta decisao mantinha o contrato no bucket, sob o argumento de
que ele tinha "regra de negocio propria". **Isso estava errado, e a verificacao
mostrou.** `projects.contract_url` era escrito em dois pontos e lido em um — para
renderizar um card. Nao travava etapa, nao entrava no checklist de inicio, em
relatorio, alerta ou calculo financeiro. O unico comportamento real alem da
exibicao era o passo opcional "anexar contrato agora?" no fechamento do negocio.

Sem regra que o sustente, manter o caso especial custava um campo, uma RPC, um
trigger, uma categoria, tres arquivos de codigo e uma segunda historia para o
usuario aprender. O contrato passa a ser um documento como os outros, na pasta do
projeto no OneDrive.

Removidos em `20260811190000`: coluna `projects.contract_url`, RPC
`attach_project_contract`, trigger `clear_project_contract_url` e os componentes
`ProjectContractUpload` / `projectContractService` / `lib/projectContract`.

**Nada foi destruido**: os PDFs seguem no bucket `project-contracts` e as linhas
`project_files` com `category='contract'` continuam intactas, com `storage_path`
para recuperacao manual. Foi decisao explicita nao apagar arquivo assinado.

O passo do fechamento foi repontado (`CloseDealContractUpload`): se o projeto
ainda nao tem raiz, o proprio dialogo abre o seletor do OneDrive e vincula ali;
depois envia o contrato para a pasta. Custa mais um clique no fechamento e, em
troca, o arquivo ja nasce onde o time vai procura-lo.

### 3. Consequencia que precisa estar clara antes do sim

**A autorizacao deixa de ser nossa.** Hoje quem ve e escreve arquivo e decidido
por RLS no Postgres, com `can_view_project_document` e `can_manage_project`.
Com o token delegado do Graph, quem decide e o compartilhamento do OneDrive:

- A regra "GP cria pasta, membro sobe arquivo" **nao e enforceavel** pelo
  og-pulse depois da integracao. Podemos esconder o botao, mas quem tiver acesso
  de escrita na pasta do OneDrive cria pasta por fora.
- Uma pessoa que sai do projeto no og-pulse continua com acesso aos arquivos ate
  alguem mexer no compartilhamento do OneDrive.
- O inverso tambem: membro alocado aqui que nao esta no compartilhamento la nao
  ve nada, e o og-pulse nao tem como corrigir.

Isso pode ser aceitavel — e o mesmo trade-off de qualquer empresa que usa o
OneDrive como reposito rio real. Mas e uma **decisao consciente de abrir mao do
controle de acesso a arquivos de projeto**, e nao pode ser descoberta depois.

### 4. Escopo do Graph

`Files.ReadWrite.All` (ou `Sites.ReadWrite.All` se a raiz for SharePoint) exige
consentimento de admin do tenant. Token delegado, nunca application permission:
app-only daria ao og-pulse acesso a todos os arquivos da empresa, o que e um
alvo grande demais para o beneficio.

## Alternativas consideradas

- **og-pulse dono, OneDrive como espelho de saida** — mantem a autorizacao no
  Postgres e sincroniza uma copia para o OneDrive. Rejeitado pela descricao do
  fluxo: pasta criada direto no OneDrive precisa aparecer aqui, o que exige
  sincronizacao bidirecional e reconciliacao de conflito — muito mais caro e com
  chance real de divergencia silenciosa.
- **Sem integracao, arvore so no Postgres** — e o estado entregue hoje. Funciona,
  mas duplica onde o time ja guarda arquivo e nao atende ao pedido.
- **Adiar as colunas external_*** — rejeitado depois que a direcao foi definida:
  adicionar coluna em tabela populada e mais caro do que nascer com ela nula.

## Consequencias

- Beneficios: o time trabalha onde ja trabalha; o og-pulse ganha contexto de
  projeto sem virar mais um lugar para procurar arquivo.
- Custos: a implementacao precisa de reconciliacao (item renomeado, movido ou
  apagado no OneDrive), tratamento de token expirado e um caminho de erro
  decente quando o Graph esta fora.
- Riscos: o item 3 e o risco principal e e de governanca, nao de codigo.
- Como reverter: enquanto `external_id` for nulo em todas as linhas, a arvore e
  100% local e nada foi perdido. Depois do primeiro sync, reverter significa
  reimportar os arquivos do OneDrive para o bucket.

## O que ja esta implementado (2026-08-11)

Independente desta decisao, porque nao depende dela:

- Documentos gerais com upload nomeado, pastas/subpastas, exclusao e navegacao
  por breadcrumb, tudo no Postgres + bucket privado.
- `can_view_project_document` corrigido para `project_role_allocations`
  (20260811160000). Antes disso a equipe alocada nao enxergava arquivo nenhum.
- Membro alocado sobe arquivo e exclui o que subiu; GP/admin excluem qualquer um
  e sao os unicos que criam pasta.

## Decisao registrada (2026-08-11)

O tech lead pediu, com a raiz ja vinculada, "navegar e ver pastas e subpastas
desse root, e subir dentro delas e criar outras". Isso aceita o modelo do item 1
e, junto, o **item 3**: com a aba operando direto sobre o OneDrive por token
delegado, o controle de acesso a documento de projeto passa a ser o
compartilhamento do OneDrive. Com a remocao do caso especial de contrato (item 2
revisado), a RLS do Postgres deixa de governar qualquer arquivo de projeto que
esteja num projeto com raiz vinculada — ela so alcanca o modo local, usado
enquanto o projeto nao tem pasta escolhida.

Consequencia pratica que vale repetir aqui para nao se perder: `canManageFolders`
e `isReadOnly` seguem escondendo botao na tela, mas **nao sao mais garantia** —
quem tiver escrita na pasta cria pasta por fora do Pulse, e quem sair do projeto
aqui continua enxergando os arquivos ate o compartilhamento mudar la.

### Estado da implementacao

Modo OneDrive, quando o projeto tem raiz vinculada:

- navegacao por breadcrumb a partir da raiz, pastas e arquivos juntos;
- criar pasta (GP/admin), com `conflictBehavior: fail` — nome repetido da erro
  em vez de virar "Contratos 1" em silencio;
- upload no diretorio corrente, com nome definido pelo usuario e a extensao
  original preservada (no OneDrive e ela que decide com o que o arquivo abre);
- abrir item no OneDrive por `webUrl`.

Sem raiz vinculada, a aba continua no modo local (Postgres + bucket), que segue
inteiro e nao foi removido.

Exclusao foi incluida a pedido (2026-08-11), depois de ter ficado de fora na
primeira rodada. O dialogo diz explicitamente que o item sai **no OneDrive**, que
o conteudo da pasta vai junto e que o destino e a lixeira da conta dona — apagar
no drive real da empresa nao pode parecer "tirar do Pulse". Pasta so por
GP/admin; arquivo por qualquer um que a policy do OneDrive permitir.

### Compartilhamento pelo Pulse (2026-08-11)

Item de menu "Gerenciar acesso" por linha: lista quem tem acesso e concede a
partir da **equipe alocada no projeto**, nao de e-mail digitado. Isso inverte
parcialmente a consequencia do item 3: o Pulse continua sem *decidir* acesso,
mas passa a ser o lugar de onde o acesso e *concedido*, com a informacao que so
ele tem — quem esta no projeto. Reduz o risco de "analista sem acesso" e de
"gente que saiu do projeto e continua vendo", porque a divergencia fica visivel
lado a lado.

Nao substitui a governanca do OneDrive: permissao herdada so sai na pasta de
origem, e conceder exige ser dono do item.

### Acesso parcial: analista so em subpastas

O modelo do time e GP na raiz e analista so em `3.Execucao`. Como acesso a
subpasta nao da acesso ao pai, listar a raiz devolve 403 ao analista. Resolvido
com o indice: o GP alimenta `project_folders.external_id` (automatico ao navegar,
e completo pelo botao **Sincronizar**, que varre a arvore ate 10 niveis); quem
nao alcanca a raiz le esses ids e sonda item a item pelo Graph. **Nenhuma decisao
de acesso e tomada pelo Pulse** — a negacao vem do OneDrive e vira ausencia na
lista. A tela avisa que a visao e parcial e esconde criar-pasta/upload na raiz.

## Pendencia antes de implementar o OneDrive

- Decisao explicita sobre o item 3 (controle de acesso).
- Consentimento de admin no Azure para o escopo de arquivos.
- Definir se a raiz e OneDrive pessoal do GP ou biblioteca do SharePoint —
  muda a API e muda quem perde acesso quando a pessoa sai da empresa.
