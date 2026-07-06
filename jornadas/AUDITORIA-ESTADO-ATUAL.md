# Auditoria de Código — Estado Atual das Jornadas

**Projeto:** og-pulse (React 18 + Vite + TanStack Query + Supabase)
**Data da auditoria:** 18/06/2026
**Escopo:** Verificação do código real contra as jornadas declaradas em `funcionario.md` e `gp-comercial.md`
**Método:** Leitura direta de rotas (`App.tsx`), páginas, hooks, services, componentes e migrations Supabase. O "Estado Atual" declarado nas jornadas foi **reverificado** — onde diverge da realidade, está sinalizado.

> Legenda: ✅ **IMPLEMENTADO** · 🟡 **PARCIAL** · ❌ **NÃO EXISTE**

---

## Sumário Executivo

### Persona Funcionário / Consultor (12 jornadas)

| # | Jornada | Status | % aprox. | Resumo |
|---|---------|--------|----------|--------|
| J1 | Convite e Primeiro Acesso | 🟡 PARCIAL | ~50% | Infra de convite + guard prontos; falta tela `/primeiro-acesso` dedicada, e-mail melhorado e expiração de link |
| J2 | Onboarding | ❌ NÃO EXISTE | 0% | Nada implementado; falta campo `onboarding_completed` |
| J3 | Caixa de Entrada | ✅ IMPLEMENTADO | ~90% | Página, dois painéis, tabs, Realtime OK; faltam alguns `type` de notificação e uso de `action_url` |
| J4 | Meu Kanban | 🟡 PARCIAL | ~65% | Kanban pessoal + cards de projeto OK; **falta movimento bidirecional** e `project_column_status_mapping` |
| J5 | Meus Projetos | ✅ IMPLEMENTADO | ~85% | Grid, sem dados financeiros, estado vazio, RLS OK; faltam fase planejamento, widget no dashboard, próximo marco |
| J6 | Navegação/Execução no Projeto | 🟡 PARCIAL | ~60% | Aba padrão e abas ocultas OK; falta filtro "apenas meus cards" e filtro Roadmap↔Kanban |
| J7 | Timesheet (pré-preenchimento) | 🟡 PARCIAL | ~50% | Semanal + atividades internas OK; **falta `useTimesheetPrefill` (pré-preenchimento)** e visual sugestão/lançado |
| J8 | Reembolso | ✅ IMPLEMENTADO | ~80% | Criar, status, corrigir/reenviar, notificações OK; faltam impacto nos custos e câmera mobile |
| J9 | Documentos | ❌ NÃO EXISTE | 0% | Sem rota, tabela `employee_documents` ou bucket |
| J10 | Perfil do Funcionário | ❌ NÃO EXISTE | ~5% | Sem rota `/meu-perfil`; faltam campos PIX/banco/endereço e ViaCEP |
| J11 | Ponto do Trabalho | ❌ NÃO EXISTE | 0% | Sem rota `/ponto`, sem `time_records` nem `monthly_timesheet_signatures` |
| J12 | PWA | ❌ NÃO EXISTE | 0% | Sem `vite-plugin-pwa`, manifest, ícones ou service worker |

### Persona GP Comercial (9 jornadas)

