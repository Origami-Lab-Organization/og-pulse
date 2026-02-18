
# Corrigir Custo Mensal de Funcionarios (Card + Tabela + Dados)

## Problema

O custo mensal exibido no card e na tabela de funcionarios nao inclui os beneficios da tabela `employee_benefits`. Isso acontece em 3 pontos:

1. **EmployeeCard** (linha 14): calcula `salarioMensal + beneficios + encargos + totalToolsCost` -- falta `totalBenefitsCost`
2. **EmployeesTable**: o campo `totalMonthlyCostEstimated` no banco esta desatualizado (nao inclui beneficios) para todos os funcionarios existentes
3. **EmployeeCard** usa jornada fixa de 176h em vez do `jornadaMensal` real do funcionario

## Solucao

### 1. Corrigir `EmployeeCard.tsx`

Usar a mesma logica da tabela: priorizar `totalMonthlyCostEstimated`, com fallback incluindo `totalBenefitsCost`. Usar `jornadaMensal` em vez de 176 fixo.

```typescript
const custoTotal = employee.totalMonthlyCostEstimated > 0
  ? employee.totalMonthlyCostEstimated
  : employee.salarioMensal + employee.beneficios + employee.encargos 
    + (employee.totalToolsCost || 0) + (employee.totalBenefitsCost || 0);
const custoHora = custoTotal / (employee.jornadaMensal || 176);
```

### 2. Recalcular custos no banco para todos os funcionarios existentes

Chamar a edge function `recalculate-employee-costs` ou criar uma migracao SQL que recalcula os valores. Como a logica de calculo e complexa (depende do payroll profile e tipo de contratacao), a melhor abordagem e disparar o recalculo via edge function para cada funcionario.

Alternativa mais simples: ajustar o fallback nos componentes para SEMPRE somar `totalBenefitsCost` dos dados da query (ja disponivel via join), e nao depender exclusivamente do `totalMonthlyCostEstimated` salvo no banco. Isso garante que mesmo sem recalcular o banco, a UI mostra o valor correto.

### Abordagem escolhida: Fallback inteligente na UI

Em vez de depender do `totalMonthlyCostEstimated` (que pode estar desatualizado), somar sempre os beneficios e ferramentas da query ao valor base. Isso e mais seguro e imediato.

## Arquivos Modificados

| Arquivo | Descricao |
|---------|-----------|
| `src/components/employees/EmployeeCard.tsx` | Incluir `totalBenefitsCost` no calculo e usar `jornadaMensal` |
| `src/components/employees/EmployeesTable.tsx` | Ajustar logica para sempre adicionar `totalBenefitsCost` e `totalToolsCost` ao valor do banco quando o breakdown nao inclui esses valores |

## Detalhes Tecnicos

### EmployeeCard.tsx (linha 14-15)

Trocar:
```typescript
const custoTotal = employee.salarioMensal + employee.beneficios + employee.encargos + (employee.totalToolsCost || 0);
const custoHora = (custoTotal / 176).toFixed(2);
```

Por:
```typescript
const custoTotal = employee.totalMonthlyCostEstimated > 0
  ? employee.totalMonthlyCostEstimated
  : employee.salarioMensal + employee.beneficios + employee.encargos 
    + (employee.totalToolsCost || 0) + (employee.totalBenefitsCost || 0);
const custoHora = custoTotal / (employee.jornadaMensal || 176);
```

### EmployeesTable.tsx (linhas 136-138 e 152-155)

Manter a logica atual que ja foi corrigida no ultimo commit (ja inclui `totalBenefitsCost` no fallback). Porem, adicionar uma verificacao extra: se `totalMonthlyCostEstimated > 0` mas o `breakdownJson` nao tem `benefitsAmount` (ou e zero) e o funcionario TEM beneficios na query, somar a diferenca. Isso corrige os dados historicos sem precisar de migracao.

```typescript
const custoTotal = (() => {
  const estimated = employee.totalMonthlyCostEstimated;
  const benefitsFromQuery = employee.totalBenefitsCost || 0;
  const toolsFromQuery = employee.totalToolsCost || 0;
  
  if (estimated > 0) {
    // Check if stored value already includes benefits
    const breakdown = employee.breakdownJson;
    const storedBenefits = breakdown && typeof breakdown === 'object' && 'benefitsAmount' in breakdown
      ? (breakdown.benefitsAmount as number) : 0;
    const storedTools = breakdown && typeof breakdown === 'object' && 'toolsAmount' in breakdown
      ? (breakdown.toolsAmount as number) : 0;
    
    // Add missing benefits/tools not in the stored calculation
    return estimated + (benefitsFromQuery - storedBenefits) + (toolsFromQuery - storedTools);
  }
  
  return employee.salarioMensal + employee.beneficios + employee.encargos + benefitsFromQuery + toolsFromQuery;
})();
```

A mesma logica sera aplicada no `sortingFn` para manter a ordenacao consistente.
