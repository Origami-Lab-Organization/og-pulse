# Status das Jornadas — GP Projetos (Cecilia / Titila)
> Varredura realizada em: 2026-06-18  
> Base: `jornadas/gp.md` × código em `src/` e `supabase/migrations/`

---

## Legenda

| Símbolo | Significado |
|---|---|
| ✅ EXISTE | Implementado e funcional |
| ⚠️ PARCIAL | Existe, mas incompleto ou divergente da spec |
| ❌ NÃO EXISTE | Não implementado |

---

## J1 — Estrutura e Ciclo de Vida do Projeto
**Criticidade:** ⭐⭐⭐⭐⭐ — Alicerce de todas as outras jornadas

| Item | Status | Observação |
|---|---|---|
| `ProjectDetail.tsx` com abas | ⚠️ PARCIAL | Tem 8 abas, não 10. Abas atuais: Visão Geral, OKR, Custos, Comissão, Cronograma, Stakeholders, Financeiro, Atividades (+ Value Book condicional) |
| Aba Comissão removida | ❌ NÃO EXISTE | `ProjectCommissionsTab.tsx` ainda existe e está ativo no TabsList |
| Ciclo de vida: `execution` | ⚠️ PARCIAL | Stage `value_delivery` ainda está no código — migration para `execution` não executada |
| Ciclo de vida: `case_and_learnings` | ⚠️ PARCIAL | Está como `learning_case` no código — migration pendente |
| Stage `results_presentation` | ✅ EXISTE | Implementado em `portfolio.ts` |
| Stage `planning` e `completed` | ✅ EXISTE | Implementados |
| Indicador visual de ciclo de vida no header | ⚠️ PARCIAL | `ProjectHeader.tsx` exibe badge com cor por stage, mas não é o componente de progresso visual de 5 etapas especificado |
| Permissões granulares por aba (objeto `permissions`) | ❌ NÃO EXISTE | Ainda usa `isReadOnly: boolean`. Existem helpers `canManageProject`, `canEdit`, mas não o objeto `permissions` por aba e por ação |
| Aba placeholder — Métricas | ❌ NÃO EXISTE | Não existe no TabsList |
| Aba placeholder — Equipe (separada) | ❌ NÃO EXISTE | `ProjectTeamSection` está dentro de `ProjectOverviewTab`, não é aba própria |
| Aba placeholder — Arquivos | ❌ NÃO EXISTE | Sem aba, sem tabelas, sem bucket |
| Aba Atividades | ✅ EXISTE | `ProjectActivitiesTab.tsx` com Kanban real |
| Migration de stages no banco | ❌ NÃO EXISTE | `value_delivery` e `learning_case` ainda presentes — migration SQL não executada |

**Resumo J1:** Parcialmente implementado. Estrutura base existe mas: aba Comissão não removida, stages antigos não migrados, permissões ainda binárias, abas Métricas/Equipe/Arquivos ausentes, indicador de ciclo de vida incompleto.

---

## J2 — Planejamento do Projeto
**Criticidade:** ⭐⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| `ProjectPlanningOverviewTab` | ✅ EXISTE | `src/components/projects/detail/ProjectPlanningOverviewTab.tsx` |
| Checklist ativo com botão de ação direta por item | ❌ NÃO EXISTE | Checklist existe mas é passivo (apenas indicadores visuais, sem botões de ação) |
| 5 itens obrigatórios específicos da spec | ⚠️ PARCIAL | Checklist tem 6 itens com critérios diferentes dos 5 definidos na jornada |
| `useMyAllocationData` | ✅ EXISTE | `src/hooks/useMyAllocationData.ts` com lógica real |
| `useEmployeeAvailability(employeeId, startDate, endDate)` | ❌ NÃO EXISTE | Hook específico não existe. Há `useAllocationPlannerData.ts` com assinatura diferente |
| Tabela de disponibilidade mês a mês ao alocar membro | ❌ NÃO EXISTE | Não implementada no fluxo de adicionar membro |
| Calendário de dias úteis com feriados | ❌ NÃO EXISTE | |
| Conferência de NFs inline na aba Financeiro (durante planejamento) | ❌ NÃO EXISTE | |
| Botão "Iniciar Execução" com checklist 5/5 | ❌ NÃO EXISTE | `useProjectPlanningReadiness.ts` existe mas sem UI de transição de stage |
| Dialog de confirmação de transição para Execução | ❌ NÃO EXISTE | |

