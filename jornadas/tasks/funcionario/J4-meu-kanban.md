# FUNC-J4 — Meu Kanban (visão unificada + movimento bidirecional)
> Jornada: Funcionário J4 · Estado auditado: 🟡 PARCIAL (~65%)
> Dependências externas: **GP Projetos (Koi)** — board de atividades (`project_activity_cards`) e configuração do mapeamento de colunas por projeto (GP Projetos J2). Esta task **absorve e expande** o quick win FUNC-J4-BIDIR para cobrir a jornada inteira.

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- View agregada de duas fontes: `personal_kanban_cards`/`personal_kanban_columns` + `project_activity_cards` (`src/services/personalKanbanService.ts`)
- Colunas fixas com mapeamento **fixo no código** `PROJECT_TO_PERSONAL_COLUMN` (`src/types/personalKanban.ts`)
- Diferenciação visual card pessoal vs. card de projeto (`PersonalKanbanColumn.tsx`, `ProjectActivityCardItem.tsx`)
- Criação de tarefa pessoal com título, descrição e `due_date` (`useCreatePersonalCard()`)
- Infra de banco: `personal_kanban_columns`/`personal_kanban_cards` (migration 20260427200000), `due_date` + tags (20260427210000), RLS

**❌ Pendente:**
- Tabela configurável `project_column_status_mapping` (hoje só o mapa fixo no código)
- Movimento bidirecional: cards de projeto são **read-only** (`ProjectCardDetailDialog.tsx`: "Para editar, acesse a atividade do projeto"); mover card pessoal de projeto não reflete em `project_activity_cards`
- Realtime de chegada/saída do board do projeto (GP move → Meu Kanban reflete)
- Filtros Todos/Pessoais/Projetos (sem componente em `PersonalKanbanBoard.tsx`)
- Bloqueio de mover para coluna `done` sem ser o responsável
- Aviso "GP não configurou o mapeamento"

## História de Usuário

**Como** Consultor,
**quero** ver minhas tarefas pessoais e as atividades de projeto atribuídas a mim em uma única tela, e mover um card de projeto refletindo a mudança no board do projeto,
**para que** eu gerencie tudo em um só lugar sem ferramenta externa e sem deixar o board do GP desatualizado.

## Contexto

Núcleo da jornada J4. O kanban pessoal e os cards de projeto já coexistem na view agregada; o que falta é o caminho de volta (bidirecional), a configurabilidade do mapeamento e os filtros. O movimento bidirecional e o mapeamento de colunas **dependem do board do GP Projetos (Koi)** — `project_activity_cards` já existe, mas a configuração por projeto (qual coluna do board ↔ qual status pessoal) é responsabilidade da equipe de Projetos (GP Projetos J2). Aqui assumimos os dados da tabela de mapeamento e tratamos graciosamente sua ausência.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Tabela de mapeamento configurável** _(Depende de GP Projetos (Koi))_
- Criar `project_column_status_mapping`: `id`, `tenant_id`, `project_id`, `column_id`, `personal_status` (`todo`/`doing`/`done`)
- Migration versionada + RLS por `tenant_id` e membership do projeto
- A **UI de configuração** do mapeamento é do GP Projetos J2 (fora desta task); aqui apenas consumir os dados

**CA-02 — Helper de mapeamento centralizado**
- Helper único que resolve coluna do board ↔ `personal_status` lendo `project_column_status_mapping`, com **fallback** no `PROJECT_TO_PERSONAL_COLUMN` quando não houver linha configurada
- Não duplicar a lógica entre leitura (entrada do card) e escrita (movimento de volta)

**CA-03 — Movimento bidirecional do card de projeto** _(Depende de GP Projetos (Koi))_
- Ao arrastar um card de projeto para outra coluna pessoal:
  1. identifica o `personal_status` da coluna de destino
  2. resolve a coluna do board do projeto correspondente (CA-02)
  3. atualiza `project_activity_cards.column_id`
- A mudança reflete no board do projeto para o GP (via Realtime — CA-05)

**CA-04 — Mapeamento ausente** _(Depende de GP Projetos (Koi))_
- Projeto sem mapeamento configurado: cards exibidos com aviso "O GP do projeto [Nome] ainda não configurou o mapeamento. Fale com ele para ativar." e movimento bloqueado **apenas para esse projeto** (não quebra o board nem os demais cards)

**CA-05 — Realtime nas duas direções** _(Depende de GP Projetos (Koi))_
- GP move card no board do projeto → Meu Kanban do consultor atualiza sem reload
- Consultor move no Meu Kanban → board do projeto atualiza sem reload
- Canal `postgres_changes` filtrado por projeto/employee

**CA-06 — Permissão de "Done"**
- Mover card para coluna mapeada como `done` sem ser o responsável: bloqueado com mensagem clara; o card retorna à coluna de origem (sem persistir)

### Parte B — Melhorias no existente (depois)

**CA-07 — Filtros Todos / Pessoais / Projetos**
- Toggle em `PersonalKanbanBoard.tsx`: Todos / Pessoais apenas / Projetos (com seleção de projeto específico)
- Filtro client-side sobre os cards já carregados; estado de UI (não persistir entre sessões)

**CA-08 — Card de projeto desalocado some**
- Consultor desalocado de um projeto: os cards daquele projeto deixam de aparecer no Meu Kanban (consistente com a query de membership)

**CA-09 — Campos avançados da tarefa pessoal**
- Criação de tarefa pessoal expõe prioridade além de descrição/`due_date` (alinhar com `personal_tasks` da jornada: `priority`)

## Fora do Escopo
- UI de configuração do mapeamento pelo GP (é GP Projetos J2 — equipe Koi)
- Layout mobile/swipe do kanban (J12 PWA — task separada)
- Edição completa do card de projeto pelo consultor (apenas mover é permitido)

## Notas Técnicas
- Service: `src/services/personalKanbanService.ts`; board: `src/components/my-kanban/PersonalKanbanBoard.tsx`; colunas: `PersonalKanbanColumn.tsx`; itens de projeto: `ProjectActivityCardItem.tsx`; detalhe: `ProjectCardDetailDialog.tsx`
- Tipos/mapa atual: `src/types/personalKanban.ts` (`PROJECT_TO_PERSONAL_COLUMN`)
- Cards de projeto vivem em `project_activity_cards` (dono: GP Projetos — Koi)
- Respeitar `tenant_id` e RLS em toda nova tabela e em toda escrita em `project_activity_cards`
- Realtime via `supabase.channel().on('postgres_changes')` filtrado por projeto/employee

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Mover card de projeto p/ "Fazendo" no Meu Kanban | `project_activity_cards.column_id` atualizado p/ coluna mapeada (Depende de GP Projetos) |
| GP move card no board do projeto | Meu Kanban reflete via Realtime sem reload (Depende de GP Projetos) |
| Projeto sem mapeamento | Aviso exibido, movimento bloqueado só nesse projeto, board não quebra |
| Mover p/ "Done" sem ser responsável | Bloqueado com mensagem; card volta à origem |
| Card pessoal | Controle total; sem efeito em `project_activity_cards` |
| Filtro "Pessoais apenas" | Esconde cards de projeto; mostra só tarefas pessoais |
| Consultor desalocado de projeto | Cards daquele projeto somem do Meu Kanban |
| 30+ cards atribuídos | Board carrega e move com performance aceitável |
