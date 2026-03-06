

## Plano: Adicionar card "Impostos" entre Receita e Custos

### Lógica
- **NF emitida** = soma das parcelas com status `invoiced` ou `received`
- **Taxa de impostos** = `financialSettings.taxes_percent` (já carregado no componente)
- **Imposto realizado** = NF emitida × (taxes_percent / 100)
- **Imposto planejado** = receita planejada (valor contrato) × (taxes_percent / 100)
- **% executado** = (realizado / planejado) × 100

### Mudanças em `src/components/projects/detail/ProjectFinancialTab.tsx`

1. No `kpiData`, calcular:
   - `invoicedTotal` = parcelas com status `invoiced` ou `received`
   - `taxRate` = `financialSettings?.taxes_percent ?? 0`
   - `taxActual` = `invoicedTotal * taxRate / 100`
   - `taxPlanned` = `revenuePlanned * taxRate / 100`
   - `taxExecuted` = `taxPlanned > 0 ? (taxActual / taxPlanned) * 100 : 0`

2. Adicionar card "Impostos" com ícone `Receipt` entre Receita e Custos, usando o mesmo layout visual dos cards existentes

3. Atualizar o grid de `sm:grid-cols-3` para `sm:grid-cols-4`

4. Atualizar cálculo de margem para descontar impostos:
   - `marginPlanned = ((revenuePlanned - taxPlanned - costPlanned) / revenuePlanned) * 100`
   - `marginActual = ((revenueActual - taxActual - costActual) / revenueActual) * 100`

### Arquivo alterado
- `src/components/projects/detail/ProjectFinancialTab.tsx`

