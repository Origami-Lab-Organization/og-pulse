
# Plano: Ajustes Visuais na Tabela de Alocação de Equipe

## Alterações Solicitadas

Com base na imagem de referência, os seguintes ajustes visuais serão implementados:

1. **Coluna Funcionário**: Reduzir fonte do papel e centralizá-lo abaixo do dropdown
2. **Coluna Senioridade**: Centralizar os dados verticalmente
3. **Horas Orçadas**: Remover o sufixo "orç." (exibir apenas o número, ex: "84h" em vez de "84h orç.")
4. **Totais Orçados**: Adicionar valores orçados abaixo dos totais planejados no rodapé

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

#### 1. Coluna Funcionário (linhas 620-623)

Reduzir tamanho da fonte do papel e centralizar:

**Antes:**
```tsx
<span className="text-sm font-semibold text-foreground">
  {member.role}
</span>
```

**Depois:**
```tsx
<span className="text-xs font-semibold text-muted-foreground text-center w-full">
  {member.role}
</span>
```

#### 2. Coluna Senioridade (linhas 627-638)

Centralizar os dados verticalmente:

**Antes:**
```tsx
<TableCell className="p-2">
  <div className="flex flex-col gap-0.5">
```

**Depois:**
```tsx
<TableCell className="p-2">
  <div className="flex flex-col gap-0.5 items-center text-center">
```

#### 3. Remover Sufixo "orç." das Horas (linhas 719-723, 741-744)

Nas colunas de meses:

**Antes:**
```tsx
<span className="text-xs text-muted-foreground">
  {budgetHours}h orç.
</span>
```

**Depois:**
```tsx
<span className="text-xs text-muted-foreground">
  {budgetHours}h
</span>
```

Na coluna de horas totais do membro:

**Antes:**
```tsx
<span className="text-xs text-muted-foreground">
  {budgetData.budgetTotalHours}h orç.
</span>
```

**Depois:**
```tsx
<span className="text-xs text-muted-foreground">
  {budgetData.budgetTotalHours}h
</span>
```

#### 4. Adicionar Totais Orçados no Rodapé (linhas 794-844)

Calcular totais orçados e exibi-los abaixo dos totais planejados:

```tsx
// No TableFooter, para cada coluna de mês:
<TableCell key={monthNum} className="text-center">
  <div className="flex flex-col gap-0.5 items-center">
    {isInPlanningMode ? (
      <span className="font-medium">{monthTotals?.plannedHours || 0}</span>
    ) : (
      <div className="flex items-center justify-center gap-1 text-sm">
        <span className="text-muted-foreground">{monthTotals?.plannedHours || 0}</span>
        <span className="text-muted-foreground">|</span>
        <span className="font-medium">{monthTotals?.actualHours || 0}</span>
      </div>
    )}
    {/* Budgeted hours for this month */}
    {budgetTotalsByMonth[monthNum] > 0 && (
      <span className="text-xs text-muted-foreground">
        {budgetTotalsByMonth[monthNum]}h
      </span>
    )}
  </div>
</TableCell>
```

Para a coluna de horas totais no rodapé:
```tsx
<TableCell className="text-center">
  <div className="flex flex-col gap-0.5 items-center">
    {isInPlanningMode ? (
      <span className="font-semibold">{totals.totalHours}h</span>
    ) : (
      <div className="flex items-center justify-center gap-1">
        <span className="text-muted-foreground">{totals.totalHours}h</span>
        <span className="text-muted-foreground">|</span>
        <span className="font-semibold">{totals.totalActualHours}h</span>
      </div>
    )}
    {budgetSummary.hours > 0 && (
      <span className="text-xs text-muted-foreground">
        {budgetSummary.hours}h
      </span>
    )}
  </div>
</TableCell>
```

Para a coluna de custo total no rodapé:
```tsx
<TableCell className="text-center">
  <div className="flex flex-col gap-0.5 items-center">
    {isInPlanningMode ? (
      <span className="font-semibold">{formatCurrency(totals.totalValue)}</span>
    ) : (
      <div className="flex items-center justify-center gap-1 text-sm">
        <span className="text-muted-foreground">{formatCurrency(totals.totalValue)}</span>
        <span className="text-muted-foreground">|</span>
        <span className="font-semibold">{formatCurrency(totals.totalActualValue)}</span>
      </div>
    )}
    {budgetSummary.value > 0 && (
      <span className="text-xs text-muted-foreground">
        {formatCurrency(budgetSummary.value)}
      </span>
    )}
  </div>
</TableCell>
```

#### 5. Adicionar Cálculo de Totais Orçados por Mês

Adicionar um `useMemo` para calcular os totais orçados por mês (para exibir no footer):

```typescript
const budgetTotalsByMonth = useMemo(() => {
  const result: Record<number, number> = {};
  members.forEach(member => {
    const budgetData = budgetDataByMember[member.id];
    Object.entries(budgetData.budgetHoursByMonth).forEach(([month, hours]) => {
      const monthNum = Number(month);
      result[monthNum] = (result[monthNum] || 0) + hours;
    });
  });
  return result;
}, [members, budgetDataByMember]);
```

---

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| Papel centralizado | Fonte menor (`text-xs`) e centralizado abaixo do dropdown |
| Senioridade centralizada | `items-center text-center` na célula |
| Remover "orç." | Exibir apenas "84h" em vez de "84h orç." |
| Totais orçados no footer | Valores orçados abaixo dos totais em cada coluna |

---

## Resultado Esperado

1. **Coluna Funcionário**: Dropdown na primeira linha, papel centralizado em fonte menor abaixo
2. **Coluna Senioridade**: Dados centralizados verticalmente
3. **Colunas de Mês**: Horas orçadas sem sufixo "orç."
4. **Rodapé**: Totais orçados exibidos abaixo dos totais planejados/reais