| # | Jornada | Status | % aprox. | Resumo |
|---|---------|--------|----------|--------|
| J1 | Cadastro e Gestão de Clientes | 🟡 PARCIAL | ~50% | Upload CNPJ + ViaCEP OK; **campos de contato existem em `leads`, não em `clients`**; falta página `/clients/:id` |
| J2 | Gestão de Oportunidades (renomeação) | ❌ NÃO EXISTE | ~10% | **Nomenclatura antiga em todo lugar** (~50 "CRM", "Lead", "Funil"); falta cliente inline; `service_line` ainda string |
| J3 | Pipeline com Progressão | 🟡 PARCIAL | ~40% | Validação básica de transição existe; faltam modal de preenchimento, badge "Parado", visão por empresa. **Bloqueado por Admin J4** |
| J4 | Orçamentação por Modelo de Receita | 🟡 PARCIAL | ~55% | 4 modelos alta prioridade OK; faltam Indicação/Equity/Combinações; margem mínima depende do Admin J4 |
| J5 | Comentários e Follow-up | 🟡 PARCIAL | ~60% | Criar follow-up + polling 60s OK; faltam timeline com 3 tipos visualmente distintos, follow-up vencido no card, anexos |
| J7 | Arquivamento e Exclusão | 🟡 PARCIAL | ~50% | Motivo obrigatório + delete admin-only OK; **falta campo concorrente**, seleção de etapa na restauração, badge "Reativada" |
| J8 | Negócio Fechado | 🟡 PARCIAL | ~80% | Wizard 3 seções + parcelas + criação de projeto OK; **falta celebração/confetti** e "Distribuir igualmente" |
| J9 | Anexo de Contrato | ❌ NÃO EXISTE | ~5% | `contract_url` existe no banco, mas sem UI de upload |
| J11 | Analytics Comercial | 🟡 PARCIAL | ~50% | KPIs e funil OK; faltam tempo por etapa, win rate por serviço/modelo, KPI "precisam de atenção", novos filtros |

> ⚠️ **Nota importante:** A auditoria do GP Comercial confirma que **J2 (renomeação) NÃO foi feita** — todo o módulo ainda usa "Lead"/"CRM"/"Funil". Portanto, todas as outras jornadas comerciais (J3, J5, J7, J8, J11) ainda operam sobre a nomenclatura antiga no código.

> ⚠️ **Dependências externas (Admin J4 / equipe Tsuru):** J3 e J4 do GP Comercial dependem da migration do Catálogo de Serviços (`service_lines`, `service_revenue_models`), que **não existe** no banco hoje.

---

# PERSONA FUNCIONÁRIO / CONSULTOR

## J1 — Convite e Primeiro Acesso · 🟡 PARCIAL

> Correção ao "Estado Atual" declarado: a tela de troca de senha **existe** em `/change-password` (não `/primeiro-acesso`) e o guard de intercepção **já funciona**.

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — E-mail de convite melhorado | 🟡 | `supabase/functions/send-invite-email/index.ts` — template HTML com credenciais e botão. Remetente genérico (`noreply@resend.dev`), sem nome da empresa, sem validade de 7 dias |
| F2 — Login com senha temporária | ❌ | `src/pages/Login.tsx` — login genérico, sem pré-preenchimento do e-mail vindo do convite |
| F3 — Guard de intercepção | ✅ | `src/components/auth/ProtectedRoute.tsx` — `if (employee?.must_change_password && location.pathname !== '/change-password')` redireciona |
| F4 — Tela `/primeiro-acesso` | 🟡 | `src/pages/ChangePassword.tsx` — existe em `/change-password`, com validação de força; falta indicador em tempo real, UX acolhedora e redirect para `/onboarding` |
| F5 — Link expirado | ❌ | `create-employee-user` sem validação de TTL; nenhuma tela de "link expirado" |

**Infra existente:** `must_change_password` (migration 20260121002930), status `aguardando_confirmacao`, `updatePassword()` (`AuthContext.tsx`), RPC `complete_password_change`.

**Falta:** rota dedicada `/primeiro-acesso`; pré-preenchimento de e-mail; e-mail com empresa + validade; validação de expiração; UX sem sidebar; redirect para onboarding.

---

## J2 — Onboarding · ❌ NÃO EXISTE

Nenhuma infraestrutura implementada. Confirmado: `grep onboarding_completed` → vazio; sem `Onboarding.tsx`; sem rota `/onboarding` em `App.tsx`.

**Falta tudo:** migration (`onboarding_completed`, `onboarding_completed_at`), página `/onboarding` sem sidebar, 3 passos, tela final com atalhos, guard de redirecionamento, banner para quem pulou.