**Resumo J2:** Base existe (`ProjectPlanningOverviewTab`, `useMyAllocationData`, `useProjectPlanningReadiness`), mas faltam as features centrais: disponibilidade real ao alocar, checklist ativo com ações, e botão/dialog de transição para Execução.

---

## J3 — Visão Geral do Projeto
**Criticidade:** ⭐⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| `ProjectOverviewTab` | ✅ EXISTE | `src/components/projects/detail/ProjectOverviewTab.tsx` |
| Bloco 1 — Header com badge de saúde | ⚠️ PARCIAL | Header existe, badge existe, mas está em `ProjectHeader`, não integrado à Visão Geral |
| Bloco 2 — KPIs financeiros (receita, custo, margem, próxima NF) | ⚠️ PARCIAL | Dados de custo existem, mas layout dos 5 KPIs específicos não está estruturado assim |
| Bloco 3 — Progresso operacional (horas, OKRs, próximo marco) | ⚠️ PARCIAL | Dados existem dispersos, não como bloco coeso |
| Bloco 4 — Equipe compacta (sem custo) | ✅ EXISTE | `ProjectTeamSection` na Visão Geral (sem custo/hora) |
| Bloco 5 — Atividade recente (5 últimas ações) | ❌ NÃO EXISTE | |
| `useProjectHealthIndicators` (hook compartilhado J3/J11) | ⚠️ PARCIAL | `useProjectHealthData.ts` e `calculateProjectHealth` existem, mas com assinatura/escopo diferente do hook compartilhado especificado |
| Badge de saúde clicável com popover de detalhamento | ❌ NÃO EXISTE | Badge existe mas não é clicável com popover |
| View do Consultor sem dados financeiros | ⚠️ PARCIAL | Lógica `canAccessFullProject` existe, mas não há views completamente separadas |
| Bloco de retrospectiva interna (fase Case e Aprendizados) | ❌ NÃO EXISTE | |
| Campos de retrospectiva na tabela `projects` | ❌ NÃO EXISTE | |

**Resumo J3:** Componente existe mas não tem a estrutura de 5 blocos especificados. Badge de saúde sem popover interativo, sem bloco de atividade recente, sem retrospectiva.

---

## J4 — Objetivos do Projeto (OKR → Objetivos)
**Criticidade:** ⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| `ProjectOKRsTab` | ✅ EXISTE | Totalmente implementado com CRUD, nível de confiança, histórico de KRs |
| Renomeação "OKR" → "Objetivos" na interface | ❌ NÃO EXISTE | Interface ainda usa "OKR" em labels, título da aba, headings |
| Check-in inline por KR (popover compacto) | ⚠️ PARCIAL | `OKRHistoryPopover` existe para visualizar histórico, mas a atualização de `current_value` ainda é via dialog completo |
| Salvar check-in em `KeyResultHistory` com timestamp/quem | ✅ EXISTE | Histórico de KRs funcional |
| Status do OKR inline (pending → in_progress → completed) | ✅ EXISTE | Status badges inline |
| Sugestão de marcar KRs como atingidos ao concluir OKR | ❌ NÃO EXISTE | |
| View Consultor (somente leitura, sem botões de edição) | ⚠️ PARCIAL | Existe lógica de readonly mas não view explicitamente separada |
| Cards de métricas (X/Y concluídos, progresso %, KRs no prazo) | ❌ NÃO EXISTE | |

**Resumo J4:** Jornada mais avançada. CRUD completo, histórico funcional. Faltam: renomeação da interface, check-in verdadeiramente inline (popover sem dialog completo), cards de métricas.

---

