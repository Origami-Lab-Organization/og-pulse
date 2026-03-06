

## Plano: Adicionar Comissão aos KPIs do Analytics e reorganizar cards

### Situação atual
- 3 cards: Receita Recebida, Custos Totais, Margem Bruta
- Impostos aparecem como sub-info dentro do card de Margem
- Comissão não é buscada nem exibida
- Margem = (Receita - Impostos - Custos) / Receita

### Proposta
Expandir para 5 cards em layout responsivo: **Receita**, **Impostos**, **Comissão**, **Custos**, **Margem Bruta**. A margem passa a descontar também a comissão.

### Mudanças

**1. `src/hooks/useAnalyticsData.ts`**
- Adicionar fetch de `project_commissions` (filtrado por `is_paid = true` e `paid_date` no período) no bloco `Promise.all`
- Calcular `totalCommissions` (soma dos `planned_value` das comissões pagas no período)
- Adicionar `commissionValue` ao `AnalyticsData`
- Atualizar fórmula da margem: `(receita - impostos - comissões - custos) / receita * 100`

**2. `src/components/analytics/AnalyticsKPIs.tsx`**
- Adicionar prop `commissionValue`
- Layout: `grid md:grid-cols-5` (ou `grid-cols-2 lg:grid-cols-5` para responsividade)
- 5 cards na ordem:
  1. **Receita Recebida** -- valor + projetada + diferença (como hoje)
  2. **Impostos** -- valor + percentual
  3. **Comissão** -- valor total pago no período
  4. **Custos Totais** -- valor (como hoje)
  5. **Margem Bruta** -- percentual + meta (como hoje, mas sem sub-info de impostos que agora tem card próprio)

**3. `src/pages/Analytics.tsx`**
- Passar `commissionValue` ao componente KPIs

### Arquivos alterados
1. `src/hooks/useAnalyticsData.ts`
2. `src/components/analytics/AnalyticsKPIs.tsx`
3. `src/pages/Analytics.tsx`

