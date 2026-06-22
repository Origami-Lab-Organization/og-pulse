# Tasks — Quick Wins (jornadas parciais)

Tasks geradas a partir da [AUDITORIA-ESTADO-ATUAL.md](../AUDITORIA-ESTADO-ATUAL.md), focadas nos gaps de jornadas 🟡 PARCIAL com maior valor por hora no Hackathon.

| Task | Jornada | Gap | Esforço |
|------|---------|-----|---------|
| FUNC-J7-PREFILL | Func J7 | Pré-preenchimento do timesheet (F1+F2) | M |
| FUNC-J6-MYCARDS | Func J6 | Filtro "Apenas meus cards" padrão (F2) | P |
| FUNC-J4-BIDIR | Func J4 | Movimento bidirecional Meu Kanban ↔ Projeto (F4) | M |
| GP-J8-CELEBRATE | GP J8 | Celebração de fechamento + "Distribuir igualmente" (F2/F3) | P |
| GP-J5-FOLLOWUP | GP J5 | Follow-up vencido no card + distinção visual (F1/F3) | P |
| GP-J7-COMPETITOR | GP J7 | Campo concorrente no arquivamento (F2) | P |
| GP-J1-CONTACT | GP J1 | Campos de contato na tabela `clients` (F3) | P |

> Os contratos abaixo são de frontend + Supabase. Onde houver dado sensível, respeitar `tenant_id` e RLS (boundaries do projeto).

---

# FUNC-J7-PREFILL — Pré-preenchimento automático do Timesheet

## História de Usuário

**Como** Consultor que lança horas toda semana,
**quero** abrir o timesheet com as células já pré-preenchidas a partir da minha alocação mensal,
**para que** eu confirme e finalize em menos de 2 minutos sem reconstruir o que fiz do zero.

## Contexto

Núcleo da jornada J7. Hoje o lançamento semanal funciona (`MyTimesheet.tsx`), e `useMyAllocationData` já calcula planejado vs. realizado e dias úteis com feriados — mas o consultor digita tudo manualmente. O pré-preenchimento é uma **sugestão não destrutiva**: nunca sobrescreve lançamento já existente. É a maior alavanca de UX da persona Funcionário.

## Critérios de Aceite

**CA-01 — Cálculo da sugestão (Opção C)**
- `horas_por_dia = planned_hours_for_month ÷ total_working_days_in_month`
- Sugestão de um dia = `horas_por_dia` se for dia útil (não fim de semana, não feriado); `0` caso contrário
- Feriados vêm de `useHolidays` / `countWorkingDays` (já existente em `useMyAllocationData`)

**CA-02 — Hook `useTimesheetPrefill`**
- Assinatura: `useTimesheetPrefill(employeeId, weekDays, projects)` → `Record<projectId, Record<dateISO, hours>>`
- Reaproveita o cálculo de dias úteis de `useMyAllocationData` (não reimplementar)

**CA-03 — Sugestão só preenche células vazias**
- A sugestão aparece **apenas** em células sem lançamento salvo
- Célula com lançamento existente nunca é substituída pela sugestão

**CA-04 — Distinção visual Sugestão vs. Lançado**
- Célula em estado de sugestão: valor em cor mais clara + badge/indicador "Sugestão"
- Ao confirmar (CA-05): a célula passa para o estado visual "Lançado"

**CA-05 — Confirmar**
- Botão "Confirmar semana" (já existe, `handleSubmitAll`) persiste as sugestões como lançamentos reais via o fluxo de submit atual
- O consultor pode editar qualquer célula antes de confirmar

**CA-06 — Sem planejamento não quebra**
- Projeto sem `project_member_months` no mês (`unplannedProjectIds`): sem sugestão, mantém o aviso `CircleAlert` já existente
- `total_working_days_in_month = 0` ou `planned = 0` → sugestão `0`, sem divisão por zero

**CA-07 — Semana futura**
- Em `isFutureWeek` os campos permanecem bloqueados (comportamento atual preservado); a sugestão não habilita lançamento futuro

