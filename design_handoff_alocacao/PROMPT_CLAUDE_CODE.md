# Prompt para o Claude Code — Implementação da Tela de Alocação

Cole o texto abaixo no Claude Code, com este pacote (`design_handoff_alocacao/`) e os dois specs (`prompt-refatoracao-tela-alocacao.md`, `prompt-refatoracao-aba-equipe.md`, `sobre-pulse.md`) disponíveis no repositório.

---

Você vai refatorar a tela de Alocação (`/alocacao`) do Origami Pulse e criar a tela de detalhamento do colaborador. Contexto de produto, regras de dados, permissões e RLS estão em `prompt-refatoracao-tela-alocacao.md`, `prompt-refatoracao-aba-equipe.md` e `sobre-pulse.md` — **leia os três primeiro e siga-os à risca** para fórmulas, multi-tenant e padrões de código.

A camada visual está definida em `design_handoff_alocacao/README.md` + o protótipo hifi em `design_handoff_alocacao/prototipo/Alocacao - Variacoes.dc.html` (abra no navegador) e os screenshots em `design_handoff_alocacao/screenshots/`. **Recrie os designs pixel-a-pixel usando os componentes e tokens já existentes no codebase** (React + TS, Tailwind com tokens semânticos, shadcn/ui, TanStack Query, Supabase). O HTML é referência, não para copiar; os emoji `✎`/`🔒` viram ícones Lucide (`pencil`/`lock`).

Implemente, nesta ordem:

1. **`src/lib/utilization.ts`** — `getUtilizationStatus(plannedHours, capacityHours)` retornando `{ status, percent, freeHours }` com as faixas: `<70 subalocado` (petróleo/info), `70–90 saudavel` (verde), `>90–105 cheio` (âmbar), `>105 sobrecarga` (vermelho). Exporte as constantes de faixa como ponto único de verdade. Testes Vitest nos limites (69.9/70/90/90.1/105/105.1 e capacidade 0). **Refatore a aba Equipe** para consumir este util e remova os thresholds duplicados (mantendo separada a lógica plan×realizado da célula da aba Equipe).

2. **`allocationService.ts` + `useAllocationOverview.ts`** — agregação de `project_member_months` + `timesheet_entries` por funcionário×mês numa só chamada (view/RPC Supabase; evitar N+1), sempre recebendo `tenantId`. Skeleton por linha.

3. **Tabela `/alocacao` (direção "1b" do protótipo):** barra de temperatura segmentada no topo; grid `Pessoa sticky | mês vigente | +3 futuros | chevron`; agrupamento por severidade com trilho colorido à esquerda; célula vigente = chip de % + mini-barra ancorada com marcador de pró-rata + lançado/desvio + nº projetos; células futuras = heatmap com horas livres protagonistas (sem rótulo textual, cor+tooltip); navegação de janela até 6 meses; rodapé com Σ do tenant. Toggle compacto/confortável.

4. **Filtros e ordenação:** busca por nome; filtros pessoa/projeto/cargo/status/período; toggle "mostrar desligados"; exportar CSV; ordenação default por severidade do mês vigente.

5. **Drawer de detalhe `EmployeeAllocationDrawer` (direção "2a"):** `Sheet` shadcn à direita (~512px). Cabeçalho com avatar/nome/cargo + navegador de meses + resumo (% carga, plan/cap, ritmo pró-rata). `AllocationBreakdownTable`: linha por projeto + "Atividades internas"; colunas Planejado (editável condicional) / Lançado (read-only) / Δ. Rodapé com reconciliação `livres = capacidade − Σplan` + botões Salvar / Ver no projeto. Botão "abrir em tela cheia" → `/alocacao/:employeeId`.

6. **Tela dedicada `/alocacao/:employeeId` (direção "2b"):** breadcrumb + header do colaborador + **tendência de 6 meses** (barras clicáveis por status) + corpo em 2 colunas (breakdown à esquerda; rail com painel de ritmo + histórico de correções à direita) + barra de ação fixa mostrando papel ativo. Reaproveite `AllocationBreakdownTable` e a lógica do drawer.

7. **Edição por linha** via `useTeamMutations.updateMonthHours` (não criar mutation nova): editável só para admin ou GP `manager_id` daquele projeto; projetos de outro GP read-only com estado tracejado + `lock` + "Gerido por {nome}"; internas read-only; mês passado só admin com log em `project_member_month_logs`. Sobrealocação **nunca bloqueia**; ao salvar, invalide `['project-team',…]`, `['allocation-overview',…]`, `['employee-availability',…]` e atualize sem reload.

8. **Auditoria:** garanta que nenhum payload desta tela/drawer/tela-cheia contém campos financeiros. Rode `npm run lint` e `npm run test` (cobrir pró-rata início/meio/fim de mês, precedência de severidade, faixas de utilização, permissão por linha).

Textos de UI em pt-BR, identificadores em inglês, tokens semânticos do Tailwind, `cn()`, `formatDate`/`getProjectMonthLabel`, `useToast`. Não ative strict mode. Pergunte antes de assumir qualquer ambiguidade não coberta pelos specs.
