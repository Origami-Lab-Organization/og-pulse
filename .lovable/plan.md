
# Plano: Novo Layout dos Cards de Custos do Projeto

## Objetivo

Reorganizar a hierarquia visual dos cards de custos para priorizar os percentuais, conforme solicitado.

## Layout Atual vs Proposto

**Atual:**
```text
┌────────────────────────────────┐
│ 👥  Mão de Obra               │
│                                │
│ R$ 90.000,00        (grande)   │
│ de R$ 239.040,00    (pequeno)  │
│ ↘ 38%               (pequeno)  │
└────────────────────────────────┘
```

**Proposto:**
```text
┌────────────────────────────────┐
│ 👥  Mão de Obra               │
│                                │
│ ↘ 38%    R$ 239.040,00        │
│ (grande)  (previsto pequeno)   │
│                                │
│ R$ 90.000,00                   │
│ (absoluto pequeno)             │
└────────────────────────────────┘
```

## Alterações

**Arquivo:** `src/components/projects/detail/ProjectCostsTab.tsx`

### CostCard - Novo Layout

```tsx
function CostCard({ ... }: CostCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          {/* Icon */}
          <div className={cn('flex h-9 w-9 ...', iconBg)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            
            {/* Linha 1: Percentual grande + valor previsto pequeno */}
            <div className="flex items-baseline gap-2 mt-1">
              <div className="flex items-center gap-1">
                {/* Ícone de tendência */}
                <TrendingDown className="h-4 w-4 text-green-600" />
                {/* Percentual grande */}
                <span className="text-xl font-bold text-green-600">
                  38%
                </span>
              </div>
              {/* Valor previsto pequeno ao lado */}
              <span className="text-xs text-muted-foreground">
                R$ 239.040,00
              </span>
            </div>
            
            {/* Linha 2: Valor absoluto atual pequeno */}
            <p className="text-sm text-muted-foreground mt-0.5">
              R$ 90.000,00
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### MarginCard - Novo Layout

Para o card de Margem Bruta:

```tsx
function MarginCard({ ... }: MarginCardProps) {
  return (
    <Card className="bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <div className="...">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Margem Bruta</p>
            
            {/* Linha 1: Percentual grande + valor orçado pequeno */}
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-green-600">
                44.9%
              </span>
              <span className="text-xs text-muted-foreground">
                R$ 145.664,15 (orçado)
              </span>
            </div>
            
            {/* Linha 2: Valor absoluto */}
            <p className="text-sm text-muted-foreground mt-0.5">
              R$ 198.704,15
            </p>
            
            {/* Linha 3: Meta e gap */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                Meta: 40%
              </span>
              <span className="text-xs text-green-600">
                ✓ +4.9pp
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Hierarquia Visual Final

| Elemento | Tamanho | Cor |
|----------|---------|-----|
| Percentual | `text-xl font-bold` | Verde/Vermelho conforme tendência |
| Valor previsto (base) | `text-xs` | `text-muted-foreground` |
| Valor absoluto (atual) | `text-sm` | `text-muted-foreground` |
| Meta | `text-xs` | `text-muted-foreground` |
| Gap da meta | `text-xs font-medium` | Verde/Âmbar |

## Resultado Esperado

Cards mais focados em indicadores de performance (%), com valores monetários como contexto secundário.
