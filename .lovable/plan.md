
# Plano: Simplificar Card de Resumo Financeiro

## Problema Atual

O card de "Resumo Financeiro" está com layout embolado, tentando mostrar muita informação em colunas apertadas.

## Layout Proposto

Simplificar para um layout vertical claro, similar aos outros cards:

```text
┌─────────────────────────────────────┐
│ 💰  Custo Total                     │
│                                     │
│ R$ 186.000,00         (valor grande)│
│ Orçado: R$ 239.040,00 (referência)  │
│                                     │
│ Margem: 44.9%  +4.9pp               │
│ (verde ou vermelho conforme sinal)  │
└─────────────────────────────────────┘
```

## Alteracoes

**Arquivo:** `src/components/projects/detail/ProjectCostsTab.tsx`

### FinancialSummaryCard Simplificado

```tsx
function FinancialSummaryCard({ ... }: FinancialSummaryCardProps) {
  const displayCost = isPlanningMode ? totalPlannedCost : totalActualCost;
  const baseDisplayCost = isPlanningMode ? totalBudgetedCost : totalPlannedCost;
  
  const taxes = contractValue * (taxesPercent / 100);
  const grossMargin = contractValue - taxes - displayCost;
  const marginPercent = contractValue > 0 
    ? (grossMargin / contractValue) * 100 
    : 0;
  
  const gap = marginPercent - grossMarginTarget;
  const isPositive = gap >= 0;
  
  return (
    <Card className="bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Titulo: Custo Total */}
            <p className="text-sm font-medium text-muted-foreground">Custo Total</p>
            
            {/* Valor principal em destaque */}
            <p className="text-lg font-semibold">
              {formatCurrency(displayCost)}
            </p>
            
            {/* Valor de referencia */}
            <p className="text-xs text-muted-foreground">
              {isPlanningMode ? 'Orçado' : 'Planejado'}: {formatCurrency(baseDisplayCost)}
            </p>
            
            {/* Margem Bruta com gap ao lado (pequeno) */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn(
                "text-sm font-medium",
                marginPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
              )}>
                Margem: {marginPercent.toFixed(1)}%
              </span>
              {grossMarginTarget > 0 && (
                <span className={cn(
                  "text-xs",
                  isPositive ? "text-green-600 dark:text-green-400" : "text-destructive"
                )}>
                  {isPositive ? '+' : ''}{gap.toFixed(1)}pp
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Mudancas Principais

| Elemento | Antes | Depois |
|----------|-------|--------|
| Titulo | "Resumo Financeiro" | "Custo Total" |
| Layout | Grid 2 colunas | Vertical simples |
| Custo | Em sub-coluna | Principal grande |
| Margem | Em sub-coluna separada | Linha inferior com pp ao lado |
| Meta | Linha separada com icones | Removida (pp indica a diferenca) |
| Icones | Target, CheckCircle, AlertTriangle | Removidos |

## Resultado

- Layout consistente com os outros 3 cards
- Hierarquia visual clara: valor principal > referencia > margem
- Cor verde/vermelha indica se margem e gap sao positivos ou negativos
- Menos elementos visuais = leitura mais facil
