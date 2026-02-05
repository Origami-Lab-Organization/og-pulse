

# Plano: Layout Responsivo para Telas 14" e Menores

## Problema Identificado

Os cards de métricas estão truncando valores monetários em telas de 14" (típico em laptops), resultando em informação ilegível ("R$ 239....", "R$ 12...."). Isso afeta a aba de Custos e potencialmente outras abas.

## Análise das Telas

| Componente | Problema Atual | Solução |
|------------|----------------|---------|
| **Custos** | 5 cards em grid truncam valores | Layout empilhado ou grid adaptativo |
| **OKRs** | Cards únicos, sem problemas críticos | Manter layout atual |
| **Stakeholders** | Grid 3 colunas em lg | Ajustar breakpoints |
| **Cronograma** | Timeline horizontal pode ser longa | Já tem fallback mobile |
| **Resultado Esperado** | 4 cards com valores grandes | Ajustar grid |

## Estratégia: Priorizar Legibilidade sobre Densidade

Para telas de 14" (tipicamente 1366px ou 1440px de largura):
- Com sidebar (~260px), restam ~1100-1180px de área útil
- 5 cards nesse espaço = ~220px por card (muito estreito)
- Solução: usar 3 colunas no breakpoint intermediário

---

## Alterações Técnicas

### 1. Arquivo: `src/components/projects/detail/ProjectCostsTab.tsx`

**Problema:** Grid de 5 colunas comprime demais os cards.

**Solução:** Reformular o layout dos cost cards para um formato mais compacto que preserve a legibilidade.

#### Alteração A: Simplificar o CostCard (modo compacto)

Ao invés de empilhar 3 linhas (Orçado, Planejado, %), exibir em formato mais horizontal quando possível:

```tsx
// Novo layout: valores lado a lado quando caber
<div className="text-right">
  <p className="text-lg font-bold">{formatCurrency(compareValue)}</p>
  <p className="text-xs text-muted-foreground">
    de {formatCurrency(baseValue)}
  </p>
  {/* Indicador de tendência abaixo */}
</div>
```

#### Alteração B: Ajustar breakpoints do grid

**Antes:**
```tsx
<div className={cn("grid gap-4", isEditable ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 md:grid-cols-4")}>
```

**Depois:**
```tsx
<div className={cn(
  "grid gap-4",
  isEditable 
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" 
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
)}>
```

Isso garante:
- Mobile: 1 coluna (legível)
- Tablet/14": 2-3 colunas (espaço suficiente)
- Desktop grande: 4-5 colunas

#### Alteração C: Remover truncate dos valores monetários

Trocar `truncate` por `text-ellipsis` apenas quando necessário, mas garantir que valores principais sejam sempre visíveis.

#### Alteração D: Reduzir padding interno

Diminuir de `pt-6` para `pt-4` e `gap-3` para `gap-2` para ganhar espaço.

---

### 2. Arquivo: `src/components/projects/detail/ProjectExpectedResultTab.tsx`

**Problema:** Grid de 4 colunas pode comprimir valores.

**Solução:** Ajustar breakpoints.

**Antes (linha 77):**
```tsx
<div className="grid gap-4 md:grid-cols-4">
```

**Depois:**
```tsx
<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
```

---

### 3. Arquivo: `src/components/projects/detail/ProjectStakeholdersTab.tsx`

**Problema:** Grid de 3 colunas em `lg` pode ser apertado.

**Solução:** Usar xl para 3 colunas.

**Antes (linha 131):**
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
```

**Depois:**
```tsx
<div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
```

---

### 4. Arquivo: `src/components/projects/detail/ProjectScheduleTab.tsx`

O componente já tem layout adaptativo (timeline hidden em md). Apenas garantir que a lista de marcos tenha espaço adequado.

**Nenhuma alteração crítica necessária.**

---

### 5. Arquivo: `src/components/projects/detail/ProjectOKRsTab.tsx`

Os cards são em lista vertical, ocupando largura total. Layout já é responsivo.

**Nenhuma alteração crítica necessária.**

---

## Novo Design do CostCard

Para maximizar legibilidade em espaços menores, o novo layout será:

```text
┌─────────────────────────────┐
│ [Icon] Mão de Obra          │
│         R$ 119.040,00       │  <- Valor principal em destaque
│         de R$ 239.040,00    │  <- Base value menor
│         ↓ 50% economia      │  <- Trend indicator
└─────────────────────────────┘
```

Isso coloca o valor mais importante (planejado ou realizado) em destaque, com o valor de comparação em texto menor abaixo.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ProjectCostsTab.tsx` | Novo layout de CostCard + grid responsivo |
| `ProjectExpectedResultTab.tsx` | Breakpoint ajustado para `lg:grid-cols-4` |
| `ProjectStakeholdersTab.tsx` | Breakpoint ajustado para `xl:grid-cols-3` |
| `ProjectScheduleTab.tsx` | Sem alteração |
| `ProjectOKRsTab.tsx` | Sem alteração |

---

## Resultado Esperado

1. **Telas 14" (1366-1440px):** Cards com espaço suficiente para exibir valores completos
2. **Telas menores:** Layout empilhado garante legibilidade
3. **Telas grandes (1920px+):** Aproveitamento total com 4-5 colunas
4. **Valores sempre visíveis:** Nenhum valor monetário será truncado