---

## J3 — Caixa de Entrada · ✅ IMPLEMENTADO

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Rota `/inbox` | ✅ | `App.tsx:79`, `src/pages/Inbox.tsx` — substituiu sheet lateral |
| F2 — Layout dois painéis | ✅ | `src/components/inbox/InboxSidebar.tsx`, `InboxListPanel.tsx`, `InboxDetailPanel.tsx` |
| F3 — Tipos de notificação | 🟡 | `useInboxNotifications.ts` — existem `timesheet_*`, `reimbursement_*`, `budget_margin_*`, `candidatos`, `projeto`. Faltam `document_available`, `project_started`, `project_health_alert`, `nps_response_received`, `card_assigned`, `system` |
| F4 — Tabs de filtro | ✅ | folders `all`, `unread`, `timesheet`, `reimbursement`, `budget`, `candidates`, `projeto`, `archived` |
| F5 — Marcar como lido | ✅ | `useMarkNotificationRead()`, `useMarkMultipleNotificationsRead()` |
| F6 — Supabase Realtime | ✅ | `Inbox.tsx:84-109` — `channel().on('postgres_changes')` filtrado por `recipient_id` |

**Infra:** tabela `notifications` (migration 20260228235936) + campos `category/priority/action_type/action_url/metadata/is_resolved/is_archived` (20260320170531), RLS, `InboxButton` com badge.

**Falta:** tipos de notificação ausentes; campo `read_at` (hoje só `is_read`); usar `action_url` nos botões de ação.

---

## J4 — Meu Kanban · 🟡 PARCIAL

> Correção ao "Estado Atual": **não é construção do zero** — kanban pessoal e cards de projeto já existem.

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — View agregada de duas fontes | ✅ | `src/services/personalKanbanService.ts` — `personal_kanban_cards`/`personal_kanban_columns` + `project_activity_cards` |
| F2 — Colunas fixas e mapeamento | 🟡 | `src/types/personalKanban.ts` — `PROJECT_TO_PERSONAL_COLUMN` fixo no código. **Falta** tabela configurável `project_column_status_mapping` e aviso "GP não configurou" |
| F3 — Card pessoal vs. projeto | ✅ | `PersonalKanbanColumn.tsx`, `ProjectActivityCardItem.tsx` — badges diferenciados |
| F4 — Movimento bidirecional | 🟡 | **NÃO implementado.** Cards de projeto são read-only (`ProjectCardDetailDialog.tsx`: "Para editar, acesse a atividade do projeto"). Mover card pessoal não atualiza `project_activity_cards` |
| F5 — Criação de tarefa pessoal | ✅ | `useCreatePersonalCard()` — título, descrição, `due_date` |
| F6 — Filtros (Todos/Pessoais/Projetos) | ❌ | sem componente de filtro em `PersonalKanbanBoard.tsx` |

**Infra:** `personal_kanban_columns`/`personal_kanban_cards` (migration 20260427200000), `due_date` + tags (20260427210000), RLS.

**Falta:** tabela `project_column_status_mapping`; movimento bidirecional + reflexo no board do projeto via Realtime; filtros; bloqueio de mover para "Done" sem ser responsável.

---

## J5 — Meus Projetos · ✅ IMPLEMENTADO

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Grid de cards | ✅ | `src/pages/MyProjects.tsx`, hook `useMyProjects()` — badge de fase, cliente, GP, papel, contagem. **"Próximo marco" não renderizado** |
| F2 — Nenhum dado financeiro | ✅ | só horas (`myHoursPerMonth`, planned/actual), sem margem/receita/custo |
| F3 — Projeto em planejamento | ❌ | sem tratamento especial para fase "planning" |
| F4 — Estado vazio | ✅ | `MyProjects.tsx:206-255` |
| F5 — Widget no dashboard | ❌ | não existe widget compacto nem link "Ver todos →" |

