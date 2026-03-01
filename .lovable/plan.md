

## Correcao do calculo do grafico "Volume de Projetos"

### Problema

O grafico de "Volume de Projetos" filtra leads pelo ano de `created_at` (data de criacao). Leads criados em anos anteriores mas que atingiram "Negocio Fechado" no ano selecionado nao aparecem no grafico.

### Solucao

No arquivo `src/hooks/useCommercialDashboard.ts`, alterar o calculo de `revenueByMonthData` para:

1. **Ganho no Mes**: buscar de `filtered` (todos os leads filtrados por linha de servico, sem filtro de ano de criacao) os leads com `crm_stage === 'closed'` cujo `closed_at` cai no mes/ano selecionado
2. **Perdido no Mes**: buscar de `filtered` os leads arquivados cujo `archived_at` cai no mes/ano selecionado

### Mudanca tecnica

**Arquivo: `src/hooks/useCommercialDashboard.ts`**

Na secao de calculo do `revenueByMonthData` (por volta da linha 95-105), trocar as referencias de `closedLeads` e `archivedYear` por buscas diretas em `filtered`, filtrando pelo ano de `closed_at` e `archived_at` respectivamente:

```typescript
const revenueByMonthData = MONTH_LABELS.map((label, monthIdx) => {
  const wonThisMonth = filtered
    .filter(l => l.crm_stage === 'closed' && !l.archived && l.closed_at
      && getYear(parseISO(l.closed_at)) === selectedYear
      && getMonth(parseISO(l.closed_at)) === monthIdx)
    .reduce((sum, l) => sum + (l.budget?.final_total || l.estimated_value), 0);

  const lostThisMonth = filtered
    .filter(l => l.archived && l.archived_at
      && getYear(parseISO(l.archived_at)) === selectedYear
      && getMonth(parseISO(l.archived_at)) === monthIdx)
    .reduce((sum, l) => sum + l.estimated_value, 0);

  accWon += wonThisMonth;
  return { month: label, wonMonth: wonThisMonth, lostMonth: lostThisMonth, wonAccumulated: accWon };
});
```

Os KPIs continuam usando `yearFiltered` (filtro por `created_at`) pois medem desempenho de leads originados no periodo. Apenas o grafico de volume e corrigido para refletir quando o negocio foi efetivamente fechado ou perdido.

Nenhum outro arquivo precisa ser alterado.

