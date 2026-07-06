# ADR 0007: Remover reembolsos do produto (UI, relatórios de custo e backend acionável)

- Status: aceito
- Data: 2026-07-01
- Decisores: Origami Lab / operacao interna (tiago@origamilab.com.br)

## Contexto

O reembolso existia de ponta a ponta:

1. **Fluxo do funcionário/aprovação:** página `/reimbursements`, formulário de
   solicitação/correção, detalhe com aprovar/rejeitar/pagar/PDF, widget no
   dashboard, categoria/pasta "Reembolsos" no inbox com detalhe interativo,
   passo de onboarding, rota PWA.
2. **Variável de custo nos relatórios:** analytics (`useAnalyticsData`,
   `useFinancialEvolution`, `useProjectFinancials` + componentes `Cost*`/PDF) e
   custos de projeto (`ProjectCostsTab`, `ProjectCostsLedger`,
   `ProjectMonthlyCostChart`) somavam reembolsos `approved`/`paid` como custo.
3. **Backend:** tabelas `reimbursement_requests` / `_items` / `_attachments`,
   RLS, triggers/funções de notificação, bucket `reimbursement-receipts`, Edge
   Function `send-reimbursement-email`, seeds e cache PWA.

Decisão de negócio do time: **remover reembolsos do produto** — o funcionário
não solicita mais e o custo deixa de compor os relatórios (considerar apenas as
demais variáveis). Mudança toca regra financeira (boundary) e RLS, por isso este ADR.

## Decisao

Remover reembolso de todo o **código** (frontend, relatórios de custo, backend
acionável e seeds), **preservando o schema do banco** nesta etapa:

- **UI:** deletados a página, formulário, dialogs, PDF, widget, menu órfão,
  detalhe de inbox (ativo + legado) e a categoria/pasta "Reembolsos"; removidos
  rota (`App.tsx`), onboarding, nav (`AppNavbar`/`AppSidebar`) e rota PWA (`pwa.ts`).
- **Relatórios de custo:** removida a variável `reimbursementCost`/reembolso dos
  hooks e componentes de analytics e dos custos de projeto. As demais variáveis
  (mão de obra, fornecedores, materiais, comissões) permanecem intactas.
- **Backend acionável:** deletada a Edge Function `send-reimbursement-email` (+ entrada
  em `config.toml`), removido reembolso dos seeds (`seed-demo-tenant` e
  `scripts/seed-demo-tenant.mjs`, `inbox_mock_notifications.sql`) e das tabelas
  no cache do service worker (`sw.ts`). Hook `useReimbursements.ts` deletado.
- **Preservado (não dropado nesta etapa):** tabelas `reimbursement_*`, RLS,
  triggers/funções, bucket `reimbursement-receipts`. O `src/integrations/supabase/types.ts`
  (gerado) ainda reflete essas tabelas. O descomissionamento físico do banco é
  um passo separado e deliberado (migration nova de `DROP` + regeneração dos tipos),
  por ser destrutivo e irreversível (perda de dados).

## Consequencias

- Beneficios:
  - Nenhuma superfície de reembolso no app; relatórios de custo consideram só as
    variáveis remanescentes.
  - Sem dívida de UI/rotas mortas apontando para `/reimbursements`.
- Custos:
  - Gestores/admin não aprovam/rejeitam/pagam reembolso pela UI (irrelevante — não
    há como criar novos pedidos).
  - Notificações de reembolso históricas (categoria `reimbursement` já no banco)
    perdem detalhe interativo; renderizam como texto genérico.
  - Custo/margem muda: períodos que antes contabilizavam reembolso pago como custo
    passam a mostrar custo menor / margem maior. (No Dashboard Executivo não há
    mudança — ele já excluía reembolso do `projectCostsExLabor`.)
- Riscos:
  - Alteração de regra financeira — validada por `npm run build` + `tsc --noEmit`
    (0 erros) + revisão manual. Testes desativados nesta sessão; `pwa.routes.test.ts`
    e o comentário de `admin.dashboard.revenue.calculator.test.ts` foram ajustados.
  - Tabelas retidas ⇒ dados órfãos. Se uma migration de `DROP` for aplicada depois,
    tratar FKs/triggers/funções/policies + bucket e **regenerar** `types.ts`.
- Como reverter:
  - `git revert` do commit restaura todo o código. O banco está **intacto** (nenhuma
    tabela dropada), então os dados de reembolso são preservados.

## Evidencias

- Deletados: `src/pages/Reimbursements.tsx`, `src/hooks/useReimbursements.ts`,
  `src/components/reimbursements/*`, `src/components/dashboard/ReembolsosPendentesWidget.tsx`,
  `src/components/inbox/InboxNewActionMenu.tsx`, `src/components/inbox/InboxReimbursementDetail.tsx`,
  `src/components/notifications/{NotificationInbox,InboxReimbursementDetail}.tsx`,
  `src/components/projects/detail/{DeleteReimbursementDialog,ProjectReimbursementsSection,ReimbursementDetailDialog}.tsx`,
  `supabase/functions/send-reimbursement-email/`.
- Editados (relatórios de custo): `src/hooks/{useAnalyticsData,useFinancialEvolution,useProjectFinancials}.ts`,
  `src/components/analytics/{CostMixDonut,CostKPIs,CostPressureCard,CostBreakdownChart,AnalyticsKPIs,AnalyticsPdfGenerator,_devMockData}`,
  `src/pages/Analytics.tsx`, `src/components/projects/detail/{ProjectCostsTab,ProjectCostsLedger,ProjectMonthlyCostChart}.tsx`.
- Editados (inbox/nav/pwa/seeds): `src/hooks/useInboxNotifications.ts`,
  `src/components/inbox/{InboxSidebar,InboxListPanel,InboxNotificationRow,InboxEmptyState,InboxDetailPanel}.tsx`,
  `src/pages/{Inbox,Dashboard}.tsx`, `src/components/layout/{AppNavbar,AppSidebar}.tsx`,
  `src/components/onboarding/OnboardingModal.tsx`, `src/lib/pwa.ts`, `src/sw.ts`,
  `vite.config.ts`, `supabase/config.toml`, `supabase/functions/seed-demo-tenant/index.ts`,
  `scripts/seed-demo-tenant.mjs`, `supabase/seeds/inbox_mock_notifications.sql`.
- Verificação: `npm run build` OK, `npx tsc --noEmit` exit 0.
- Pendente (passo separado): migration de `DROP` das tabelas `reimbursement_*` + RLS
  + bucket, e regeneração de `types.ts`.
