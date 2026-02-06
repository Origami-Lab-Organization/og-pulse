
# Plano: Melhorar Layout dos Cards de Custos

## Problemas Identificados

1. **Legibilidade ruim**: A hierarquia visual atual mistura elementos de forma confusa
2. **Excesso de cards**: 5 cards na linha ocupam muito espaco e o card de "Custo Total" tem informacao redundante

## Solucao Proposta

Reduzir para **4 cards** combinando "Custo Total" e "Margem Bruta" num unico card de resumo financeiro.

## Layout Proposto

```text
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│ 👥 Mao de Obra   │  │ 🚚 Fornecedores  │  │ 📦 Materiais     │  │ 💰 Resumo Financeiro     │
│                  │  │                  │  │                  │  │                          │
│ Planejado:       │  │ Planejado:       │  │ Planejado:       │  │ Custo Total    Margem    │
│ R$ 90.000,00     │  │ R$ 96.000,00     │  │ R$ 0,00          │  │ R$ 186.000    44.9%     │
│                  │  │                  │  │                  │  │ (78% orcado)  +4.9pp    │
│ Orcado:          │  │ Orcado:          │  │ Orcado:          │  │                          │
│ R$ 239.040,00    │  │ R$ 0,00          │  │ R$ 0,00          │  │ Meta: 40%  ✓ Acima      │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────────────┘
```

## Alteracoes

**Arquivo:** `src/components/projects/detail/ProjectCostsTab.tsx`

### 1. Redesign do CostCard - Layout mais limpo

```tsx
function CostCard({ icon, iconBg, label, plannedValue, actualValue, isPlanningMode, budgetedValue }: CostCardProps) {
  const baseValue = isPlanningMode ? budgetedValue : plannedValue;
  const compareValue = isPlanningMode ? plannedValue : actualValue;
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconBg)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {/* Valor principal (planejado ou realizado) */}
            <p className="text-lg font-semibold">
              {formatCurrency(compareValue)}
            </p>
            {/* Valor de referencia (orcado ou planejado) */}
            <p className="text-xs text-muted-foreground">
              {isPlanningMode ? 'Orçado' : 'Planejado'}: {formatCurrency(baseValue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 2. Novo FinancialSummaryCard - Combina Custo Total e Margem

```tsx
interface FinancialSummaryCardProps {
  totalPlannedCost: number;
  totalBudgetedCost: number;
  contractValue: number;
  taxesPercent: number;
  grossMarginTarget: number;
  isPlanningMode: boolean;
}

function FinancialSummaryCard({ ... }: FinancialSummaryCardProps) {
  const costPercent = totalBudgetedCost > 0 
    ? (totalPlannedCost / totalBudgetedCost) * 100 
    : 0;
  
  const taxes = contractValue * (taxesPercent / 100);
  const grossMargin = contractValue - taxes - totalPlannedCost;
  const marginPercent = contractValue > 0 
    ? (grossMargin / contractValue) * 100 
    : 0;
  
  const isAboveTarget = marginPercent >= grossMarginTarget;
  const gap = marginPercent - grossMarginTarget;
  
  return (
    <Card className="bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Resumo Financeiro</p>
            
            {/* Duas colunas: Custo Total | Margem Bruta */}
            <div className="grid grid-cols-2 gap-4">
              {/* Custo Total */}
              <div>
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-lg font-semibold">{formatCurrency(totalPlannedCost)}</p>
                <p className="text-xs text-muted-foreground">
                  {costPercent.toFixed(0)}% do orcado
                </p>
              </div>
              
              {/* Margem Bruta */}
              <div>
                <p className="text-xs text-muted-foreground">Margem Bruta</p>
                <p className={cn(
                  "text-lg font-semibold",
                  grossMargin >= 0 ? "text-green-600" : "text-destructive"
                )}>
                  {marginPercent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(grossMargin)}
                </p>
              </div>
            </div>
            
            {/* Meta indicator */}
            {grossMarginTarget > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Target className="h-3 w-3" />
                <span className="text-xs">Meta: {grossMarginTarget}%</span>
                <span className={cn(
                  "text-xs font-medium",
                  isAboveTarget ? "text-green-600" : "text-amber-600"
                )}>
                  {isAboveTarget ? '✓' : '⚠'} {gap > 0 ? '+' : ''}{gap.toFixed(1)}pp
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Atualizar Grid de Cards

```tsx
{/* De 5 para 4 colunas */}
<div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  <CostCard ... label="Mão de Obra" />
  <CostCard ... label="Fornecedores" />
  <CostCard ... label="Materiais" />
  <FinancialSummaryCard ... />  {/* Substitui os 2 cards anteriores */}
</div>
```

## Resultado

| Antes | Depois |
|-------|--------|
| 5 cards apertados | 4 cards com mais espaco |
| Hierarquia confusa | Valores claros e organizados |
| Custo Total separado da Margem | Informacoes financeiras consolidadas |
| Porcentagem como foco principal | Valores monetarios como foco, porcentagem como contexto |