**RLS:** `useMyProjectDetail()` valida membership antes de retornar dados.

**Falta:** badge/mensagem de fase de planejamento; widget no dashboard; renderizar próximo marco.

---

## J6 — Navegação e Execução no Projeto · 🟡 PARCIAL

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Aba padrão = Atividades | ✅ | `ProjectDetail.tsx:63-65` `initialTab = canAccessFullProject ? 'overview' : 'activities'`; `MyProjectDetail.tsx:184` idem |
| F2 — Filtro "Apenas meus cards" padrão | ❌ | nenhum toggle/checkbox em `ProjectActivitiesTab` |
| F3 — Abas Custos/Financeiro invisíveis | ✅ | `ProjectDetail.tsx:266-283` dentro de `{canAccessFullProject && ...}`; `MyProjectDetail.tsx` nem inclui essas abas |
| F4 — Visão das abas para consultor | ✅ | `MyProjectDetail.tsx:182-257` — Visão Geral, OKRs, Roadmap, Atividades, Equipe, Stakeholders |
| F5 — Trabalhar no card | ✅ | `ProjectActivitiesTab` — painel, edição, comentário, histórico |
| F6 — Roadmap como contexto (filtro por marco) | ❌ | `MyProjectScheduleTab` existe, sem filtro bidirecional Roadmap↔Kanban |
| F7 — Medir 3 cliques | ❌ | sem métrica |

**Falta:** filtro "apenas meus cards" ativo por padrão; clique em marco filtra Kanban; documentação dos cliques.

---

## J7 — Timesheet · 🟡 PARCIAL

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Lógica de pré-preenchimento | ❌ | **`useTimesheetPrefill()` não existe.** `useMyAllocationData()` calcula planejado/working days, mas sem sugestão automática. `unplannedProjectIds` e `isFutureWeek` existem |
| F2 — Visual "Sugestão" vs. "Lançado" | ❌ | sem distinção visual |
| F3 — Confirmar semana | ✅ | `MyTimesheet.tsx:341-357` `handleSubmitAll()` |
| F4 — Atividades internas | ✅ | `MyTimesheet.tsx:631-707`, `useMyActivityTypes()`, divider "Atividades Internas" |
| F5 — Aviso projeto sem planejamento | ✅ | `MyTimesheet.tsx:590-606` `CircleAlert` + tooltip |
| F6 — Layout mobile (PWA) | ❌ | responsivo, mas sem layout mobile dedicado |

**Falta (núcleo da jornada):** hook de pré-preenchimento; visual sugestão/lançado; layout mobile; tratamento de semana que cruza dois meses.

---

## J8 — Reembolso · ✅ IMPLEMENTADO

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Criar reembolso | ✅ | `ReimbursementFormDialog.tsx` — toggle projeto/admin, itens, upload de recibos |
| F2 — Linha de status visual | 🟡 | `Reimbursements.tsx:32-37` `statusConfig` com badges; **timestamp por etapa não renderizado** |
| F3 — Notificações por etapa | ✅ | tipos `reimbursement_approved/paid/rejected` |
| F4 — Corrigir e reenviar | ✅ | campo `corrected_from_id`, pré-preenchimento da correção |
| F5 — Impacto nos custos do projeto | ❌ | reembolso pago não aparece na aba Custos |
| F6 — Câmera mobile | ❌ | sem `capture="environment"` |

**Infra:** `reimbursement_requests` (com `status`, `corrected_from_id`, `rejection_reason`), `reimbursement_items`, bucket de recibos, RLS por `requested_by`.

**Falta:** integração com custos do projeto; câmera mobile; timestamp visual na linha de status.

---

## J9 — Documentos · ❌ NÃO EXISTE

Confirmado por busca: sem rota `/documentos`; tabela `employee_documents` ausente (0 em 254 migrations); bucket `employee-documents` ausente (existe apenas `employee-photos`); sem tipo `document_available`.