## Fora do Escopo

- Layout mobile dedicado do timesheet (J7 F6 — task separada)
- Pré-preenchimento de atividades internas/ausências (J7 F4 — permanece sem sugestão)
- Tratamento de semana que cruza dois meses (cenário-limite — avaliar em task própria)

## Notas Técnicas

- Arquivo alvo: `src/pages/MyTimesheet.tsx`; hooks: `useMyAllocationData`, `useHolidays`
- Criar `src/hooks/useTimesheetPrefill.ts`
- A sugestão é estado de UI (não persistir até "Confirmar")
- Reutilizar `unplannedProjectIds` e `isFutureWeek` já presentes na página

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Semana sem lançamentos, projeto com alocação | Células de dias úteis pré-preenchidas com `horas_por_dia`; fds/feriado em 0 |
| Célula já lançada | Sugestão não aparece nessa célula |
| Editar sugestão e confirmar | Valores salvos como lançamento; visual muda para "Lançado" |
| Mês de feriado | Distribuição usa apenas dias úteis (feriado fica 0) |
| Projeto sem planejamento | Sem sugestão + `CircleAlert` exibido |
| `planned = 0` / 0 dias úteis | Sugestão 0, sem erro de divisão |
| Semana futura | Campos bloqueados, sem sugestão habilitando lançamento |

---

# FUNC-J6-MYCARDS — Filtro "Apenas meus cards" ativo por padrão

## História de Usuário

**Como** Consultor que abre um projeto para trabalhar,
**quero** ver por padrão só as atividades atribuídas a mim,
**para que** eu chegue no que preciso fazer hoje sem filtrar o board inteiro.

## Contexto

Jornada J6 F2. A aba Atividades já é a aba padrão do consultor (`ProjectDetail.tsx` / `MyProjectDetail.tsx`), mas o board mostra todos os cards. A meta da jornada é "máximo 3 cliques até o primeiro card". Falta o toggle "Apenas meus cards" ligado por padrão para o consultor.

## Critérios de Aceite

**CA-01 — Padrão por papel**
- Para consultor (`!isManager` / `isEmployeeOnly`): filtro "Apenas meus cards" **ativo por padrão** ao abrir a aba Atividades
- Para GP/manager: filtro inicia desligado (vê o board completo)

**CA-02 — Toggle "Ver todos"**
- Controle visível que alterna entre "Apenas meus cards" e "Ver todos"
- O estado escolhido persiste durante a navegação na aba (não precisa persistir entre sessões)

**CA-03 — Critério de "meu card"**
- Card é "meu" quando o consultor é o responsável/assignee da atividade (`project_activity_cards` → assignee = employee logado)

**CA-04 — Estado vazio**
- Filtro ativo e nenhum card atribuído: estado vazio orientativo ("Você não tem atividades atribuídas neste projeto. Use 'Ver todos' para ver o board completo.")

## Fora do Escopo

- Filtro por marco do Roadmap (J6 F6 — task separada)
- Permissões de mover card (já tratadas em outra parte)

## Notas Técnicas

- Componente alvo: `ProjectActivitiesTab` (usado por `ProjectDetail.tsx` e `MyProjectDetail.tsx`)
- Derivar `isManager`/`isEmployeeOnly` do mesmo sinal já usado para `defaultTab`
- Filtro é client-side sobre os cards já carregados

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Consultor abre aba Atividades | Filtro "Apenas meus cards" ativo; vê só os seus |
| Consultor clica "Ver todos" | Board completo aparece |
| GP abre aba Atividades | Filtro desligado por padrão |
| Consultor sem cards atribuídos | Estado vazio orientativo |

---

# FUNC-J4-BIDIR — Movimento bidirecional Meu Kanban ↔ Board do Projeto

## História de Usuário

**Como** Consultor,
**quero** que ao mover um card de projeto no Meu Kanban o board do projeto reflita a mudança,
**para que** eu gerencie tudo em um lugar só sem o board do GP ficar desatualizado.

## Contexto

