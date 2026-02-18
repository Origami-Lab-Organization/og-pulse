
# Corrigir Custo Mensal Total e Adicionar Data de Vigencia nos Beneficios

## Resumo

Dois problemas a resolver:
1. O custo mensal total exibido na tabela de funcionarios nao inclui beneficios da tabela `employee_benefits` - o campo `total_monthly_cost_estimated` no banco nao e recalculado ao adicionar/remover beneficios de funcionarios existentes
2. Adicionar/remover beneficios nao solicita data de vigencia, prejudicando previsoes de custo nos projetos

## Problema 1: Custo Mensal Nao Inclui Beneficios

### Causa Raiz

Quando um beneficio e adicionado/removido via `EmployeeBenefitsTable` (para funcionarios existentes), o hook `useAddEmployeeBenefit` apenas insere na tabela `employee_benefits` e invalida queries. Porem, **nao recalcula** o `total_monthly_cost_estimated` no registro do funcionario.

O calculo de custo na tabela de listagem (`EmployeesTable.tsx`, linha 136-138) usa `totalMonthlyCostEstimated` que esta desatualizado, e o fallback tambem nao soma `totalBenefitsCost`:

```text
fallback = salarioMensal + beneficios + encargos + totalToolsCost
// Falta: totalBenefitsCost
```

### Solucao

**a) Recalcular custo apos cada alteracao de beneficio/ferramenta**

Nos hooks `useAddEmployeeBenefit`, `useDeleteEmployeeBenefit`, `useUpdateEmployeeBenefit` (e os equivalentes de ferramentas), apos o mutate, disparar um recalculo do `total_monthly_cost_estimated` no registro do funcionario.

Criar uma funcao utilitaria `recalculateEmployeeTotalCost(employeeId)` no `employeeService.ts` que:
1. Busca o employee (dados salariais)
2. Busca soma de `employee_benefits.monthly_value` para esse employee
3. Busca soma de `employee_tools.monthly_cost` para esse employee
4. Busca o payroll profile do tenant
5. Recalcula usando `calculateEmployeeCost`
6. Atualiza `total_monthly_cost_estimated`, `total_annual_cost_estimated`, `breakdown_json` no registro do funcionario

**b) Corrigir o fallback na EmployeesTable**

Adicionar `totalBenefitsCost` ao calculo de fallback na tabela.

## Problema 2: Data de Vigencia ao Alterar Beneficios

### Solucao

Ao adicionar ou remover um beneficio de um funcionario existente, exibir um dialog solicitando a data de vigencia (similar ao versionamento financeiro existente). Essa data sera usada para criar um novo `employee_version` refletindo o novo custo total.

**a) Criar `BenefitEffectiveDateDialog`** - Dialog com calendario para selecionar data de vigencia, exibido ao confirmar adicao/remocao de beneficio.

**b) Alterar `EmployeeBenefitsTable`** para:
- Ao adicionar: apos confirmar o beneficio, abrir dialog de data de vigencia
- Ao remover: apos confirmar a exclusao, abrir dialog de data de vigencia
- Apos escolher a data: executar o mutate do beneficio + recalcular custo + criar nova versao com a data de vigencia informada

## Mudancas Detalhadas

### 1. `src/services/employeeService.ts`
- Adicionar funcao `recalculateAndUpdateCost(employeeId: string, payrollProfile)` que:
  - Busca dados do funcionario + soma de beneficios + soma de ferramentas
  - Recalcula custo total via `calculateEmployeeCost`
  - Atualiza o registro do funcionario com novos valores
  - Opcionalmente cria nova versao com `effectiveFrom`

### 2. `src/hooks/useEmployees.ts`
- Adicionar hook `useRecalculateEmployeeCost()` que chama `recalculateAndUpdateCost`
- Alterar `useAddEmployeeBenefit`, `useDeleteEmployeeBenefit` para aceitar `effectiveFrom` opcional e disparar recalculo + versionamento

### 3. `src/components/employees/EmployeeBenefitsTable.tsx`
- Adicionar estado para dialog de data de vigencia
- Ao confirmar adicao/remocao, abrir dialog perguntando data de vigencia
- Apos confirmar data, executar operacao + recalculo + criacao de versao

### 4. `src/components/employees/EmployeesTable.tsx`
- Corrigir fallback para incluir `totalBenefitsCost`:
  ```text
  custoTotal = salarioMensal + beneficios + encargos + totalToolsCost + totalBenefitsCost
  ```

## Arquivos Modificados/Criados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/services/employeeService.ts` | Editado | Nova funcao `recalculateAndUpdateCost` |
| `src/hooks/useEmployees.ts` | Editado | Hook de recalculo + alterar hooks de beneficio para aceitar effectiveFrom |
| `src/components/employees/EmployeeBenefitsTable.tsx` | Editado | Dialog de data de vigencia ao add/remove, disparar recalculo |
| `src/components/employees/EmployeesTable.tsx` | Editado | Corrigir fallback do custo incluindo totalBenefitsCost |

## Detalhes Tecnicos

### Funcao de Recalculo

```typescript
async recalculateAndUpdateCost(
  employeeId: string, 
  payrollProfile: PayrollProfile,
  effectiveFrom?: string
): Promise<void> {
  // 1. Fetch employee data
  const employee = await this.getById(employeeId);
  // 2. Fetch benefits total
  const { data: benefits } = await supabase
    .from('employee_benefits')
    .select('monthly_value')
    .eq('employee_id', employeeId);
  const benefitsTotal = benefits?.reduce((s, b) => s + Number(b.monthly_value), 0) || 0;
  // 3. Fetch tools total
  const { data: tools } = await supabase
    .from('employee_tools')
    .select('monthly_cost')
    .eq('employee_id', employeeId);
  const toolsTotal = tools?.reduce((s, t) => s + Number(t.monthly_cost), 0) || 0;
  // 4. Calculate
  const breakdown = calculateEmployeeCost({ ... benefitsTotalMonthly: benefitsTotal, toolsTotalMonthly: toolsTotal });
  // 5. Update employee
  await supabase.from('employees').update({ 
    total_monthly_cost_estimated: breakdown.totalMonthlyCost,
    ...
  }).eq('id', employeeId);
  // 6. Create version if effectiveFrom provided
  if (effectiveFrom) {
    await employeeVersionService.createVersion({ employeeId, effectiveFrom, ... });
  }
}
```

### Fluxo do Dialog de Vigencia

1. Usuario clica "Adicionar" beneficio e preenche dados
2. Usuario confirma -> abre dialog "Data de Vigencia"
3. Usuario escolhe data -> beneficio e salvo + custo recalculado + versao criada
4. Toast de sucesso

Mesmo fluxo para remocao de beneficio.
