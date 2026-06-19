# ADR 0004: Unificação dos custos extra-labor em project_costs com service único

- Status: aceito
- Data: 2026-06-19
- Decisores: Origami Lab / operacao interna (lucas@origamilab.com.br)

## Contexto

A ADR-0003 (J9-01) criou `project_costs` como tabela nova e manteve o modelo
legado (`project_suppliers` + `project_supplier_months` + `project_supplier_actuals`,
`project_materials`) intacto, com integracao aditiva na aba Custos. Isso gerou
duplicacao na UI (Fornecedor/Material apareciam nas secoes legadas E no ledger) e
o acesso aos dados de custo estava espalhado em ~8 arquivos consultando as tabelas
diretamente, com tres definicoes inconsistentes de "planejado de fornecedor".

O time decidiu unificar de verdade: uma fonte unica de dados e uma unica porta de
acesso, sem quebrar relatorios financeiros, analytics e orcamento.

## Decisao

1. **Storage unico.** `project_costs` ganha recorrencia (`is_recurring`,
   `start_month`, `end_month`, `monthly_amount`) e uma tabela-filha
   `project_cost_months` (planejado + realizado por mes, ex-supplier_months/actuals).
   Os dados legados foram copiados (migration B.1, reusando ids), de forma
   idempotente e reversivel; as tabelas legadas ficam como backup pos-migracao
   (drop futuro apos soak).

2. **Service unico (`projectCostsService`).** Unica porta de leitura/escrita de
   custo. Os 8 consumidores diretos passaram a ler dele; a transformacao
   legado→unificado (incl. derivacao de mes a partir de `cost_date` para custos
   avulsos) vive so no service. A migracao foi feita em duas fases: A) service como
   fachada sobre as tabelas legadas (sem mudar comportamento); B) flip do interior
   do service para `project_costs`/`project_cost_months` — interface estavel, entao
   os consumidores nao mudaram na fase B.

3. **UI: superficie unica.** A aba Custos perdeu as secoes legadas Fornecedores e
   Materiais; o ledger virou lista unica com filtro/coluna "Tipo" e seletor de tipo
   no formulario. O resumo (cards/margem) passou a derivar do `project_costs`,
   eliminando dupla contagem. `useCloseBusinessDeal` grava direto em `project_costs`.

## Consequencias

- Beneficios:
  - Fonte unica de verdade; fim do acesso espalhado e da duplicacao na UI.
  - Relatorios/analytics/financeiro passam a refletir TODOS os custos extra-labor
    lancados pelo ledger (nao so os de fornecedor/material legados).
  - Risco financeiro do flip isolado num unico arquivo (o service), atras de
    interface estavel.
- Custos / riscos:
  - Migracao de dados financeiros sem testes automatizados (desativados no projeto):
    validada por script SQL (`supabase/_verification/j9-02-phase-b1.sql`) rodado
    pelo time antes do flip.
  - "Planejado de fornecedor" ainda tem fontes distintas preservadas (monthly_amount
    x meses no relatorio anual vs project_cost_months na evolucao) — unificar isso
    e um passo futuro.
  - Edicao da recorrencia mensal (a antiga grade editavel) ainda nao existe no novo
    ledger; recorrentes migrados aparecem como linha unica (planejado total).
- Como reverter:
  - As tabelas legadas seguem populadas; reverter = apontar o service de volta para
    elas e restaurar as secoes. A migration B.1 nao apaga nada.

## Pendencias (follow-up)

- TD: remover arquivos orfaos (ProjectSuppliersSection, ProjectMaterialsSection,
  MaterialRealizeDialog, SupplierActualDialog) e os hooks de escrita legados em
  useProjectCosts.ts apos confirmar que nada mais os usa.
- TD: migration de cleanup para dropar as tabelas legadas apos periodo de soak.
- Editor de recorrencia no ledger (se o time precisar planejar fornecedor mensal).

## Evidencias

- Migrations: `20260619120000_project_costs_table.sql`, `20260619130000_unify_project_costs_phase_b1.sql`
- Verificacao: `supabase/_verification/j9-02-phase-b1.sql`
- Service: `src/services/projectCostsService.ts`
- UI: `src/components/projects/detail/ProjectCostsLedger.tsx`, `ProjectCostFormDialog.tsx`, `ProjectCostsTab.tsx`
- Consumidores: useFinancialEvolution, useAnalyticsData, useProjectHealthData, useProjectFinancials, projectService, projectReportService, useCloseBusinessDeal