## J5 — Roadmap e Marcos
**Criticidade:** ⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| `ProjectScheduleTab` | ✅ EXISTE | `ProjectScheduleTab.tsx` com CRUD de milestones e timeline |
| Renomeação "Cronograma" → "Roadmap" | ❌ NÃO EXISTE | Interface usa "Cronograma" em todos os labels |
| `milestone_type` com 4 tipos (milestone, release, epic, internal) | ❌ NÃO EXISTE | Tabela `project_milestones` só tem `status` — sem coluna `milestone_type` |
| Vínculo com OKR (`okr_id`) | ❌ NÃO EXISTE | |
| Timeline reformulada (colunas = meses, barras coloridas, diamantes) | ❌ NÃO EXISTE | Timeline horizontal rudimentar atual |
| Status `delayed` automático ao abrir a página | ⚠️ PARCIAL | Campo `delayed` existe no enum `MilestoneStatus`, mas lógica automática não identificada |
| Integração com Atividades J6 (contagem de cards por marco) | ❌ NÃO EXISTE | |
| Cards de métricas (concluídos X/Y, próxima entrega, atrasados, % concluído) | ❌ NÃO EXISTE | |

**Resumo J5:** Estrutura base existe, mas é a versão anterior (sem tipos, sem timeline reformulada, sem integração). Quase toda a spec de melhorias ainda não implementada.

---

## J6 — Atividades (Kanban do Projeto)
**Criticidade:** ⭐⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| Aba Atividades com Kanban | ✅ EXISTE | `ProjectActivitiesTab.tsx` com Kanban funcional e DndContext |
| Tabela `project_board_columns` | ✅ EXISTE | Migration `20260410205318` |
| Tabela `project_cards` | ✅ EXISTE | Como `project_activity_cards` na migration |
| Tabela `project_card_comments` | ❌ NÃO EXISTE | Não encontrada em migrations |
| Tabela `project_card_labels` | ⚠️ PARCIAL | Existe como `project_activity_tags` |
| Tabela `project_card_column_history` | ❌ NÃO EXISTE | Necessária para J7 (cycle time, aging) |
| Tabela `project_card_field_history` | ❌ NÃO EXISTE | |
| Drag-and-drop com @dnd-kit | ✅ EXISTE | DndContext implementado |
| Painel lateral do card (não dialog central) | ✅ EXISTE | `ActivityCardDetailDrawer` |
| Permissão: apenas responsável ou GP move para `done` | ❌ NÃO EXISTE | |
| Comentários com upload de anexos | ❌ NÃO EXISTE | |
| Histórico auditável por evento (mudança de coluna, responsável, etc.) | ⚠️ PARCIAL | `updated_at` existe, mas não histórico estruturado por evento |
| Filtros (responsável, prioridade, tipo, "apenas meus cards") | ⚠️ PARCIAL | Filtros básicos existem |
| Cards de métricas da aba | ❌ NÃO EXISTE | |
| Mapeamento para Meu Kanban pessoal (J4 Funcionário) — F9 | ❌ NÃO EXISTE | |

**Resumo J6:** Kanban funcional e usável. Faltam: tabelas de histórico por evento (bloqueiam J7), comentários com anexos, permissão fina para mover para `done`, cards de métricas.

---

## J7 — Métricas do Projeto
**Criticidade:** ⭐⭐⭐ — **Depende de J6**

| Item | Status | Observação |
|---|---|---|
| Aba Métricas separada | ❌ NÃO EXISTE | Não está no TabsList |
| Throughput (cards para `done` por semana) | ❌ NÃO EXISTE | |
| Cycle Time (mediana `in_progress → done`) | ❌ NÃO EXISTE | Requer `project_card_column_history` de J6 |
| WIP (cards em `in_progress` + `review`) | ❌ NÃO EXISTE | |
| Taxa no Prazo (% com `completed_at ≤ due_date`) | ❌ NÃO EXISTE | |
| Aging do Backlog (tempo médio parado sem movimentação) | ❌ NÃO EXISTE | |
| Gráfico de throughput por semana (Recharts) | ❌ NÃO EXISTE | |
| Histograma de cycle time com P50/P85/P95 | ❌ NÃO EXISTE | |
| Tabela de aging do backlog | ❌ NÃO EXISTE | |
| WIP Threshold configurável | ❌ NÃO EXISTE | |
| Filtro de período (7/14/30/90 dias) | ❌ NÃO EXISTE | |

**Resumo J7:** Totalmente não implementado. Depende da tabela `project_card_column_history` de J6 que também não existe.