Jornada J4 F4. Hoje cards de projeto no Meu Kanban são **somente leitura** (`ProjectCardDetailDialog`: "Para editar, acesse a atividade do projeto"). O mapeamento coluna-do-projeto → status pessoal existe fixo no código (`PROJECT_TO_PERSONAL_COLUMN`), mas falta o caminho de volta e a tabela configurável por projeto.

## Critérios de Aceite

**CA-01 — Tabela de mapeamento configurável**
- Criar `project_column_status_mapping`: `id`, `tenant_id`, `project_id`, `column_id`, `personal_status` (`todo`/`doing`/`done`)
- Migration versionada + RLS por `tenant_id`/membership

**CA-02 — Mover card de projeto no Meu Kanban**
- Ao arrastar card de projeto para outra coluna pessoal:
  1. identifica o `personal_status` da coluna de destino
  2. resolve a coluna do board do projeto correspondente via `project_column_status_mapping`
  3. atualiza `project_activity_cards.column_id`
- A mudança aparece para o GP no board do projeto (via Realtime — ver CA-04)

**CA-03 — Mapeamento ausente**
- Projeto sem mapeamento configurado: card de projeto exibido com aviso "O GP do projeto [Nome] ainda não configurou o mapeamento" e movimento bloqueado para esse projeto (não quebra o board)

**CA-04 — Realtime nas duas direções**
- GP move card no board do projeto → Meu Kanban do consultor atualiza sem reload
- Consultor move no Meu Kanban → board do projeto atualiza sem reload

**CA-05 — Permissão de "Done"**
- Mover card para coluna mapeada como `done` sem ser o responsável: bloqueado com mensagem clara; card volta à coluna de origem

## Fora do Escopo

- UI de configuração do mapeamento pelo GP (faz parte de GP Projetos J2 — coordenar; aqui assumir os dados da tabela)
- Filtros do Meu Kanban (J4 F6 — task separada)

## Notas Técnicas

- Service: `src/services/personalKanbanService.ts`; board: `src/components/my-kanban/PersonalKanbanBoard.tsx`
- Cards de projeto: `project_activity_cards`; usar canal Realtime `postgres_changes` filtrado por projeto/employee
- Não duplicar a lógica de mapeamento: centralizar em helper que lê `project_column_status_mapping` com fallback no `PROJECT_TO_PERSONAL_COLUMN`

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Mover card de projeto p/ "Fazendo" no Meu Kanban | `project_activity_cards.column_id` atualizado p/ coluna mapeada |
| GP move card no board | Meu Kanban reflete via Realtime |
| Projeto sem mapeamento | Aviso exibido, movimento bloqueado, board não quebra |
| Mover p/ "Done" sem ser responsável | Bloqueado com mensagem, card volta à origem |
| Card pessoal | Continua com controle total (sem efeito no projeto) |

---

# GP-J8-CELEBRATE — Celebração de fechamento + "Distribuir igualmente"

## História de Usuário

**Como** GP Comercial fechando um negócio,
**quero** uma celebração visual ao confirmar e um botão para distribuir as parcelas igualmente,
**para que** o fechamento seja um momento memorável e a montagem do cronograma seja rápida.

## Contexto

Jornada J8 F2/F3. O fluxo de fechamento já funciona (`CloseBusinessDialog` + `useCloseBusinessDeal` cria o projeto no portfólio). Faltam dois detalhes de UX: o "Distribuir igualmente" na tabela de parcelas (modelo Contrato) e a celebração na confirmação.

## Critérios de Aceite

**CA-01 — Distribuir igualmente (modelo Contrato)**
- Na tabela de parcelas, botão "Distribuir igualmente" divide o valor total pelo número de parcelas
- Trata sobra de centavos (último valor absorve o arredondamento; soma das parcelas = total exato)
- Disponível apenas para modelos com parcelas (escopo fixo); ausente em Equity/sem cronograma

