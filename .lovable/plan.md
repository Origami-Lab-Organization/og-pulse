
# Plano: Ajustes na Aba de Custos do Planejamento de Projetos

## Resumo das Alterações

O usuário solicitou duas modificações:

1. **Fornecedores inline** - Remover o modal de adição e usar edição inline na tabela (mesmo padrão da Alocação de Equipe)
2. **Margem Líquida Planejada** - Calcular margem líquida real (receita - impostos - custos - despesas administrativas) e comparar orçado vs planejado

---

## Ajuste 1: Fornecedores com Edição Inline

### Comportamento Atual
- Clique em "Adicionar Fornecedor" abre um modal
- Modal tem dois modos: "Do Orçamento" e "Novo Fornecedor"
- Valores mensais são editados diretamente na tabela após criação

### Comportamento Desejado
- Clique em "Adicionar Fornecedor" insere uma nova linha na tabela
- A linha contém: Select de fornecedor + inputs de valores mensais
- Ações na coluna final: Lápis (editar), Salvar (check), Cancelar (X), Excluir (lixeira)
- Mesmo padrão da `ProjectLaborSection`

### Fluxo de Adição Inline

1. Usuário clica em "Adicionar Fornecedor"
2. Nova linha aparece no topo/final da tabela com:
   - **Coluna Fornecedor**: Select rico para escolher fornecedor (do orçamento ou cadastro)
   - **Colunas de Mês**: Inputs vazios para valores mensais
   - **Coluna Ações**: Botões Salvar (Check) e Cancelar (X)
3. Ao selecionar fornecedor do orçamento, valores são pré-preenchidos
4. Ao clicar Salvar: cria o registro e exibe linha normal
5. Ao clicar Cancelar: remove a linha temporária

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Refatorar para inline editing |

### Implementação Técnica

**Estados a adicionar:**
- `isAddingNew: boolean` - Indica se está em modo de adição
- `newSupplierData: { supplierId, budgetSupplierId, name, description }` - Dados da linha nova
- `editingRowId: string | null` - ID da linha sendo editada (similar ao `editingHoursMemberId`)

**UI da linha de adição:**
```text
┌─────────────────────┬─────────┬─────────┬─────────┬────────┬─────────┐
│ [Select Fornecedor] │ [Input] │ [Input] │ [Input] │ [Soma] │ ✓ X     │
│   Do orçamento ou   │  Mês 1  │  Mês 2  │  Mês 3  │ Total  │ Salvar  │
│   cadastro central  │         │         │         │        │ Cancel  │
└─────────────────────┴─────────┴─────────┴─────────┴────────┴─────────┘
```

**Select Rico:**
- Agrupa itens: "Do Orçamento" (se houver) e "Cadastro de Fornecedores"
- Exibe nome e valor mensal orçado lado a lado
- Ao selecionar do orçamento, preenche valores iniciais

---

## Ajuste 2: Margem Líquida Planejada (Orçado vs Planejado)

### Comportamento Atual
- `MarginCard` mostra "Margem Planejada" = Contrato - Custo Total Planejado
- Esta é a **margem bruta** (antes de impostos/despesas)
- Não mostra comparação com o orçamento

### Comportamento Desejado
- Calcular **margem líquida**: `Receita - Impostos - Custo Total - Despesas Administrativas`
- Mostrar orçado vs planejado (duas linhas)
- Usar percentuais de impostos e despesas adm do orçamento vinculado

### Fórmula de Cálculo

**Margem Líquida = Receita Líquida - Custo Total**

Onde:
```
Receita Líquida = Valor do Contrato - Impostos - Despesas Adm - Comissão
Impostos = Contrato × (taxes_percent / 100)
Despesas Adm = Contrato × (admin_expenses_percent / 100)
Comissão = Contrato × (commission_percent / 100)
```

**Margem Líquida Planejada:**
```
Receita Líquida - (Custo Mão de Obra Planejado + Custo Fornecedores Planejado + Custo Materiais Planejado)
```

**Margem Líquida Orçada:**
```
Receita Líquida - (Custo Mão de Obra Orçado + Custo Fornecedores Orçado + Custo Materiais Orçado)
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/projects/detail/ProjectCostsTab.tsx` | Atualizar `MarginCard` com nova fórmula |

### Atualização do MarginCard

```typescript
interface MarginCardProps {
  contractValue: number;
  totalPlannedCost: number;
  totalBudgetedCost: number;
  taxesPercent: number;
  adminExpensesPercent: number;
  commissionPercent: number;
}

function MarginCard({ 
  contractValue, 
  totalPlannedCost, 
  totalBudgetedCost,
  taxesPercent, 
  adminExpensesPercent,
  commissionPercent 
}: MarginCardProps) {
  // Deduções da receita
  const taxes = contractValue * (taxesPercent / 100);
  const adminExpenses = contractValue * (adminExpensesPercent / 100);
  const commission = contractValue * (commissionPercent / 100);
  const netRevenue = contractValue - taxes - adminExpenses - commission;
  
  // Margens líquidas
  const netMarginPlanned = netRevenue - totalPlannedCost;
  const netMarginBudgeted = netRevenue - totalBudgetedCost;
  
  // Percentuais
  const plannedPercent = contractValue > 0 ? (netMarginPlanned / contractValue) * 100 : 0;
  const budgetedPercent = contractValue > 0 ? (netMarginBudgeted / contractValue) * 100 : 0;
  
  // ...render com duas linhas: Planejado e Orçado
}
```

### UI do MarginCard Atualizado

```text
┌────────────────────────────────────────┐
│ 💰 Margem Líquida                      │
│                                        │
│ Planejada: R$ 25.000,00                │
│            de R$ 30.000,00 (orçado)    │
│                                        │
│ ↘ 83% (do orçado)                      │
└────────────────────────────────────────┘
```

---

## Resumo de Alterações por Arquivo

| Arquivo | Mudanças |
|---------|----------|
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Remover Dialog de adição; Adicionar estados `isAddingNew`, `newSupplierData`, `editingRowId`; Criar linha de adição inline com Select rico; Implementar ações Salvar/Cancelar/Editar/Excluir como em Labor |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Atualizar `MarginCard` para calcular margem líquida; Passar percentuais do orçamento; Mostrar comparação orçado vs planejado |

---

## Considerações Técnicas

1. **Debounce nos inputs de valores**: Manter padrão de 500ms já usado na seção de Mão de Obra
2. **Select Rico**: Usar `SelectContent` com `min-width` expandido para exibir metadados
3. **Linha de adição**: Usar estado local antes de persistir (só salva ao clicar Check)
4. **Percentuais do orçamento**: Obter de `budget.taxes_percent`, `budget.admin_expenses_percent`, `budget.commission_percent`
5. **Fallback**: Se projeto não tiver orçamento vinculado, usar percentuais 0 ou buscar das configurações financeiras globais