---

## J8 — Equipe
**Criticidade:** ⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| Aba Equipe separada da aba Custos | ❌ NÃO EXISTE | `ProjectTeamSection` está embutida em `ProjectOverviewTab` |
| Cards de métricas (horas plan, realizadas, %, acima do plan, sem horas) | ❌ NÃO EXISTE | |
| Tabela mês a mês com `Xh plan / Yh real` com cores | ❌ NÃO EXISTE | `useProjectMemberMonths` existe mas sem tabela visual separada |
| Consultor logado na primeira linha | ❌ NÃO EXISTE | |
| Replanejamento: adicionar membro com visão de disponibilidade | ❌ NÃO EXISTE | Requer `useEmployeeAvailability` de J2 |
| Editar horas planejadas inline por célula de mês | ❌ NÃO EXISTE | |
| Remover membro com regra de bloqueio quando tem horas | ❌ NÃO EXISTE | |
| Confirmar que custo/hora não chega ao frontend do consultor | ⚠️ PARCIAL | RLS existe, mas view separada não implementada |

**Resumo J8:** Jornada completamente nova. Hook de dados (`useProjectMemberMonths`) existe, mas toda a interface da aba Equipe precisa ser criada.

---

## J9 — Custos do Projeto
**Criticidade:** ⭐⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| `ProjectCostsTab` | ✅ EXISTE | `src/components/projects/detail/ProjectCostsTab.tsx` |
| Seção de fornecedores (supplier) | ✅ EXISTE | `ProjectSuppliersSection` |
| Seção de materiais (material) | ✅ EXISTE | `ProjectMaterialsSection` |
| Seção de reembolsos (somente leitura) | ✅ EXISTE | `ProjectReimbursementsSection` com lógica read-only |
| Categorias: `subscription`, `equipment_rental`, `travel` | ❌ NÃO EXISTE | Não existem como categorias — tabelas não têm coluna `category` expandida |
| Gráfico consolidado mensal (planejado vs. realizado) | ✅ EXISTE | `ProjectCostBreakdownChart` |
| Tabs/Accordion por categoria (sem 3 tabelas independentes) | ❌ NÃO EXISTE | Estrutura atual tem 3 seções independentes com scroll |
| `FinancialSummaryCard` como primeiro elemento | ⚠️ PARCIAL | Existe mas posicionamento/integração incerto |

**Resumo J9:** Estrutura base sólida com dados e gráfico. Faltam: categorias expandidas, reorganização em accordion por categoria (eliminar 3 tabelas independentes), migration para adicionar coluna `category`.

---

## J10 — Stakeholders e NPS
**Criticidade:** ⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| `ProjectStakeholdersTab` com CRUD | ✅ EXISTE | Completo com influência, interesse, sponsorship_level |
| Matriz de influência/interesse | ✅ EXISTE | |
| `sponsorship_level` (promotor/neutro/detrator) manual | ✅ EXISTE | |
| Sistema de pesquisa NPS | ❌ NÃO EXISTE | |
| Tabela `nps_surveys` | ❌ NÃO EXISTE | |
| Tabela `nps_survey_recipients` (token único) | ❌ NÃO EXISTE | |
| Tabela `nps_responses` | ❌ NÃO EXISTE | |
| Tabela `nps_auto_triggers` | ❌ NÃO EXISTE | |
| Disparo manual de pesquisa para stakeholders selecionados | ❌ NÃO EXISTE | |
| Página pública de resposta NPS (fora da auth) | ❌ NÃO EXISTE | |
| Disparo automático por fase/data/intervalo | ❌ NÃO EXISTE | |
| Cards de métricas NPS (NPS total, % por categoria, último disparo) | ❌ NÃO EXISTE | |
| Notificação in-app ao receber resposta negativa | ❌ NÃO EXISTE | |

**Resumo J10:** `ProjectStakeholdersTab` com CRUD completo. Toda a camada de NPS (50% da jornada) está por implementar — tabelas, disparo, página de resposta, visualização.

---

