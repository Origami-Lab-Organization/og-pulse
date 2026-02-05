
# Plano: Fornecedores com Comparação Orçado vs Planejado

## Problema Identificado

A seção de Fornecedores no planejamento de projeto:
1. Não permite selecionar fornecedores do cadastro central (apenas nome livre)
2. Não exibe a comparação "Orçado vs Planejado" como a seção de Mão de Obra faz
3. O rodapé mostra "Plan | Real" mas deveria mostrar valores do orçamento abaixo

## Estrutura Atual

```text
+------------------+--------+--------+--------+-------+--------+
| Nome             | Mês 1  | Mês 2  | Mês 3  | Total | Ações  |
+------------------+--------+--------+--------+-------+--------+
| Next Digital     | 16000  | 16000  | 16000  | 48000 |  x     |
+------------------+--------+--------+--------+-------+--------+
| Total            | R$ 16k | R$ 0   | ...    |       |        |
+------------------+--------+--------+--------+-------+--------+
```

## Nova Estrutura Visual

```text
+----------------------+----------+----------+----------+---------+--------+
| Fornecedor           | Mês 1    | Mês 2    | Mês 3    | Total   | Ações  |
+----------------------+----------+----------+----------+---------+--------+
| [Select Fornecedor]  | [16000]  | [16000]  | [16000]  | 48.000  |  -     |
| Serviço de Marketing |                                | 48.000  | (orç)  |
+----------------------+----------+----------+----------+---------+--------+
| Total                | 16.000   | 16.000   | 16.000   | 48.000  | Var%   |
|                      | 16.000   | 16.000   | 16.000   | 48.000  |        |
+----------------------+----------+----------+----------+---------+--------+
```

Onde:
- Linha superior: valores PLANEJADOS (editáveis)
- Linha inferior (cinza menor): valores ORÇADOS

---

## Alterações Técnicas

### 1. Adicionar props para fornecedores do orçamento e cadastro

**Arquivo:** `src/components/projects/detail/ProjectSuppliersSection.tsx`

Novas props necessárias:
```tsx
interface ProjectSuppliersSectionProps {
  projectId: string;
  suppliers: ProjectSupplierDB[];
  durationMonths: number;
  isEditable: boolean;
  canEditActuals?: boolean;
  supplierActuals?: ProjectSupplierActualDB[];
  budgetSuppliers: BudgetSupplierDB[];        // NOVO
  availableSuppliers: Supplier[];             // NOVO (do cadastro)
}
```

### 2. Modificar o CostsTab para passar as novas props

**Arquivo:** `src/components/projects/detail/ProjectCostsTab.tsx`

Importar:
- `useSuppliers` - para obter lista de fornecedores cadastrados
- Passar `budget?.suppliers || []` para o componente

### 3. Adaptar a coluna de Nome para incluir seletor

Quando `isEditable=true`:
- Exibir `Select` com fornecedores do cadastro
- Exibir nome do serviço abaixo (como o papel na seção de equipe)

### 4. Calcular e exibir dados orçados por fornecedor

Cada fornecedor do projeto pode ter um `budget_supplier_id` (opcional) que vincula ao item do orçamento.

Para cada fornecedor:
- Valor orçado por mês: `budget_supplier.monthly_value`
- Total orçado: `monthly_value × duration_months`

No rodapé:
- Somatório orçado por mês
- Indicador de variação (verde/vermelho)

### 5. Adicionar campo `budget_supplier_id` ao model (se não existir)

Verificar se a tabela `project_suppliers` já tem campo `budget_supplier_id`. Caso contrário, adicionar migração.

### 6. Modificar dialog de adição

Adicionar opção de:
1. Selecionar fornecedor do orçamento (herda nome e valor mensal)
2. Selecionar fornecedor do cadastro (apenas vincula)
3. Digitar nome livre (comportamento atual)

---

## Lógica de Comparação no Rodapé

```tsx
// Calcular totais orçados
const budgetTotals = useMemo(() => {
  const byMonth: Record<number, number> = {};
  let total = 0;
  
  months.forEach(m => {
    const monthValue = budgetSuppliers.reduce((sum, bs) => 
      sum + Number(bs.monthly_value), 0);
    byMonth[m] = monthValue;
    total += monthValue;
  });
  
  return { byMonth, total };
}, [budgetSuppliers, months]);

// Indicador de variação
const variation = useMemo(() => {
  if (budgetTotals.total === 0) return { percent: 0, isUnder: true };
  const diff = totals.totalPlanned - budgetTotals.total;
  return {
    percent: (diff / budgetTotals.total) * 100,
    isUnder: diff <= 0,
  };
}, [totals.totalPlanned, budgetTotals.total]);
```

---

## Exibição das Células (Modo Planejamento)

Cada célula de mês mostrará:

```tsx
{isInPlanningMode ? (
  <div className="flex flex-col gap-0.5 items-center">
    {/* Input ou valor planejado */}
    <Input type="number" value={plannedValue} ... />
    
    {/* Valor orçado abaixo (se existir) */}
    {budgetValueForMonth > 0 && (
      <span className="text-xs text-muted-foreground">
        {formatCurrency(budgetValueForMonth)}
      </span>
    )}
  </div>
) : (
  // Modo execução: Plan | Real
)}
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ProjectCostsTab.tsx` | Passar `budgetSuppliers` e `availableSuppliers` |
| `ProjectSuppliersSection.tsx` | Receber novas props, adicionar seletor de fornecedor, exibir comparação orçado vs planejado |
| `src/hooks/useProjectCosts.ts` | Adicionar suporte a `budget_supplier_id` |
| Migração SQL | Adicionar coluna `budget_supplier_id` à tabela `project_suppliers` |
| `src/types/project.ts` | Atualizar interface `ProjectSupplierDB` |

---

## Resultado Esperado

1. **Seletor de fornecedor**: Dropdown para escolher do cadastro central
2. **Herança de orçamento**: Ao adicionar de orçamento, herda valores mensais
3. **Comparação visual**: Linha abaixo mostra valor orçado
4. **Indicador de variação**: No rodapé, mostra % de diferença
5. **Consistência**: Mesmo padrão visual da seção de Mão de Obra
