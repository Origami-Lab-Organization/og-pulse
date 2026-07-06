# FUNC-J3 — Caixa de Entrada

> Jornada: Funcionário J3 · Estado auditado: ✅ IMPLEMENTADO (~90%)
> Dependências externas: nenhuma. (É base para notificações de J7/J8/J9 — esta jornada habilita esses tipos.)

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Rota `/inbox` (`App.tsx:79`) + página `src/pages/Inbox.tsx` (substituiu o sheet lateral)
- Layout de dois painéis: `src/components/inbox/InboxSidebar.tsx`, `InboxListPanel.tsx`, `InboxDetailPanel.tsx`
- Tipos existentes em `useInboxNotifications.ts`: `timesheet_*`, `reimbursement_*`, `budget_margin_*`, `candidatos`, `projeto`
- Tabs/folders: `all`, `unread`, `timesheet`, `reimbursement`, `budget`, `candidates`, `projeto`, `archived`
- Marcar como lido: `useMarkNotificationRead()`, `useMarkMultipleNotificationsRead()`
- Supabase Realtime: `Inbox.tsx:84-109` — `channel().on('postgres_changes')` filtrado por `recipient_id`
- Infra: tabela `notifications` (migration 20260228235936) + campos `category/priority/action_type/action_url/metadata/is_resolved/is_archived` (20260320170531), RLS, `InboxButton` com badge

**❌ Pendente:**
- Tipos de notificação ausentes: `document_available`, `project_started`, `project_health_alert`, `nps_response_received`, `card_assigned`, `system`
- Campo `read_at` (hoje só `is_read`)
- Botões de ação não usam `action_url`

## História de Usuário

**Como** consultor que recebe notificações do sistema,
**quero** ver tudo num só lugar, distinguir o que precisa de atenção e ir para a ação em um clique,
**para que** eu não perca nada importante e responda rápido sem recarregar a página.

## Contexto

Jornada essencialmente pronta (página, dois painéis, tabs e Realtime funcionando). O foco é Parte B: completar os tipos de notificação que faltam, adicionar `read_at` e fazer os botões usarem `action_url`. A Parte A é mínima (apenas garantir o dado base que destrava melhorias). Não há dependência externa.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Campo `read_at` no banco**
Adicionar `read_at timestamptz NULL` em `notifications` via migration versionada. `useMarkNotificationRead()` / `useMarkMultipleNotificationsRead()` passam a gravar `read_at = now()` ao marcar como lido (mantendo `is_read` por compatibilidade). RLS/`tenant_id` inalterados.

### Parte B — Melhorias no existente (foco da jornada)

**CA-02 — Tipos de notificação faltantes**
Suportar os tipos ausentes em `useInboxNotifications.ts` (ícone + label + roteamento de tab), conforme a jornada:

| Tipo | Para quem | Ação (label do botão) |
|---|---|---|
| `document_available` | Consultor | "Ver documento" |
| `project_started` | Consultor | "Ver projeto" |
| `project_health_alert` | GP | "Ver projeto" |
| `nps_response_received` | GP | "Ver resposta" |
| `card_assigned` | Consultor | "Ver atividade" |
| `system` | Todos | Apenas informativo (sem botão) |

Cada tipo recebe ícone próprio e cai numa tab coerente (ex.: `document_available` → "Documentos"; `project_*`/`card_assigned` → "Projetos").

**CA-03 — Botões de ação usam `action_url`**
- `InboxDetailPanel.tsx` renderiza o botão de ação primária navegando para `action_url` da notificação
- Quando `action_url` é `null`/ausente (ex.: `system`): botão **não** aparece e o layout não quebra
- Label do botão derivado do tipo (tabela CA-02)

**CA-04 — Tab "Documentos"**
Adicionar a tab/folder "Documentos" (filtra `document_available`), alinhando às tabs da jornada (Todas, Não lidas, Reembolsos, Projetos, Documentos). Tabs existentes preservadas.

**CA-05 — "Marcar todas como lidas" + badge Realtime**
Garantir botão "Marcar todas como lidas" (reusa `useMarkMultipleNotificationsRead`) e que o badge da navbar (`InboxButton`) atualize via Realtime já existente, agora também refletindo `read_at`.

**CA-06 — Estado vazio por tab**
Cada tab sem itens mostra estado vazio orientativo (preservar/garantir nas tabs novas).

## Fora do Escopo
- Emissão das notificações pelas jornadas de origem (J7 timesheet reminder, J8 reembolso, J9 documento) — cada uma dispara seu tipo; aqui só o consumo/exibição
- Paginação para 50+ não lidas (cenário-limite — avaliar se necessário em task própria)
- Layout mobile dedicado / PWA (J12)

## Notas Técnicas
- Página/Realtime: `src/pages/Inbox.tsx` (canal `postgres_changes` filtrado por `recipient_id`, linhas ~84-109)
- Painéis: `src/components/inbox/InboxSidebar.tsx`, `InboxListPanel.tsx`, `InboxDetailPanel.tsx`
- Hook/tipos: `useInboxNotifications.ts`; mutations `useMarkNotificationRead()`, `useMarkMultipleNotificationsRead()`
- Banco: `notifications` (migration 20260228235936 + 20260320170531: `category/priority/action_type/action_url/metadata/is_resolved/is_archived`); adicionar `read_at`; RLS por `recipient_id`/`tenant_id`
- Badge: `InboxButton`
- Não reescrever a arquitetura de dois painéis nem o Realtime — apenas estender tipos, `read_at` e uso de `action_url`

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Notificação `document_available` recebida | Aparece com ícone próprio na tab "Documentos"; botão "Ver documento" navega via `action_url` |
| Notificação `card_assigned` | Botão "Ver atividade" leva ao `action_url` da atividade |
| Notificação `system` (`action_url: null`) | Sem botão; layout intacto |
| Selecionar notificação não lida | `is_read` + `read_at` gravados; badge decrementa via Realtime |
| "Marcar todas como lidas" | Todas marcadas; `read_at` setado em lote; badge zera |
| Dois dispositivos abertos | Lido em um reflete como lido no outro via Realtime |
| Tab "Documentos" sem itens | Estado vazio orientativo |
