

# Plano: Remover Impostos do Sistema (exceto Orçamento)

## Resumo

Remover toda a lógica de acompanhamento, rateio e exibição de impostos do sistema — projetos, analytics, dashboard. Manter impostos **apenas** no orçamento (markup) e a meta de impostos no admin (FinancialSettings), pois alimenta a fórmula de markup.

---

## O que MANTER

- `financial_settings.taxes_percent` — campo no admin (FinancialSettingsForm) para meta de impostos usada no markup do orçamento
- `budgets.taxes_percent` — campo do orçamento que alimenta a fórmula de markup
- Toda lógica em `src/types/budget.ts` (`calculateBudgetTotals`, `calculateRecurringTotals`) que usa `taxesPercent` para calcular preço de venda
- `src/pages/BudgetForm.tsx` — formulário de orçamento que usa `taxesPercent`

## O que REMOVER

### 1. Tabela e infraestrutura de tax_entries
- **Deletar** `src/types/taxEntry.ts`
- **Deletar** `src/services/taxEntryService.ts`
- **Deletar** `src/hooks/useTaxEntries.ts`
- **Deletar** `src/components/settings/TaxEntriesManager.tsx`
- **Deletar** `src/components/analytics/TaxesOverview.tsx`

### 2. Admin Portal — aba "Impostos"
- Remover a aba `taxes` e o `TabsContent` correspondente do `AdminPortal.tsx`
- Remover import de `TaxEntriesManager` e ícone `Landmark`

### 3. Analytics — aba "Impostos" e card de impostos
- **Remover** a aba `taxes` (TabsTrigger + TabsContent) do `Analytics.tsx`
- **Remover** o card "Impostos" do `AnalyticsKPIs.tsx` (passar de 5 para 4 cards: Faturamento, Receita, Custos, Margem)
- **Remover** props `taxesPercent`, `taxesValue` do `AnalyticsKPIs`
- **Atualizar** fórmula de margem bruta no Analytics para: `Margem = (Receita - Custos) / Receita * 100` (sem desconto de impostos)

### 4. Gráfico de Evolução Financeira
- **Remover** barra "Impostos" do `FinancialEvolutionChart.tsx`
- **Remover** campos `taxesValue`, `taxesRealValue`, `plannedTaxesValue` do `FinancialMonthlyPoint` (interface em `useFinancialEvolution.ts`)
- **Remover** toda lógica de fetch/cálculo de tax entries do `useFinancialEvolution.ts`
- **Atualizar** fórmula de margem no hook: `Margem = (Receita - Custos) / Receita * 100`

### 5. Analytics Data Hook
- **Remover** `taxesPercent`, `taxesValue`, `taxesRealValue` do `AnalyticsData` (interface em `useAnalyticsData.ts`)
- **Remover** fetch de `taxEntryService` e todo cálculo de impostos
- **Atualizar** fórmula de `grossMargin`: sem desconto de impostos

### 6. Project Financials Hook
- **Remover** `taxesPercent` do `ProjectFinancialsData`
- **Remover** `taxes` do `ProjectFinancialRow` e `DimensionFinancialRow`
- **Remover** todo rateio de impostos (`realTaxByProject`, `taxEntries`, `monthlyRevenueByProject`, etc.)
- **Simplificar** `computeMargin`: `(revenue - costs) / revenue * 100`
- **Remover** import de `taxEntryService`

### 7. Project Detail Tabs — remover card "Impostos"
- **ProjectOverviewTab.tsx**: remover cálculo de `taxPlanned/taxActual/taxExecuted`, remover card "Impostos" dos KPIs, atualizar margem para `Receita - Comissão - Custos`
- **ProjectFinancialTab.tsx**: idem — remover card "Impostos", atualizar margem
- **ProjectCostsTab.tsx**: remover prop `taxesPercent` do `FinancialSummaryCard`, atualizar margem para `Receita - Custos`
- **ProjectExpectedResultTab.tsx**: remover desconto de `taxes` na margem, remover menções a impostos nos cards

### 8. ProjectMarginTable no Analytics (aba Margem)
- Remover coluna `taxes` dos dados passados (já vem do `useProjectFinancials`)
- A tabela já renderiza `grossMargin` que será recalculada sem impostos

---

## Fórmula de Margem (novo)

```text
ANTES:  Margem = (Receita - Impostos - Comissão - Custos) / Receita
DEPOIS: Margem = (Receita - Comissão - Custos) / Receita
```

Impostos continuam no **markup do orçamento** para definir preço de venda, mas não são rastreados no acompanhamento de projetos.

---

## Arquivos a editar

| Arquivo | Ação |
|---------|------|
| `src/types/taxEntry.ts` | Deletar |
| `src/services/taxEntryService.ts` | Deletar |
| `src/hooks/useTaxEntries.ts` | Deletar |
| `src/components/settings/TaxEntriesManager.tsx` | Deletar |
| `src/components/analytics/TaxesOverview.tsx` | Deletar |
| `src/pages/AdminPortal.tsx` | Remover aba Impostos |
| `src/pages/Analytics.tsx` | Remover aba Impostos, limpar props |
| `src/components/analytics/AnalyticsKPIs.tsx` | Remover card Impostos (4 cards) |
| `src/components/analytics/FinancialEvolutionChart.tsx` | Remover barra Impostos |
| `src/hooks/useFinancialEvolution.ts` | Remover lógica de tax entries |
| `src/hooks/useAnalyticsData.ts` | Remover impostos do cálculo |
| `src/hooks/useProjectFinancials.ts` | Remover rateio de impostos |
| `src/components/projects/detail/ProjectOverviewTab.tsx` | Remover card Impostos, ajustar margem |
| `src/components/projects/detail/ProjectFinancialTab.tsx` | Remover card Impostos, ajustar margem |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Remover taxesPercent, ajustar margem |
| `src/components/projects/detail/ProjectExpectedResultTab.tsx` | Remover desconto de impostos |

