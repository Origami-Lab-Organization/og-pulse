
# Ajustes na Tela de Analytics

## Resumo

Reformular os KPIs financeiros e simplificar o layout removendo a aba de composicao de custos.

## Mudancas

### 1. Receita: Real vs Projetada (`useAnalyticsData.ts`)
- **Receita Real**: Soma das parcelas com `status = 'received'` e `payment_date` dentro do periodo (logica atual).
- **Receita Projetada**: Soma das parcelas com `due_date` dentro do periodo, independente do status (todas as parcelas previstas para o mes).
- **Diferenca**: `revenueActual - revenueProjected` (positivo = acima do esperado, negativo = abaixo).
- Atualizar a interface `AnalyticsData` para incluir `revenueActual`, `revenueProjected` e `revenueDiff`.

### 2. Margem Bruta com Impostos (`useAnalyticsData.ts`)
- Buscar `taxes_percent` das `financial_settings` (ja parcialmente buscado, so adicionar o campo).
- Formula: `Margem = ((Receita Real - Impostos - Custos) / Receita Real) * 100`
- Onde `Impostos = Receita Real * (taxes_percent / 100)` (Simples Nacional incide sobre a receita).
- Retornar tambem `taxesValue` e `taxesPercent` no resultado para exibicao.

### 3. KPIs Reformulados (`AnalyticsKPIs.tsx`)
- **Card Receita**: Numero grande = Receita Real. Subtitulo mostrando "Projetada: R$ X" e "Diferenca: +/- R$ Y" com cor verde/vermelha.
- **Card Custos**: Sem mudanca (ja mostra custos totais).
- **Card Margem Bruta**: Formula ajustada (descontando impostos). Subtitulo mostrando "Impostos (X%): R$ Y" e a meta.

### 4. Remover Composicao de Custos (`Analytics.tsx`)
- Remover as tabs (Composicao de Custos / Utilizacao da Equipe).
- Exibir a tabela de `EmployeeUtilizationTable` diretamente abaixo dos KPIs, sem tabs.
- Remover imports de `CostCompositionChart`, `CostByProjectTable` e `Tabs`.

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useAnalyticsData.ts` | Adicionar receita projetada, impostos na margem |
| `src/components/analytics/AnalyticsKPIs.tsx` | Reformular cards com real vs projetada e impostos |
| `src/pages/Analytics.tsx` | Remover tabs e composicao de custos |

## Detalhes Tecnicos

### Query de Receita Projetada (nova query paralela)
```
supabase.from('project_installments')
  .select('project_id, value, due_date')
  .in('project_id', projectIds)
  .gte('due_date', startStr)
  .lte('due_date', endStr)
```

### Query de Impostos
Adicionar `taxes_percent` ao select existente de `financial_settings`:
```
.select('gross_margin_target_percent, taxes_percent')
```

### Interface AnalyticsData Atualizada
```typescript
interface AnalyticsData {
  revenueActual: number;      // parcelas recebidas no periodo
  revenueProjected: number;   // parcelas previstas no periodo (due_date)
  revenueDiff: number;        // actual - projected
  totalCosts: number;
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  taxesPercent: number;
  taxesValue: number;         // revenueActual * taxesPercent / 100
  grossMargin: number;        // ((actual - taxes - costs) / actual) * 100
  grossMarginTarget: number | null;
  costsByProject: CostByProject[];
  employeeUtilization: EmployeeUtilization[];
}
```