## J11 — Financeiro
**Criticidade:** ⭐⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| `ProjectFinancialTab` | ✅ EXISTE | Implementado |
| 5 KPIs financeiros com alertas coloridos | ⚠️ PARCIAL | KPIs existem mas sem estrutura exata dos 5 com lógica de alerta especificada |
| Seção de Comissões migrada da aba removida | ❌ NÃO EXISTE | Aba Comissão ainda separada, não migrada para Financeiro |
| Pipeline de status de NF inline (pendente → emitida → enviada → recebida) | ⚠️ PARCIAL | `ProjectPaymentsChart` mostra installments, mas pipeline de 4 etapas com update inline não identificado |
| Parcela com emissão vencida em vermelho | ⚠️ PARCIAL | Lógica de datas existe mas UI de alerta inline não confirmada |
| `useProjectHealthIndicators` integrado | ⚠️ PARCIAL | `useProjectHealthData` existe mas não é o hook compartilhado especificado |
| Integração com J18 (seção de aditivos) | ❌ NÃO EXISTE | `project_change_requests` não existe |
| Impostos removidos da aba | ❌ NÃO EXISTE | Status não verificado |

**Resumo J11:** Aba Financeiro funcional com dados. Faltam: migração das comissões, pipeline inline de NFs, integração com aditivos (J18).

---

## J12 — Arquivos do Projeto
**Criticidade:** ⭐⭐

| Item | Status | Observação |
|---|---|---|
| Aba Arquivos no TabsList | ❌ NÃO EXISTE | |
| Tabela `project_folders` | ❌ NÃO EXISTE | |
| Tabela `project_files` | ❌ NÃO EXISTE | |
| Bucket Supabase Storage `project-files` | ❌ NÃO EXISTE | |
| Drop zone + upload com tipos e tamanho máximo | ❌ NÃO EXISTE | |
| Pastas sugeridas na criação do projeto | ❌ NÃO EXISTE | |
| Integração: contrato do fechamento → `project_files` automático | ❌ NÃO EXISTE | |
| RLS: consultor não deleta arquivo de outro | ❌ NÃO EXISTE | |

**Resumo J12:** Totalmente não implementado. É a "jornada mais rápida de implementar no dia" conforme a spec — bom candidato para ser feita em paralelo.

---

## J13 — Portfólio de Projetos
**Criticidade:** ⭐⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| `PortfolioKanbanBoard` | ✅ EXISTE | `src/components/portfolio/PortfolioKanbanBoard.tsx` com DnD |
| Migration de stages (`value_delivery → execution`, etc.) | ❌ NÃO EXISTE | Stages antigos ainda no banco |
| Filtro padrão "apenas meus projetos" para GP | ✅ EXISTE | `Portfolio.tsx` aplica `managerId` automaticamente para PMs |
| Toggle "Todos os projetos" persistido na URL (`?view=all`) | ❌ NÃO EXISTE | |
| Filtros: GP, Cliente, Linha de Serviço, Fase, Busca | ⚠️ PARCIAL | Filtros existem mas não todos os especificados |
| Badge de saúde no card (Saudável/Atenção/Crítico) | ⚠️ PARCIAL | `calculateProjectHealth` existe mas badge no card não confirmado |
| Card redesenhado com próxima NF, margem, alertas de ícone | ⚠️ PARCIAL | Card existe mas sem os campos específicos da spec |
| Drag restrito (GP arrasta só seus projetos) | ✅ EXISTE | Validação `canEditProject` bloqueia drag |
| Cards de métricas no topo (ativos, em risco, NFs atraso, margem média) | ⚠️ PARCIAL | `PortfolioKPIBar` existe com KPIs, mas não os 4 especificados |

**Resumo J13:** Estrutura funcional. Precisa de: migration de stages, badge de saúde nos cards, redesign do card com dados financeiros, URL com `?view`, ajuste dos cards de métricas.

---

## J14 — Cards de Métricas por Aba (Transversal)
**Criticidade:** ⭐⭐⭐⭐ — **Implementar nas primeiras 2 horas**

