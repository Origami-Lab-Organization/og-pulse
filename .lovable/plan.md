

## Plano: Corrigir card "Custo Rescisões" e "Pendentes de Finalização"

### Problemas encontrados

1. **Custo Rescisões = R$ 0,00**: O card lê de `severance_package.total` (linha 28-31), mas os dados financeiros estão salvos em `final_payroll_adjustments` (array JSONB). Nunca encontra o campo `total`, resultando em zero.

2. **Pendentes de Finalização = 0**: O filtro (linha 25) só checa `status === 'pending' || 'in_progress'`, mas o registro da Mariana está com status `awaiting_documents`, que não é contabilizado.

### Correções em `TerminationStats.tsx`

1. **Custo**: Somar créditos - débitos de `final_payroll_adjustments` (array de `{ value, isCredit }`). Se vazio, fallback para `severance_package.total`.

2. **Pendentes**: Incluir `awaiting_documents` no filtro de pendências.

```typescript
// Custo fix
const monthlyCost = thisMonth.reduce((sum, t) => {
  const adjs = t.final_payroll_adjustments as Array<{ value: number; isCredit: boolean }> | null;
  if (Array.isArray(adjs) && adjs.length > 0) {
    return sum + adjs.reduce((s, a) => s + (a.isCredit ? a.value : -a.value), 0);
  }
  // fallback severance_package
  const pkg = t.severance_package as Record<string, unknown> | null;
  return sum + (pkg?.total ? Number(pkg.total) : 0);
}, 0);

// Pendentes fix
const pending = terminations.filter(t => 
  ['pending', 'in_progress', 'awaiting_documents'].includes(t.status)
);
```

### Arquivo alterado
- `src/components/terminations/TerminationStats.tsx`

