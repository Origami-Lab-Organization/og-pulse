

# Corrigir Aba Financeiro - Cards e Graficos

## Problemas Identificados

### 1. Cards financeiros mostram apenas custo de material
Os cards atuais em `ProjectFinancialTab.tsx` calculam custos de forma simplificada (linhas 16-47), usando apenas `hours_per_month * hourly_cost` sem considerar as horas detalhadas por mes (`project_member_months`) nem os valores por mes de fornecedores (`project_supplier_months`). Alem disso, o custo realizado nao e calculado.

### 2. Graficos com dados zerados
- `ProjectFinancialChart.tsx` (Planejado vs Realizado): o campo `realizado` esta fixo em `0` (linha 37)
- `ProjectTrendChart.tsx` (Curva de Tendencia): o `cumulativeRealized` esta fixo em `0` (linha 66) e usa `useEmployees` ao inves dos dados reais de timesheet

## Solucao

### Cards: Replicar logica da Visao Geral
Substituir os 4 cards atuais por 3 cards identicos aos da aba Visao Geral (Receita, Custos, Margem) com Planejado vs Realizado, utilizando os mesmos hooks e calculos:
- `useProjectMemberMonths` e `useTimesheetsByMembers` para mao de obra
- `useProjectSupplierMonths` e `useProjectSupplierActuals` para fornecedores
- Materiais planejados vs realizados (`is_realized`)

### Graficos: Alimentar com dados reais por mes
Atualizar ambos os graficos para receber dados mensais reais:

**ProjectFinancialChart** (barras):
- Planejado: somar horas planejadas por mes x custo/hora + valor fornecedor por mes + materiais
- Realizado: somar horas de timesheet mapeadas ao mes do projeto + supplier actuals por mes + materiais realizados

**ProjectTrendChart** (curva acumulada):
- Mesma logica acumulada, usando dados reais ao inves de zero

## Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| `ProjectFinancialTab.tsx` | Adicionar hooks de dados reais, substituir 4 cards por 3 cards Plan vs Real, passar dados mensais detalhados aos graficos |
| `ProjectFinancialChart.tsx` | Receber dados mensais ja calculados (planejado e realizado por mes) ao inves de calcular internamente |
| `ProjectTrendChart.tsx` | Receber dados mensais ja calculados, remover `useEmployees`, usar custos acumulados reais |

## Detalhes tecnicos

### ProjectFinancialTab.tsx
- Importar `useProjectMemberMonths`, `useTimesheetsByMembers`, `useProjectSupplierMonths`, `useProjectSupplierActuals`
- Replicar os `useMemo` de `costData` e `kpiData` do `ProjectOverviewTab`
- Calcular dados mensais para os graficos: para cada mes do projeto, somar planejado e realizado separadamente
- Manter a tabela de Parcelas/Faturamento abaixo dos graficos

### ProjectFinancialChart.tsx
- Alterar props para receber array de `{ name, planejado, realizado }` ja calculado
- Remover calculo interno

### ProjectTrendChart.tsx
- Alterar props para receber array de `{ name, planejado, realizado }` com valores mensais
- Calcular acumulados internamente a partir dos dados mensais
- Calcular tendencia como projecao linear baseada nos meses com dados reais
- Remover hook `useEmployees`