**CA-02 — Celebração na confirmação**
- Ao confirmar com sucesso (`useCloseBusinessDeal` retorna ok): animação de celebração (confetti) + mensagem "🎉 [Nome do Cliente] fechado! R$ [valor total]"
- A celebração não bloqueia: o projeto já foi criado; é feedback pós-sucesso

**CA-03 — Falha não celebra**
- Se `useCloseBusinessDeal` falhar: sem animação; mensagem de erro clara; dados do formulário preservados

**CA-04 — Modelo sem parcelas**
- Equity/sem cronograma: seção financeira adapta sem tabela de parcelas; celebração ainda ocorre no sucesso

## Fora do Escopo

- Step de anexo de contrato pós-celebração (GP-J9 — task separada)
- Som/áudio de celebração

## Notas Técnicas

- Componente: `src/components/crm/CloseBusinessDialog.tsx`; hook: `src/hooks/useCloseBusinessDeal.ts`
- Confetti: avaliar `canvas-confetti` (lib leve) — registrar a escolha (ADR) se adicionar dependência nova (boundary: não trocar/incluir lib sem decisão)
- Valor total já calculado no resumo do dialog — reutilizar

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Contrato 6 parcelas + "Distribuir igualmente" | Parcelas iguais, soma = total (centavos no último) |
| Confirmar com sucesso | Confetti + "🎉 [Cliente] fechado! R$ [valor]"; projeto em "Planejamento" |
| Erro no fechamento | Sem celebração; erro claro; formulário preservado |
| Modelo Equity | Sem tabela de parcelas; celebração no sucesso |

---

# GP-J5-FOLLOWUP — Follow-up vencido no card + distinção visual da timeline

## História de Usuário

**Como** GP Comercial,
**quero** ver no card do pipeline quando um follow-up está vencido e distinguir atividades automáticas de comentários,
**para que** eu identifique compromissos atrasados sem abrir cada oportunidade.

## Contexto

Jornada J5 F1/F3. `useLeadFollowUps` (com polling de 60s) e `lead_follow_ups` já existem; o card já recebe `pendingFollowUps`. Faltam o indicador visual de vencido no card e a distinção clara dos tipos de entrada na timeline.

## Critérios de Aceite

**CA-01 — Indicador de follow-up vencido no card**
- Card do Kanban exibe indicador vermelho quando há follow-up com `scheduled_at < now()` e `status != 'done'`
- Próximo follow-up futuro: indicador neutro/verde

**CA-02 — Distinção visual na timeline (3 tipos)**
- Atividade automática (mudança de etapa, orçamento criado): ícone cinza, texto compacto
- Comentário manual: avatar colorido + texto completo
- Follow-up: ícone de calendário + badge de status (pendente/concluído/vencido)

**CA-03 — Coerência com o polling existente**
- O cálculo de "vencido" reage ao polling de 60s já configurado (`refetchInterval: 60000`) — sem novo mecanismo

## Fora do Escopo

- Upload de anexos em comentários (J5 F4 — task separada)
- Migração para Realtime (a jornada pede para documentar se 60s basta; manter polling)

## Notas Técnicas

- Componentes: `src/components/crm/LeadKanbanCard.tsx`, `src/components/crm/LeadActivityTimeline.tsx`
- Tipos de atividade automática em `lead_activity_log` (migration 20260314120000)
- "Vencido" = `scheduled_at < now() && status !== 'done'` (helper reutilizável)

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Oportunidade com follow-up vencido | Card com indicador vermelho |
| Follow-up futuro | Indicador neutro/verde |
| Timeline com etapa + comentário + follow-up | 3 estilos visuais distintos |
| Follow-up concluído | Badge "concluído", sem alerta de vencido |

---

# GP-J7-COMPETITOR — Campo de concorrente no arquivamento

## História de Usuário

**Como** GP Comercial arquivando uma oportunidade perdida por concorrência,
**quero** registrar qual concorrente ganhou,
**para que** o Analytics Comercial mostre padrões de perda por concorrente.

## Contexto

