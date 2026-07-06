# GP-J3 — Pipeline com Progressão por Etapa

> Jornada: GP Comercial J3 · Estado auditado: 🟡 PARCIAL (~40%)
> Dependências externas: F1 (Qualificação→Proposta exige Linha de Serviço do catálogo) DEPENDE de Admin J4 (Tsuru) — bloqueada até a migration. Badges de "Parado", validação por `budget_id` e visão por empresa NÃO dependem do catálogo

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Kanban de oportunidades com colunas e drag-and-drop.
- **F1 (parcial):** `LeadKanbanBoard.tsx:105-126` valida `!service_line` (Qualificação→Proposta) e `!budget_id` (Proposta→Negociação).
- **F2 (parcial):** `LeadKanbanCard.tsx` mostra nome/cliente/serviço/valor/budget.

**❌ Pendente:**
- **F1 — Modal de preenchimento em cadeia** e validação Negociação→Fechado/Perdido (decisão/motivo de perda).
- **F2 — Card redesenhado:** falta pré-condição pendente em destaque vermelho; follow-up (verde futuro / vermelho vencido); badge de parado.
- **F3 — Alertas de "Parado" por etapa:** sem cálculo de dias sem movimento nem badge.
- **F4 — Visão por empresa:** não existe (depende da página `/clients/:id` de GP-J1 F4).

## História de Usuário

**Como** GP Comercial,
**quero** avançar oportunidades com pré-requisitos obrigatórios por etapa, ver num relance o que está pendente/parado e o pipeline completo de uma empresa,
**para que** nenhum card chegue em "Negociação" sem orçamento ou Linha de Serviço e eu não perca negócios parados por falta de follow-up.

## Contexto

Sprint 2. Depende da renomeação (GP-J2) já estar feita, pois opera sobre o mesmo Kanban. **Atenção crítica:** a transição **Qualificação → Proposta exige "Linha de Serviço e Serviço definidos"**, que vêm do catálogo do Admin J4 (`service_lines`/`service_revenue_models`) — **essa parte está bloqueada pela equipe Tsuru até a migration**. As demais regras (validação por `budget_id`, decisão de fechamento/motivo de perda, badges de "Parado" por dias, indicador de follow-up vencido) **não dependem do catálogo** e podem ser feitas antes. A visão por empresa (F4) consome a página `/clients/:id` de GP-J1.

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro — partes que NÃO dependem do catálogo)

**CA-01 — Modal de pré-requisitos para `budget_id` (F1) — NÃO depende de Admin J4**
- Ao mover Proposta → Negociação sem `budget_id`: abre modal com os campos faltantes; GP preenche e confirma sem voltar ao card.
- Se o GP cancelar/abandonar o modal, o card retorna à coluna de origem.

**CA-02 — Validação Negociação → Fechado/Perdido (F1) — NÃO depende de Admin J4**
- Avançar para Fechado exige decisão de fechamento (encaminha ao fluxo de Negócio Fechado — GP-J8).
- Avançar para Perdido exige motivo de perda (encaminha ao fluxo de Arquivamento — GP-J7).

**CA-03 — Card comunica pré-condição pendente (F2) — NÃO depende de Admin J4**
- Card exibe em **destaque vermelho** a pré-condição pendente da próxima transição (ex.: "Sem orçamento vinculado").
- Card mostra nome + cliente + valor estimado (reaproveitar o existente).

**CA-04 — Indicador de follow-up no card (F2) — NÃO depende de Admin J4**
- Próximo follow-up futuro: indicador verde; follow-up vencido (`scheduled_at < now()` e `status != 'done'`): indicador vermelho.
- Coerente com o polling de 60s já existente (`useLeadFollowUps`) — sem novo mecanismo. (Alinhar com GP-J5.)

**CA-05 — Badge "Parado" por etapa (F3) — NÃO depende de Admin J4**
- Calcular dias sem movimento/comentário e exibir badge conforme limites por etapa:
  - Qualificação: 14 dias → "Parado"
  - Proposta: 7 dias → "Parado"
  - Negociação: 3 dias → "Atenção"
- O badge **apenas sinaliza** (amarelo), não bloqueia a movimentação.

**CA-06 — Visão por empresa (F4) — NÃO depende de Admin J4 (depende de GP-J1 F4)**
- Na página `/clients/:id` (GP-J1), exibir todas as oportunidades do cliente agrupadas por etapa, com status visual.
- Respeitar `tenant_id`/RLS — só oportunidades do tenant do usuário.

### Parte B — Bloqueada pela Tsuru (depois)

**CA-07 — Pré-requisito Qualificação → Proposta: Linha de Serviço e Serviço (F1) — DEPENDE de Admin J4 (Tsuru) — BLOQUEADA até a migration**
- Mover Qualificação → Proposta exige "Linha de Serviço e Serviço definidos", selecionados a partir do catálogo (`service_lines`/`service_revenue_models`).
- Modal de pré-requisitos inclui o seletor de Linha de Serviço/Serviço do catálogo.
- Encadeamento em cadeia (Triagem → Negociação direto pede todos os pré-requisitos das etapas intermediárias) só fica completo quando esta CA for liberada.
- **Bloqueada até a equipe Tsuru confirmar a migration do Catálogo de Serviços (Admin J4).**

## Fora do Escopo

- Criação/edição do orçamento em si (wizard de orçamentação é GP J4 — task separada).
- Distinção visual completa da timeline e upload de anexos (GP-J5).
- Configuração dos limites de inatividade por etapa via tela de admin (usar limites fixos da CA-05 por ora).

## Notas Técnicas

- Board: `src/components/crm/LeadKanbanBoard.tsx`; card: `src/components/crm/LeadKanbanCard.tsx`.
- Validações já existentes em `LeadKanbanBoard.tsx:105-126` — estender, não reescrever do zero.
- "Vencido" e "Parado" como helpers reutilizáveis; "Parado" usa último movimento/comentário (`lead_activity_log`, migration 20260314120000).
- O catálogo (`service_lines`, `service_revenue_models`) **não existe no banco** hoje — a CA-07 deve ficar atrás de guard/feature-flag até a migration da Tsuru; até lá, manter a validação de `service_line` apenas como string sem vincular ao catálogo (ou desabilitar a transição, conforme decisão de produto).
- Visão por empresa (CA-06) reaproveita o carregamento da página `/clients/:id` (GP-J1), filtrando por `client_id` + `tenant_id`.

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Mover Proposta → Negociação sem orçamento | Modal pede `budget_id`; preenche e confirma sem voltar ao card |
| Cancelar modal de pré-requisitos | Card volta à coluna de origem |
| Mover Negociação → Fechado | Encaminha ao fluxo de Negócio Fechado (decisão obrigatória) |
| Mover Negociação → Perdido | Exige motivo de perda (fluxo de arquivamento) |
| Card com pré-condição pendente | Pendência em destaque vermelho |
| Follow-up vencido | Indicador vermelho no card; futuro → verde |
| Oportunidade parada além do limite da etapa | Badge "Parado"/"Atenção" (não bloqueia) |
| Visão por empresa em `/clients/:id` | Oportunidades do cliente agrupadas por etapa |
| Mover Qualificação → Proposta (Linha de Serviço) | **Bloqueado** até migration da Tsuru (Admin J4) |
| Pipeline com 30+ cards numa coluna | Scroll vertical sem perda de performance |
