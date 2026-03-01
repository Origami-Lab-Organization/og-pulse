

## Correcao do grafico "Volume de Projetos"

### Problemas Identificados

1. **`closed_at` esta NULL** para todos os leads fechados. Eles foram movidos para "Negocio Fechado" antes do codigo que preenche `closed_at` ser adicionado. O filtro do grafico exige `closed_at` preenchido, entao nenhum projeto aparece.

2. **Nomenclatura**: "Perdido no Mes" deve ser apenas "Perdido".

### Solucao

**1. Migracao de dados** — Preencher `closed_at` para leads que ja estao fechados mas com campo nulo, usando `updated_at` como melhor aproximacao da data de fechamento.

```sql
UPDATE leads SET closed_at = updated_at WHERE crm_stage = 'closed' AND closed_at IS NULL;
```

**2. `src/hooks/useCommercialDashboard.ts`** — Adicionar fallback para leads fechados sem `closed_at`, usando `updated_at` como data de referencia:

```typescript
const wonThisMonth = filtered
  .filter(l => l.crm_stage === 'closed' && !l.archived) 
  .filter(l => {
    const dateStr = l.closed_at || l.updated_at;
    const d = parseISO(dateStr);
    return getYear(d) === selectedYear && getMonth(d) === monthIdx;
  })
  .reduce((sum, l) => sum + (l.budget?.final_total || l.estimated_value), 0);
```

Da mesma forma para perdidos:

```typescript
const lostThisMonth = filtered
  .filter(l => l.archived)
  .filter(l => {
    const dateStr = l.archived_at || l.updated_at;
    const d = parseISO(dateStr);
    return getYear(d) === selectedYear && getMonth(d) === monthIdx;
  })
  .reduce((sum, l) => sum + (l.budget?.final_total || l.estimated_value), 0);
```

**3. `src/components/commercial/RevenueAccumulatedChart.tsx`** — Renomear "Perdido no Mes" para "Perdido" na legenda da barra.

### Resumo das alteracoes

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Preencher `closed_at` nos leads existentes |
| `useCommercialDashboard.ts` | Fallback `closed_at \|\| updated_at` no calculo do grafico; valor dos perdidos usando `budget?.final_total \|\| estimated_value` |
| `RevenueAccumulatedChart.tsx` | Renomear legenda "Perdido no Mes" para "Perdido" |