**Falta tudo:** migration `employee_documents`, bucket + RLS, página com tabs (Holerites/Contratos/Fiscais/Outros), hook, viewer PDF + URL assinada, notificação.

---

## J10 — Perfil do Funcionário · ❌ NÃO EXISTE

Confirmado: sem rota `/meu-perfil`; sem página de perfil próprio; **campos de PIX/banco/endereço ausentes** na `employees`; zero menções a "viacep" em `src/`. Existe bucket `employee-photos`, mas sem upload de avatar pelo funcionário. Alteração de senha existe parcialmente via `/change-password`.

**Falta:** colunas de endereço + dados bancários/PIX + `avatar_url`; página `/meu-perfil` com 3 seções; ViaCEP; upload de avatar com crop; alteração de senha integrada.

---

## J11 — Ponto do Trabalho · ❌ NÃO EXISTE

Confirmado: sem rota `/ponto`; tabelas `time_records` e `monthly_timesheet_signatures` ausentes (0 em 254 migrations); sem geolocalização; sem filtro de menu por `tipo_contratacao`.

**Falta tudo:** ambas as tabelas, página `/ponto`, bater ponto com geo/IP, visão mensal, edição com justificativa, assinatura mensal imutável, desbloqueio admin, banco de horas (CLT) e bloqueio de extras (estagiário/menor).

---

## J12 — PWA · ❌ NÃO EXISTE

Confirmado: `vite-plugin-pwa` ausente do `package.json`; sem `manifest.json`; sem ícones (`icon-192`, `icon-512`, `apple-touch-icon`); `vite.config.ts` minimalista; sem `InstallPWABanner`; sem detecção `display-mode: standalone`; sem service worker/Workbox.

**Falta tudo:** instalar plugin, manifest, ícones, config Workbox (NetworkFirst Supabase), meta tags iOS, banner de instalação, detecção standalone para filtrar menu, estratégia offline.

---

# PERSONA GP COMERCIAL

> Toda esta seção opera sobre o módulo **ainda chamado "CRM"/"Lead"** no código — ver J2.

## J1 — Cadastro e Gestão de Clientes · 🟡 PARCIAL

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Upload do Cartão CNPJ | ✅ | `ClientFormDialog.tsx:164` → `supabase.functions.invoke('parse-cnpj-card')` |
| F2 — CEP inteligente (ViaCEP) | ✅ | `src/lib/viaCep.ts` `fetchAddressByCep()`, usado no form |
| F3 — Campos de contato | 🟡 | **Existem em `leads`, não em `clients`** (migration 20260221012624). `clients` tem só dados de empresa/endereço; faltam `contact_name/email/phone/segment/website/notes` |
| F4 — Página de perfil `/clients/:id` | ❌ | só `/clients` (lista); edição via dialog, sem página dedicada com histórico de oportunidades/projetos |

**Falta:** campos de contato em `clients`; página `/clients/:id` com histórico.

---

## J2 — Gestão de Oportunidades (Renomeação) · ❌ NÃO EXISTE

> A jornada exige **zero ocorrências** de "Lead"/"CRM"/"Funil" na interface. A auditoria encontrou nomenclatura antiga em todo o módulo.

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Renomeação completa | ❌ | `CRM.tsx:241` `title="CRM"`; `:242` `description="Funil de vendas"`; `:245` `<Button>Novo Lead</Button>`; sidebar/navbar com "CRM"; rota `/crm` (não `/orcamentos`); entidade ainda `leads`. ~50 ocorrências de "CRM", além de "Lead"/"Funil" |
| F2 — `service_line_id` referenciando catálogo | 🟡 | `src/types/lead.ts:54` `service_line: string \| null` (string hardcoded). Tabela `service_lines` não existe — **bloqueado por Admin J4** |
| F3 — Criar cliente inline | ❌ | sem mini-formulário no `LeadFormDialog.tsx` |
| F4 — Exclusão protegida | 🟡 | delete restrito por RLS; falta confirmação por digitação do nome |