| Item | Status | Observação |
|---|---|---|
| Componente `ProjectMetricCard` | ❌ NÃO EXISTE | Sem componente padronizado com as props especificadas |
| Componente `ProjectMetricsBar` (container grid responsivo) | ❌ NÃO EXISTE | `PortfolioKPIBar` existe no portfólio mas não é o componente transversal |
| Loading state com skeleton | ❌ NÃO EXISTE | |
| Card clicável com filtro na mesma aba | ❌ NÃO EXISTE | |
| Tooltip com explicação do cálculo | ❌ NÃO EXISTE | |
| Grid responsivo (2 cols mobile, 3 tablet, 6 desktop) | ❌ NÃO EXISTE | |
| Padrão consistente usado em 5+ abas | ❌ NÃO EXISTE | |

**Resumo J14:** Totalmente não implementado como componente transversal. É o componente fundação que desbloqueia J3 a J12 — deve ser o primeiro a ser criado.

---

## J15 — Alocação da Equipe (Página Standalone)
**Criticidade:** ⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| Página `/alocacao` com rota | ❌ NÃO EXISTE | Rota não existe no router |
| `AllocationOverview` como componente | ⚠️ PARCIAL | `useMyAllocationData` e queries RPC existem, mas sem página UI dedicada |
| Grade de utilização: funcionários × 4 meses | ❌ NÃO EXISTE | |
| Barra de progresso por célula com cores (verde/amarelo/vermelho) | ❌ NÃO EXISTE | |
| Tooltip: breakdown projetos vs. atividades internas | ❌ NÃO EXISTE | |
| Integração de atividades internas (`activity_timesheet_entries`) | ⚠️ PARCIAL | Query RPC referencia atividades internas mas UI não existe |
| Filtros (nome, utilização, projeto, cargo) | ❌ NÃO EXISTE | |
| Cards de métricas (sobrecarregados, desalocados, utilização média) | ❌ NÃO EXISTE | |
| Click em funcionário → `EmployeeTimesheetPage` | ❌ NÃO EXISTE | (depende da rota existir) |

**Resumo J15:** Dados parcialmente disponíveis via hooks/RPC, mas toda a interface da página precisa ser criada do zero.

---

## J16 — Analytics de Projetos (Página)
**Criticidade:** ⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| Página `/analytics` | ✅ EXISTE | `Analytics.tsx` implementado |
| Range picker (de mês único para período customizável) | ⚠️ PARCIAL | `AnalyticsFilters` tem granularity (month/quarter/year) mas não range picker com presets `últimos 3 meses / 6 meses / este ano` |
| Permissões: GP vê apenas seus projetos | ⚠️ PARCIAL | Lógica de roles existe mas não verificado se GP é filtrado corretamente |
| KPIs da carteira | ✅ EXISTE | |
| Ranking de projetos por margem | ✅ EXISTE | `MarginRankingChart`, `ProjectMarginTable` |
| Gráfico de receita e custo mensal (barras agrupadas + linha de margem) | ✅ EXISTE | |
| Breakdown de custo por categoria (rosca) | ✅ EXISTE | `CostBreakdownChart`, `CostMixDonut` |
| Performance por linha de serviço | ✅ EXISTE | |
| NPS do portfólio | ❌ NÃO EXISTE | Depende de J10 (NPS não implementado) |

**Resumo J16:** Jornada mais completa. Faltam: range picker com presets, NPS do portfólio (bloqueado por J10), verificação de filtro por GP.

---

## J18 — Gestão de Mudança de Escopo (Aditivos)
**Criticidade:** ⭐⭐⭐⭐⭐

| Item | Status | Observação |
|---|---|---|
| Schema `project_change_requests` | ❌ NÃO EXISTE | Tabela não existe em nenhuma migration |
| Dialog de criar aditivo com impacto em tempo real | ❌ NÃO EXISTE | |
| Exibição: contrato atual → delta → novo total → nova margem | ❌ NÃO EXISTE | |
| Regra de auto-aprovação (margem ≥ mínimo) | ❌ NÃO EXISTE | |
| Fluxo pending_approval → notificação → admin aprova/rejeita | ❌ NÃO EXISTE | |
| Notificação in-app para o admin | ❌ NÃO EXISTE | |
| Aplicação automática: atualiza `total_value`, gera/cancela parcelas | ❌ NÃO EXISTE | |
| Histórico de aditivos na aba Financeiro | ❌ NÃO EXISTE | |
| Bloqueio de edição direta de `total_value` | ❌ NÃO EXISTE | Campo editável diretamente no `ProjectFormDialog` |
| Extensão de prazo via aditivo (atualiza `end_date`) | ❌ NÃO EXISTE | |

