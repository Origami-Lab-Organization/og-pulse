# ADR 0017: Valor da oportunidade — orçamento ou estimativa manual

- Status: aceito
- Data: 2026-08-11
- Decisores: Guilherme Valadares

## Contexto

O valor de uma Oportunidade era resolvido por uma cascata de três degraus em
`src/lib/leadValue.ts`:

```
orçamento.final_total  →  ticket médio do serviço  →  leads.estimated_value  →  0
```

Três problemas decorriam disso:

1. **Ninguém conseguia informar o valor.** `LeadFormDialog` gravava
   `estimated_value: 0` fixo (não havia campo no formulário de criação) e o
   `LeadDetailDialog` só exibia o campo nas etapas `screening` e `qualification`.
   Na prática, o número exibido no card (`~ R$ ...`) era o **ticket médio do
   serviço**, não uma estimativa feita para aquele negócio.
2. **Duas regras de valor coexistiam.** Kanban, `CRMStats` e
   `useCommercialDashboard` usavam a cascata com ticket médio; `CRM.tsx`,
   `PipelineRapidoWidget`, `MeusLeadsWidget`, `RecentLeadsTable`, `ClientDetail`,
   `CloseBusinessDialog` e o PDF usavam o fallback inline
   `budget?.final_total ?? estimated_value`. A mesma oportunidade exibia valores
   diferentes em telas diferentes.
3. **Infraestrutura desproporcional.** O ticket médio custava uma tabela
   (`service_avg_tickets`), quatro funções SQL, um cron trimestral, uma tela
   administrativa em `/comercial/ticket-medio`, dois hooks e um service — para
   produzir um palpite que a pessoa responsável pela oportunidade poderia digitar.

Alternativas consideradas:

- **Manter o ticket médio apenas como cadastro informativo** (fora da cascata de
  valor). Descartada: mantém o custo de manutenção sem entregar a métrica onde
  ela era usada.
- **Fazer backfill do ticket médio para `estimated_value`** antes de derrubar a
  tabela, preservando os números atuais do pipeline. Descartada por decisão do
  time: preferiu-se o corte limpo, para que o pipeline passe a refletir apenas
  valores que alguém de fato estimou.

## Decisão

**1. Regra única de valor da oportunidade:**

```
budget.final_total > 0  →  usa final_total
senão                   →  usa leads.estimated_value
senão                   →  0
```

Implementada em `resolveLeadEstimatedValue(lead)` (`src/lib/leadValue.ts`), agora
com um único parâmetro. **Todos** os consumidores passam a chamar essa função —
nenhum fallback inline `budget?.final_total ?? estimated_value` permanece no
código.

**2. O valor estimado é editável enquanto não houver orçamento.** O campo
"Valor Estimado" aparece no `LeadDetailDialog` sempre que `!lead.budget_id` e o
serviço gera receita — em **qualquer** etapa do pipeline, não mais só em
Prospecção/Qualificação. Também foi adicionado ao `LeadFormDialog` (criação),
substituindo o `estimated_value: 0` fixo. Ambos usam o `CurrencyInput` do design
system, que respeita o truncamento de ADR-0011.

O campo segue o modo de edição do dialog (`⋮ → Editar`), como os campos vizinhos.
Quando existe orçamento vinculado, o campo dá lugar ao resumo do orçamento —
comportamento inalterado.

**3. O gate de orçamento permanece onde estava:** obrigatório apenas na transição
**Proposta Enviada → Negociação** (`canAdvanceFrom` em `LeadDetailDialog` e o
drag & drop em `LeadKanbanBoard`). Propor sem orçamento continua permitido, com o
valor estimado valendo até o orçamento existir.

**4. O subsistema de ticket médio foi removido por completo**, frontend e banco.

**5. O KPI "Ticket Médio (Fechados)" do Dashboard Comercial e do PDF permanece** —
é uma média calculada em memória sobre os negócios fechados, independente da
tabela removida, e passa a usar a nova regra de valor automaticamente.

## Consequencias

- **Beneficios**: fonte única de verdade para o valor da oportunidade; números
  consistentes entre Kanban, listas, dashboards e PDF; o pipeline passa a refletir
  estimativas reais; menos superfície de manutenção (uma tabela, quatro funções,
  um cron, uma tela e três módulos a menos).
- **Custos**: o time comercial precisa informar o valor estimado — antes ele vinha
  "de graça" do ticket médio. Histórico de médias e overrides manuais descartados.
- **Riscos**: **queda imediata e acentuada** em `activePipeline`, totais de coluna
  do Kanban, `pipelineByStage`, `forecast` e `topClients`, porque a base atual tem
  `estimated_value = 0` em quase toda oportunidade aberta (a criação sempre gravou
  zero). A queda é esperada, não é bug, e se recompõe conforme o time preenche os
  valores. **Comunicar ao time antes do deploy.**
- **Como reverter**: o frontend volta por revert do commit. O banco **não** —
  `DROP TABLE public.service_avg_tickets` descarta os dados. Restaurar exigiria
  backup anterior à migration mais um novo recálculo via
  `_recalc_service_avg_tickets_core`.

## Evidencias

- Migration: `supabase/migrations/20260811120000_drop_service_avg_tickets.sql`
- Regra: `src/lib/leadValue.ts`
- Campos: `src/components/crm/LeadDetailDialog.tsx`, `src/components/crm/LeadFormDialog.tsx`
- Gate inalterado: `src/components/crm/LeadKanbanBoard.tsx`, `canAdvanceFrom` em `LeadDetailDialog.tsx`
- Migrations substituídas: `20260806130000_service_line_avg_tickets.sql`, `20260806140000_service_avg_tickets_by_service.sql`
- Dívida encerrada por remoção: TD-0011 em `.harness/tech-debt/log.md`
- Jornada: `jornadas/gp-comercial.md` (J3 — Pipeline com Progressão por Etapa)
- Regra de moeda aplicada nos inputs: ADR-0011

## Risco conhecido, fora deste diff

O gate de orçamento é **apenas frontend**: `updateLeadStage`
(`src/services/leadService.ts`) grava `crm_stage` sem validar, e não há
CHECK/trigger/RLS no banco impedindo `negotiation`/`closed` sem `budget_id`.
Registrado como dívida técnica.