**Falta:** refatoração de nomenclatura em todo o módulo; `service_line_id` UUID; criação inline; UI de confirmação de exclusão.

---

## J3 — Pipeline com Progressão por Etapa · 🟡 PARCIAL

> ⚠️ Bloqueado por Admin J4 (`service_lines`, `service_revenue_models` não existem).

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Progressão com pré-requisitos | 🟡 | `LeadKanbanBoard.tsx:105-126` — valida `!service_line` (Qualificação→Proposta) e `!budget_id` (Proposta→Negociação). **Falta** modal de preenchimento e validação Negociação→Fechado |
| F2 — Card redesenhado | 🟡 | `LeadKanbanCard.tsx` mostra nome/cliente/serviço/valor/budget; **falta** pré-condição pendente em vermelho |
| F3 — Alertas de "Parado" por etapa | ❌ | sem cálculo de dias sem movimento nem badge |
| F4 — Visão por empresa | ❌ | não existe (depende de J1 F4) |

**Falta:** modal de pré-requisitos em cadeia; destaque de pendência; badges de inatividade; agrupamento por empresa.

---

## J4 — Orçamentação por Modelo de Receita · 🟡 PARCIAL

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Modelos alta prioridade | ✅ | `src/types/service.ts` `BillingType = 'fixed_scope' \| 'recurring' \| 'success_fee' \| 'no_revenue'`; wizard `BudgetForm.tsx:54-74` por tipo |
| F2 — Modelos média prioridade | ❌ | Indicação, Equity, Combinações não implementados |
| F3 — Validação de margem em tempo real | 🟡 | `MarginGauge.tsx` existe; **falta** integração com `minimum_margin` do admin (Admin J4) |

**Falta:** 3 modelos de média prioridade; vínculo com margem mínima do admin; fluxo de aprovação quando abaixo do mínimo.

---

## J5 — Comentários e Alertas de Follow-up · 🟡 PARCIAL

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Timeline com 3 tipos | 🟡 | `LeadActivityTimeline.tsx` + `lead_activity_log` (migration 20260314120000). Tipos automáticos no banco; **distinção visual incompleta** |
| F2 — Criar follow-up | ✅ | `useLeadFollowUps.ts` `useCreateFollowUp()`; tabela `lead_follow_ups` (`scheduled_at`, `assigned_to`, `status`, `description`) |
| F3 — Follow-up vencido no card | 🟡 | card recebe `pendingFollowUps`; **falta** indicador vermelho de vencido |
| F4 — Upload de anexos em comentários | ❌ | sem UI de anexo |
| (Polling 60s) | ✅ | `useLeadFollowUps.ts:77` `refetchInterval: 60000` |

**Falta:** distinção visual dos 3 tipos; indicador de follow-up vencido; upload de anexos.

---

## J7 — Arquivamento e Exclusão · 🟡 PARCIAL

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Motivo de perda obrigatório | ✅ | `ArchiveLeadDialog.tsx:19-60` + `ARCHIVE_REASONS` (7 motivos); botão desabilitado sem motivo |
| F2 — Campo concorrente | ❌ | **`competitor_name` não existe** em `LeadDB`; sem input quando motivo = "Concorrência" |
| F3 — Restauração | 🟡 | `leadService.ts:135-147` `unarchiveLead()`, `useUnarchiveLead()`; **falta** diálogo de seleção de etapa e badge "Reativada" 48h |
| F4 — Exclusão definitiva (admin only) | 🟡 | `useDeleteLead()` + botão só p/ admin; **falta** confirmação por digitação do nome |

**Falta:** campo concorrente (também alimenta J11); seleção de etapa na restauração; badge "Reativada"; confirmação por digitação.

---

