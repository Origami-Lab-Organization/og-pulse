

# Ajuste do KPI "Receita Prevista (Forecast)"

## Resumo
O card de Forecast ja existe, mas precisa ser ajustado para refletir a regra de negocio correta: excluir leads sem valor (Triagem/Qualificacao) do calculo, atualizar tooltip e adicionar sub-label com contagem de orcamentos. Tambem corrigir o estouro visual dos cards.

## Alteracoes

### 1. Hook: corrigir formula do forecast (`useCommercialDashboard.ts`)

**Antes:** calcula forecast para todos os leads ativos (incluindo Triagem/Qualificacao com valor 0).

**Depois:** filtrar apenas leads com valor > 0 antes de aplicar as probabilidades. Adicionar campo `forecastLeadsCount` ao retorno.

```text
// Nova logica em computeKPIs:
const forecastLeads = activeLeads.filter(l => getLeadValue(l) > 0);
const forecast = forecastLeads.reduce((sum, l) => {
  const prob = STAGE_PROBABILITY[l.crm_stage] ?? 0;
  return sum + getLeadValue(l) * prob;
}, 0);
const forecastLeadsCount = forecastLeads.length;
```

Adicionar `forecastLeadsCount` na interface `CommercialDashboardData` e no retorno de `computeKPIs`.

### 2. Componente: atualizar card do Forecast (`CommercialKPIs.tsx`)

- **Tooltip atualizado:** "Estimativa ponderada de receita com base nos orcamentos em andamento e probabilidade de fechamento por etapa"
- **Sub-label:** "Baseado em N orcamentos ativos" (quando forecastLeadsCount > 0) ou "Nenhum orcamento ativo no periodo" (quando 0)
- **Adicionar prop** `forecastLeadsCount` na interface Props
- **Corrigir estouro visual:** trocar o valor de `text-lg` para `text-base` e adicionar `truncate` ao container do valor para evitar overflow em telas menores. Tambem ajustar o grid para `xl:grid-cols-6` (ao inves de `lg:grid-cols-6`) para dar mais espaco em telas intermediarias.

### 3. Pagina: passar nova prop (`CommercialDashboard.tsx`)

Passar `forecastLeadsCount={data.forecastLeadsCount}` ao componente `CommercialKPIs`.

## Arquivos modificados
1. `src/hooks/useCommercialDashboard.ts` -- filtrar leads com valor > 0 no forecast, retornar forecastLeadsCount
2. `src/components/commercial/CommercialKPIs.tsx` -- atualizar tooltip, adicionar sub-label, corrigir overflow
3. `src/pages/CommercialDashboard.tsx` -- passar forecastLeadsCount

