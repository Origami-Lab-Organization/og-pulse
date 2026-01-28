
# Plano: Corrigir Calculo e Exibicao de Custos de Funcionarios

## Problemas Identificados

### 1. Custo Mensal Total Nao Calculado Corretamente

Analisando os dados do banco:
- Todos os funcionarios tem `total_monthly_cost_estimated: 0`
- O campo `breakdown_json` esta `null`
- A edge function `create-employee-user` NAO salva os novos campos de custo

O calculo no `EmployeeStats.tsx` usa fallback quando `totalMonthlyCostEstimated === 0`:
```typescript
return sum + e.salarioMensal + e.beneficios + e.encargos + (e.totalToolsCost || 0)
```

Mas este fallback nao considera o tipo de contratacao correto (bolsa-auxilio para estagio, valor contrato PJ, etc).

### 2. Provisao Mensal Nao Exibida

O usuario quer ver a provisao mensal logo abaixo do custo anual no card de estatisticas.

---

## Solucao Proposta

### Parte 1: Corrigir Edge Function para Salvar Custos

**Arquivo: `supabase/functions/create-employee-user/index.ts`**

Adicionar os novos campos na interface e no insert:

```typescript
interface CreateEmployeeRequest {
  // ... campos existentes ...
  bolsaAuxilio: number;
  valorContratoPj: number;
  dividendos: number;
  provisao13: number;
  provisaoFerias: number;
  provisaoRecesso: number;
  totalMonthlyCostEstimated: number;
  totalAnnualCostEstimated: number;
  breakdownJson: object | null;
}

// No insert:
.insert({
  // ... campos existentes ...
  bolsa_auxilio: bolsaAuxilio || 0,
  valor_contrato_pj: valorContratoPj || 0,
  dividendos: dividendos || 0,
  provisao_13: provisao13 || 0,
  provisao_ferias: provisaoFerias || 0,
  provisao_recesso: provisaoRecesso || 0,
  total_monthly_cost_estimated: totalMonthlyCostEstimated || 0,
  total_annual_cost_estimated: totalAnnualCostEstimated || 0,
  breakdown_json: breakdownJson || null,
})
```

### Parte 2: Passar Custos Calculados no Submit

**Arquivo: `src/components/employees/EmployeeFormDialog.tsx`**

No `handleSubmit`, incluir os valores calculados:

```typescript
onSubmit({
  ...data,
  bolsaAuxilio: data.bolsaAuxilio || 0,
  valorContratoPj: data.valorContratoPj || 0,
  dividendos: data.dividendos || 0,
  provisao13: costBreakdown?.details.provisao13 || 0,
  provisaoFerias: costBreakdown?.details.provisaoFerias || 0,
  provisaoRecesso: costBreakdown?.details.provisaoRecesso || 0,
  totalMonthlyCostEstimated: costBreakdown?.totalMonthlyCost || 0,
  totalAnnualCostEstimated: costBreakdown?.totalAnnualCost || 0,
  breakdownJson: costBreakdown || null,
  localBenefits: isEditing ? undefined : localBenefits,
  localTools: isEditing ? undefined : localTools,
  createNewVersion: hasVersionedChanges,
} as EmployeeFormSubmitData);
```

### Parte 3: Corrigir Fallback no EmployeeStats

**Arquivo: `src/components/employees/EmployeeStats.tsx`**

Melhorar o calculo de fallback para considerar tipo de contratacao:

```typescript
const totalMonthlyCost = employees
  .filter((e) => e.status === 'ativo')
  .reduce((sum, e) => {
    // Usar custo salvo se disponivel
    if (e.totalMonthlyCostEstimated > 0) {
      return sum + e.totalMonthlyCostEstimated;
    }
    
    // Fallback: calcular baseado no tipo de contratacao
    let baseCost = 0;
    switch (e.tipoContratacao) {
      case 'CLT':
      case 'MENOR_APRENDIZ':
        baseCost = e.salarioMensal;
        break;
      case 'ESTAGIO':
        baseCost = e.bolsaAuxilio || e.salarioMensal;
        break;
      case 'PJ':
        baseCost = e.valorContratoPj || e.salarioMensal;
        break;
      case 'SOCIO':
        baseCost = (e.proLabore || 0) + (e.dividendos || 0) || e.salarioMensal;
        break;
      default:
        baseCost = e.salarioMensal;
    }
    
    return sum + baseCost + e.encargos + (e.totalBenefitsCost || 0) + (e.totalToolsCost || 0);
  }, 0);
```

### Parte 4: Adicionar Provisao Mensal no Card de Estatisticas

**Arquivo: `src/components/employees/EmployeeStats.tsx`**

Calcular provisao mensal e exibir abaixo do custo anual:

```typescript
// Calcular provisao mensal total
const totalMonthlyProvision = employees
  .filter((e) => e.status === 'ativo')
  .reduce((sum, e) => {
    // Usar breakdown se disponivel
    if (e.breakdownJson?.provisionsAmount) {
      return sum + e.breakdownJson.provisionsAmount;
    }
    // Fallback: usar campos individuais
    return sum + (e.provisao13 || 0) + (e.provisaoFerias || 0) + (e.provisaoRecesso || 0);
  }, 0);

// No card de Custo Mensal Total:
{
  label: 'Custo Mensal Total',
  value: formatCurrency(totalMonthlyCost),
  subValue: `Anual: ${formatCurrency(totalAnnualCost)}`,
  subValue2: `Provisao Mensal: ${formatCurrency(totalMonthlyProvision)}`,
  icon: DollarSign,
  color: 'bg-accent/20 text-foreground',
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/create-employee-user/index.ts` | Adicionar campos de custo no insert |
| `src/components/employees/EmployeeFormDialog.tsx` | Passar valores calculados no submit |
| `src/components/employees/EmployeeStats.tsx` | Corrigir fallback e adicionar provisao mensal |
| `src/services/employeeService.ts` | Garantir que novos campos sao passados na criacao |
| `src/hooks/useEmployees.ts` | Adicionar campos de provisao no tipo Employee |

---

## Fluxo de Dados Corrigido

```text
1. Usuario preenche wizard
                |
                v
2. EmployeeFormDialog calcula CostBreakdown
                |
                v
3. handleSubmit inclui totalMonthlyCostEstimated e breakdownJson
                |
                v
4. Edge Function salva TODOS os campos no banco
                |
                v
5. EmployeeStats le totalMonthlyCostEstimated do banco
                |
                v
6. Exibe custo correto + provisao mensal
```

---

## Exibicao do Card de Custos (Depois)

```text
+--------------------------------------+
| [$]  Custo Mensal Total              |
|      R$ 59.800,00                    |
|      Anual: R$ 717.600,00            |
|      Provisao Mensal: R$ 8.200,00    |
+--------------------------------------+
```

---

## Criterios de Aceite

1. Novos funcionarios sao salvos com `total_monthly_cost_estimated` preenchido
2. O campo `breakdown_json` e salvo com o detalhamento completo
3. Custo mensal total soma corretamente funcionarios ativos
4. Provisao mensal aparece abaixo do custo anual no card
5. Fallback funciona corretamente para funcionarios antigos sem os novos campos
6. Diferentes tipos de contratacao sao considerados no calculo