## J8 — Negócio Fechado · 🟡 PARCIAL

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Seção 1: Definição do projeto | ✅ | `CloseBusinessDialog.tsx:380-475` — nome, GP responsável, datas; validação Zod |
| F2 — Seção 2: Condições financeiras adaptáveis | ✅ | campos por `projectType` (contrato/recorrência/taxa de sucesso); **falta** botão "Distribuir igualmente" |
| F3 — Seção 3: Revisão + Celebração | 🟡 | resumo + criação de projeto (`useCloseBusinessDeal.ts`) + toast; **falta** confetti/celebração e mensagem "🎉 [Cliente] fechado! R$ [valor]" |

**Infra:** cria projeto no portfólio em "planning", copia suppliers/materials/roles, modo no-budget.

**Falta:** animação de celebração; "Distribuir igualmente"; (step de contrato = J9).

---

## J9 — Anexo de Contrato no Fechamento · ❌ NÃO EXISTE

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Step opcional pós-celebração | ❌ | `CloseBusinessDialog` encerra após criar projeto; sem upload |
| F2 — Acesso posterior | ❌ | `projects.contract_url` existe (`types/project.ts:38`), mas **sem UI** |

**Falta:** step de upload (PDF, 10MB, "Pular"), gravação em `contract_url`/`project_files` (`category: 'contract'`), acesso pela aba Arquivos.

---

## J11 — Analytics Comercial · 🟡 PARCIAL

| Fluxo | Status | Evidência |
|-------|--------|-----------|
| F1 — Novas visualizações | 🟡 | `CommercialDashboard.tsx` + `useCommercialDashboard.ts`. Existe `avgSalesCycleDays` **global** (não por etapa); `LossReasonsChart` (sem concorrentes). **Faltam** tempo por etapa, win rate por linha de serviço e por modelo, Top GPs |
| F2 — KPI "Oportunidades que precisam de atenção" | ❌ | sem card de follow-up vencido / parados além do threshold |
| F3 — Filtros novos | 🟡 | existem período, linha de serviço e responsável (admin). **Faltam** Serviço, Modelo de Receita, Etapa atual |

**Já existe:** KPIs de conversão/ticket/ciclo/pipeline/forecast, funil, receita acumulada, donut por estágio, top clientes, motivos de perda, export PDF.

**Falta:** métricas granulares por etapa/serviço/modelo; KPI de atenção clicável; filtros adicionais; concorrente (depende de J7 F2).

---

# Apêndice — Dependências e Bloqueios Cross-Jornada

| Dependência | Afeta | Situação |
|-------------|-------|----------|
| Admin J4 — migration de Catálogo (`service_lines`, `service_revenue_models`) | GP J2 (F2), J3, J4 (margem) | ❌ Não existe — bloqueia progressão e referência de catálogo |
| GP J2 (renomeação) | GP J3, J5, J7, J8, J11 (toda a UI comercial) | ❌ Não feita — módulo inteiro ainda "CRM/Lead" |
| GP J1 F4 (página `/clients/:id`) | GP J3 F4 (visão por empresa) | ❌ Bloqueado |
| GP J7 F2 (campo concorrente) | GP J11 F1 (motivos de perda c/ concorrentes) | ❌ Bloqueado |
| GP J8 (fechamento) | GP J9 (anexo de contrato é step do fechamento) | 🟡 J8 existe, J9 não |
| Func J3 (Inbox) — ✅ pronta | Func J7/J8/J9 (notificações) | ✅ Base disponível |
| Func GP Projetos J6 (board de atividades) | Func J4 (Meu Kanban), J6 (execução) | parcial — `project_activity_cards` existe; mapeamento configurável não |
| Pessoas J6 (holerites) | Func J9 (Documentos) | depende de módulo Pessoas |

---

*Auditoria consolidada a partir de varredura paralela de rotas, páginas, hooks, services, componentes e migrations. Onde a evidência cita `arquivo:linha`, o número reflete a leitura no momento da auditoria e pode variar com edições posteriores.*
