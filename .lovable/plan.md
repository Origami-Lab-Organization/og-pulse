
# Plano: Métricas de Custo para Projetos em Planejamento

## Problema Identificado

Atualmente, a aba de Custos exibe sempre "Planejado vs Realizado", mas para projetos em fase de planejamento, a comparação relevante é "Orçado vs Planejado". Além disso, a margem do projeto não está visível nesta aba, forçando o usuário a alternar para "Resultado Esperado".

## Solução Proposta

Modificar o componente `ProjectCostsTab` para:
1. Exibir "Orçado vs Planejado" quando em fase de planejamento
2. Adicionar um card de margem ao lado dos custos
3. Manter "Planejado vs Realizado" quando em fase de execução

## Nova Estrutura Visual

```text
+-------------------+-------------------+-------------------+-------------------+-------------------+
| Mão de Obra       | Fornecedores      | Materiais         | Custo Total       | Margem Planejada  |
|                   |                   |                   |                   |                   |
| Orçado:  R$ X     | Orçado:  R$ X     | Orçado:  R$ X     | Orçado:  R$ X     | R$ XXX.XXX,XX     |
| Planejado: R$ Y   | Planejado: R$ Y   | Planejado: R$ Y   | Planejado: R$ Y   | XX,X%             |
| -X% (economia)    | +X% (estouro)     |                   |                   | (verde/vermelho)  |
+-------------------+-------------------+-------------------+-------------------+-------------------+
```

---

## Alterações Técnicas

### Arquivo: `src/components/projects/detail/ProjectCostsTab.tsx`

#### 1. Importar a função de cálculo do orçamento

Adicionar import:
```tsx
import { calculateBudgetTotals } from '@/types/budget';
```

#### 2. Calcular os custos do orçamento

Utilizar o `budget` já disponível via `useBudget(project.budget_id)` para extrair:
- **laborCostBudgeted**: soma de (horas × tarifa horária) para cada role
- **suppliersCostBudgeted**: soma de (valor mensal × duração) para cada fornecedor
- **materialsCostBudgeted**: soma dos valores de materiais

#### 3. Modificar o componente `CostCard` para suportar modo de planejamento

Adicionar props ao `CostCard`:
```tsx
interface CostCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  plannedValue: number;
  actualValue: number;
  isTotal?: boolean;
  isPlanningMode?: boolean; // NOVO
  budgetedValue?: number;   // NOVO
}
```

Quando `isPlanningMode=true`:
- Exibir "Orçado:" com `budgetedValue`
- Exibir "Planejado:" com `plannedValue`
- Comparar planejado vs orçado ao invés de realizado vs planejado

#### 4. Adicionar Card de Margem

Criar novo componente ou card inline que mostra:
- **Valor do Contrato**: `project.total_value`
- **Custo Planejado Total**: soma de mão de obra + fornecedores + materiais
- **Margem Bruta**: contrato - custo
- **Margem %**: (margem / contrato) × 100

#### 5. Ajustar a lógica condicional

Utilizar o prop `isEditable` já passado para determinar o modo:
- `isEditable = true` → Modo Planejamento → Orçado vs Planejado
- `isEditable = false` → Modo Execução → Planejado vs Realizado

---

## Cálculo dos Custos Orçados

```typescript
const budgetedCosts = useMemo(() => {
  if (!budget) return { labor: 0, suppliers: 0, materials: 0, total: 0 };
  
  // Mão de obra: soma de horas × tarifa para cada papel
  const labor = budget.roles.reduce((acc, role) => {
    const roleHours = role.months.reduce((h, m) => h + m.hours, 0);
    return acc + roleHours * role.hourly_rate;
  }, 0);
  
  // Fornecedores: valor mensal × duração
  const suppliers = budget.suppliers.reduce((acc, s) => 
    acc + s.monthly_value * budget.duration_months, 0);
  
  // Materiais: soma simples
  const materials = budget.materials.reduce((acc, m) => 
    acc + m.value, 0);
  
  return { labor, suppliers, materials, total: labor + suppliers + materials };
}, [budget]);
```

---

## Cálculo da Margem

```typescript
const marginData = useMemo(() => {
  const contractValue = project.total_value;
  const totalPlannedCost = laborCostsPlanned + supplierCostsPlanned + materialCostsPlanned;
  const grossMargin = contractValue - totalPlannedCost;
  const marginPercent = contractValue > 0 ? (grossMargin / contractValue) * 100 : 0;
  
  return { contractValue, totalPlannedCost, grossMargin, marginPercent };
}, [project.total_value, laborCostsPlanned, supplierCostsPlanned, materialCostsPlanned]);
```

---

## Resumo das Alterações

| Alteração | Descrição |
|-----------|-----------|
| Novo modo de exibição | Orçado vs Planejado para projetos em planejamento |
| Card de Margem | Novo card mostrando margem bruta e percentual |
| Props do CostCard | Adicionar `isPlanningMode` e `budgetedValue` |
| Cálculos orçados | Derivar custos do orçamento vinculado |
| Grid de 5 colunas | Layout expandido para incluir margem |

---

## Resultado Esperado

1. **Em Planejamento**: Cards mostram Orçado vs Planejado + Card de Margem
2. **Em Execução**: Cards mostram Planejado vs Realizado (comportamento atual)
3. **Margem visível**: Usuário não precisa mudar de aba para ver a margem