**Resumo J18:** Totalmente não implementado. É a jornada de maior impacto estratégico não realizada — sem a tabela `project_change_requests`, `total_value` pode ser editado diretamente sem rastreabilidade.

---

## Quadro Geral de Status

| Jornada | Título | Impacto | Status Geral | % Estimado |
|---|---|---|---|---|
| J1 | Estrutura e Ciclo de Vida | ⭐⭐⭐⭐⭐ | ⚠️ PARCIAL | ~40% |
| J2 | Planejamento do Projeto | ⭐⭐⭐⭐⭐ | ⚠️ PARCIAL | ~25% |
| J3 | Visão Geral | ⭐⭐⭐⭐⭐ | ⚠️ PARCIAL | ~35% |
| J4 | Objetivos (OKR) | ⭐⭐⭐ | ⚠️ PARCIAL | ~65% |
| J5 | Roadmap e Marcos | ⭐⭐⭐⭐ | ⚠️ PARCIAL | ~30% |
| J6 | Atividades (Kanban) | ⭐⭐⭐⭐⭐ | ⚠️ PARCIAL | ~60% |
| J7 | Métricas do Projeto | ⭐⭐⭐ | ❌ NÃO EXISTE | ~0% |
| J8 | Equipe | ⭐⭐⭐⭐ | ❌ NÃO EXISTE | ~5% |
| J9 | Custos | ⭐⭐⭐⭐⭐ | ⚠️ PARCIAL | ~55% |
| J10 | Stakeholders e NPS | ⭐⭐⭐⭐ | ⚠️ PARCIAL | ~35% |
| J11 | Financeiro | ⭐⭐⭐⭐⭐ | ⚠️ PARCIAL | ~45% |
| J12 | Arquivos | ⭐⭐ | ❌ NÃO EXISTE | ~0% |
| J13 | Portfólio | ⭐⭐⭐⭐⭐ | ⚠️ PARCIAL | ~50% |
| J14 | Cards de Métricas (Transversal) | ⭐⭐⭐⭐ | ❌ NÃO EXISTE | ~0% |
| J15 | Alocação da Equipe | ⭐⭐⭐⭐ | ❌ NÃO EXISTE | ~10% |
| J16 | Analytics | ⭐⭐⭐⭐ | ✅ QUASE COMPLETO | ~80% |
| J18 | Aditivos (Mudança de Escopo) | ⭐⭐⭐⭐⭐ | ❌ NÃO EXISTE | ~0% |

---

## Dependências Críticas Bloqueadas

| Dependência | Estado |
|---|---|
| **J14 (ProjectMetricCard)** bloqueia J3, J4, J5, J6, J7, J8, J9, J11 | ❌ J14 não implementado |
| **J6 (project_card_column_history)** bloqueia J7 inteiro | ❌ Tabela ausente |
| **J1 (migration de stages)** bloqueia J13 (cards antigos no portfólio) | ❌ Migration pendente |
| **J2 (useEmployeeAvailability)** bloqueia J8 e J15 | ❌ Hook não existe |
| **J10 (NPS)** bloqueia J16 bloco NPS do portfólio | ❌ NPS não implementado |
| **J18 (project_change_requests)** bloqueia J11 seção de aditivos | ❌ Tabela ausente |

---

## O Que Fazer Primeiro (segundo a spec)

1. **J14** — Criar `ProjectMetricCard` + `ProjectMetricsBar` (nas primeiras 2 horas — desbloqueia tudo)
2. **J1** — Executar migration de stages + remover aba Comissão + adicionar abas placeholder
3. **J13** — Portfólio: migration de stages + badge de saúde nos cards
4. **J6** — Criar `project_card_column_history` e `project_card_comments` (desbloqueia J7)
5. **J2** — Criar `useEmployeeAvailability` + botão "Iniciar Execução" (desbloqueia J8 e J15)

---

*Gerado automaticamente por varredura de código — og-pulse — 2026-06-18*
