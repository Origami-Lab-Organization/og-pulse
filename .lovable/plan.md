

## Plano: Corrigir NaN no card de Comissão do Analytics

### Problema
O card "Comissão" mostra "R$ NaN". Na linha 320 de `useAnalyticsData.ts`, o `reduce` faz `Number(c.planned_value)` que retorna NaN se algum registro tiver `planned_value` nulo.

### Correção

**`src/hooks/useAnalyticsData.ts` (linha 320)**
- Trocar `Number(c.planned_value)` por `(Number(c.planned_value) || 0)` para tratar valores nulos

Essa é a única mudança necessária. Os demais cálculos (receita, impostos, custos, margem) estão corretos — a margem inclusive já desconta impostos, comissões e custos corretamente pela fórmula `(Receita - Impostos - Comissões - Custos) / Receita * 100`.

