# FUNC-J6 — Navegação e Execução no Projeto
> Jornada: Funcionário J6 · Estado auditado: 🟡 PARCIAL (~60%)
> Dependências externas: **GP Projetos (Koi)** — board de atividades e cards (`project_activity_cards`, `ProjectActivitiesTab`). Esta task **absorve e expande** o quick win FUNC-J6-MYCARDS para cobrir a jornada inteira.
> Esta é a jornada de maior volume de acesso do sistema. **Meta: máximo 3 cliques do login até o primeiro card aberto.**

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Aba padrão = Atividades para consultor (`ProjectDetail.tsx:63-65` `initialTab = canAccessFullProject ? 'overview' : 'activities'`; `MyProjectDetail.tsx:184` idem)
- Abas Custos/Financeiro **completamente ausentes** para o consultor (`ProjectDetail.tsx:266-283` dentro de `canAccessFullProject`; `MyProjectDetail.tsx` nem as inclui)
- Conjunto de abas do consultor: Visão Geral, OKRs, Roadmap, Atividades, Equipe, Stakeholders (`MyProjectDetail.tsx:182-257`)
- Trabalhar no card: painel, edição, comentário, histórico (`ProjectActivitiesTab`)

**❌ Pendente:**
- Filtro "Apenas meus cards" ativo por padrão para o consultor (nenhum toggle em `ProjectActivitiesTab`)
- Filtro bidirecional Roadmap ↔ Kanban (clique em marco filtra o board) — `MyProjectScheduleTab` existe sem esse vínculo
- Métrica/documentação dos 3 cliques (F7)

## História de Usuário

**Como** Consultor que abre um projeto para trabalhar,
**quero** cair direto nas minhas atividades, ver por padrão só os meus cards e usar o Roadmap para filtrar o board por marco,
**para que** eu chegue ao que preciso fazer hoje em no máximo 3 cliques, sem a interface densa do GP.

## Contexto

A jornada J6 já tem a estrutura certa (aba padrão correta, abas financeiras ocultas, visão por papel). Faltam os dois filtros que fecham a meta dos 3 cliques: "apenas meus cards" ligado por padrão e o cruzamento Roadmap↔Kanban. O board de atividades e os cards são do **GP Projetos (Koi)** — os filtros operam client-side sobre os cards que o `ProjectActivitiesTab` (de Projetos) já carrega; portanto o comportamento depende da estrutura de cards e de assignee mantida por aquela equipe.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Filtro "Apenas meus cards" padrão por papel** _(Depende de GP Projetos (Koi) — estrutura de cards/assignee)_
- Para consultor (`!isManager` / acesso restrito): filtro "Apenas meus cards" **ativo por padrão** ao abrir a aba Atividades
- Para GP/manager: filtro inicia desligado (board completo)
- Derivar o papel do mesmo sinal já usado para `initialTab`/`canAccessFullProject`

**CA-02 — Toggle "Ver todos"**
- Controle visível alternando "Apenas meus cards" ↔ "Ver todos"
- Estado persiste durante a navegação na aba (não precisa persistir entre sessões)

**CA-03 — Critério de "meu card"** _(Depende de GP Projetos (Koi))_
- Card é "meu" quando o consultor logado é o responsável/assignee da atividade em `project_activity_cards`
- Filtro client-side sobre os cards já carregados pelo `ProjectActivitiesTab`

**CA-04 — Estado vazio do filtro**
- Filtro ativo e nenhum card atribuído: estado vazio orientativo ("Você não tem atividades atribuídas neste projeto. Use 'Ver todos' para ver o board completo.")

**CA-05 — Roadmap ↔ Kanban** _(Depende de GP Projetos (Koi) — vínculo card↔marco)_
- Clicar em um marco no Roadmap filtra a aba Atividades para mostrar apenas os cards vinculados àquele marco
- Indicador visível do marco ativo + ação para limpar o filtro
- Combina com o filtro "Apenas meus cards" (interseção: meus cards desse marco)
- Marco sem cards vinculados: estado vazio orientativo

### Parte B — Melhorias no existente (depois)

**CA-06 — Medição dos 3 cliques**
- Documentar o caminho login → Meus Projetos → Projeto X → Aba Atividades (= 3 cliques) e registrar caminho atual vs. novo (entregável de documentação da jornada)

**CA-07 — Estado vazio de projeto em planejamento**
- Projeto em planejamento sem cards: aba Atividades mostra estado vazio orientativo (não board quebrado)

**CA-08 — Reforço de RLS nas abas ocultas**
- Acessar aba Custos/Financeiro via URL (ex.: `?tab=costs`) como consultor: bloqueado por RLS e redirecionado/escondido na UI (confirmar, não regredir o comportamento atual)

## Fora do Escopo
- Movimento bidirecional do card refletindo no Meu Kanban (é FUNC-J4 — task separada)
- Painel lateral em tela cheia no mobile (J12 PWA — task separada)
- Edição/permissões de mover card além do já existente (mover para "done" só responsável já tratado no fluxo de card)
- Construção do board de atividades em si (é GP Projetos J6 — equipe Koi)

## Notas Técnicas
- Componentes: `ProjectActivitiesTab` (usado por `ProjectDetail.tsx` e `MyProjectDetail.tsx`); roadmap: `MyProjectScheduleTab`
- Derivar `isManager`/acesso restrito do mesmo sinal de `initialTab`/`canAccessFullProject` já presente
- Filtros são client-side sobre os cards carregados; "meu card" = assignee == employee logado
- Cards e vínculo card↔marco pertencem ao GP Projetos (`project_activity_cards`) — coordenar com a equipe Koi
- Respeitar `tenant_id` e RLS; não relaxar o ocultamento das abas financeiras

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Consultor abre aba Atividades | Filtro "Apenas meus cards" ativo; vê só os seus (Depende de GP Projetos) |
| Consultor clica "Ver todos" | Board completo aparece; estado persiste na navegação da aba |
| GP abre aba Atividades | Filtro desligado por padrão |
| Consultor sem cards atribuídos | Estado vazio orientativo |
| Clique em marco no Roadmap | Aba Atividades filtra pelos cards do marco (Depende de GP Projetos) |
| Marco + "Apenas meus cards" | Mostra interseção (meus cards do marco) |
| Marco sem cards | Estado vazio; ação de limpar filtro disponível |
| Consultor acessa `?tab=costs` via URL | RLS bloqueia; UI esconde/redireciona |
| Login → projeto → aba Atividades | 3 cliques até o primeiro card; caminho documentado |
