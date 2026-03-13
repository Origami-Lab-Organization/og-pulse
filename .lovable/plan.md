

## Problema

A lógica atual tenta projetar receita de projetos contínuos com cálculos de `monthsActive × total_value`, mas o usuário quer algo mais simples e direto: **somar todas as parcelas do ano corrente, independente do status**, para todos os projetos.

Se um projeto contínuo tem 12 parcelas de R$ 5.000 cadastradas, a soma deve ser R$ 60.000 — sem projeção, apenas a soma real das parcelas.

## Correção

**`src/components/projects/ProjectStats.tsx`** — Simplificar o cálculo de `totalYearRevenue`:

```typescript
const totalYearRevenue = projects.reduce((acc, p) => {
  const yearInstallments = (p.installments || [])
    .filter((i) => new Date(i.due_date).getFullYear() === currentYear);
  return acc + yearInstallments.reduce((sum, i) => sum + Number(i.value || 0), 0);
}, 0);
```

Remove toda a lógica de projeção contínua (`isContinuous`, `monthsActive`, `projected`, `Math.max`). O card passa a refletir exatamente a soma das parcelas registradas no ano.