Jornada J7 F2. O arquivamento com motivo obrigatório já existe (`ArchiveLeadDialog` + `ARCHIVE_REASONS`), mas não há campo de concorrente. Esse dado alimenta o J11 (Analytics — motivos de perda com concorrentes), hoje impossível por falta do campo.

## Critérios de Aceite

**CA-01 — Campo no banco**
- Adicionar `competitor_name TEXT NULL` na tabela de oportunidades (`leads`), via migration versionada

**CA-02 — Campo condicional na UI**
- No `ArchiveLeadDialog`, input "Concorrente" aparece **somente** quando o motivo = "Concorrência" (`competitor`)
- Quando visível, o campo é obrigatório para confirmar o arquivamento

**CA-03 — Persistência**
- `archiveLead()` / service grava `competitor_name` junto com o motivo
- Motivo ≠ "Concorrência": `competitor_name` salvo como `null`

**CA-04 — Disponível para Analytics**
- O valor fica acessível para uso em J11 (não exibir gráfico agora — apenas garantir o dado)

## Fora do Escopo

- Visualização "concorrentes mais citados" no dashboard (J11 — task separada)
- Normalização de nomes duplicados ("Totvs"/"TOTVS") — cenário-limite, avaliar depois

## Notas Técnicas

- Tipos: `src/types/lead.ts` (`LeadDB`); dialog: `src/components/crm/ArchiveLeadDialog.tsx`; service: `src/services/leadService.ts`
- `ARCHIVE_REASONS` já tem `competitor`; usar esse valor como gatilho da condicional

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Motivo = Concorrência | Campo "Concorrente" aparece e é obrigatório |
| Confirmar sem concorrente (motivo Concorrência) | Botão bloqueado |
| Motivo ≠ Concorrência | Campo oculto; `competitor_name = null` |
| Arquivar com concorrente preenchido | `competitor_name` salvo na oportunidade |

---

# GP-J1-CONTACT — Campos de contato na tabela `clients`

## História de Usuário

**Como** GP Comercial,
**quero** registrar o contato principal e o segmento direto no cadastro do cliente,
**para que** eu encontre com quem falar sem depender de campos que só existem na oportunidade.

## Contexto

Jornada J1 F3. A auditoria revelou que `contact_name/email/phone/segment` existem em `leads`, **não em `clients`**. Para a página de perfil do cliente (J1 F4) e para o cadastro completo em < 2 min, esses campos precisam morar no cliente.

## Critérios de Aceite

**CA-01 — Campos no banco**
- Adicionar em `clients` via migration versionada: `contact_name`, `contact_email`, `contact_phone`, `segment`, `website`, `notes` (todos `NULL`)

**CA-02 — Formulário de cliente**
- `ClientFormDialog` exibe e persiste os novos campos
- `segment` pode ser auto-preenchido pelo upload do Cartão CNPJ (reaproveita `parse-cnpj-card` — segmento de atuação) quando disponível

**CA-03 — Validações**
- `contact_email`: formato de e-mail válido quando preenchido
- `contact_phone`: máscara de telefone; aceita vazio
- Nenhum campo novo é obrigatório (cadastro não bloqueia por ausência)

**CA-04 — Exibição**
- Os campos aparecem na visualização do cliente (lista/dialog atual); base pronta para a página `/clients/:id` (J1 F4, task separada)

## Fora do Escopo

- Página de perfil `/clients/:id` com histórico (J1 F4 — task separada)
- Suporte a múltiplos contatos por cliente (cenário-limite — avaliar depois)

## Notas Técnicas

- Tabela `clients`; form `src/components/clients/ClientFormDialog.tsx`; service `src/services/clientService.ts`; hook `useClients`
- ViaCEP e upload CNPJ já integrados — não reimplementar; apenas mapear `segment` do retorno do CNPJ

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Salvar cliente com contato + segmento | Campos persistidos em `clients` |
| Upload de Cartão CNPJ | `segment` auto-preenchido quando o parser retorna |
| E-mail de contato inválido | Validação inline, não salva |
| Campos de contato vazios | Cliente salvo normalmente |
