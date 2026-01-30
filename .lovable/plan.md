
# Plano: Melhorias no Módulo de Orçamentos

## Visao Geral

Implementar 6 melhorias significativas no fluxo de criação e edição de orçamentos, incluindo nova experiência de wizard, campos de fornecedores, e nova formula de markup.

---

## 1. Validade Automatica (Data Inicio + 30 dias)

### Arquivo: `src/pages/BudgetForm.tsx`

**Comportamento:**
- Ao alterar a data de inicio, calcular automaticamente validade = inicio + 30 dias
- Campo de validade permanece editavel para ajustes manuais
- Default inicial: hoje + 30 dias

**Alteracao:**
```tsx
// Adicionar useEffect para recalcular validade quando startDate mudar
const startDate = form.watch('startDate');

useEffect(() => {
  if (!isEditing && startDate) {
    const newValidUntil = format(addDays(new Date(startDate), 30), 'yyyy-MM-dd');
    form.setValue('validUntil', newValidUntil);
  }
}, [startDate, isEditing]);
```

---

## 2. Duracao Padrao de 6 Meses

### Arquivo: `src/pages/BudgetForm.tsx`

**Linha 74:**
```tsx
// Antes:
durationMonths: 3,

// Depois:
durationMonths: 6,
```

---

## 3. Wizard para Criacao (Tabs para Edicao)

### Arquivo: `src/pages/BudgetForm.tsx`

**Nova estrutura condicional:**

| Modo | Interface |
|------|-----------|
| Criacao (`!isEditing`) | Wizard com etapas sequenciais e botoes "Anterior/Proximo" |
| Edicao (`isEditing`) | Abas (Tabs) como esta hoje |

**Componentes do Wizard:**
- Indicador de passos no topo (1. Dados Basicos -> 2. Mao de Obra -> 3. Fornecedores -> 4. Materiais -> 5. Resumo)
- Estado `currentStep` para controlar o passo atual
- Validacao antes de avancar para o proximo passo
- Botoes "Anterior" e "Proximo" na parte inferior
- Botao "Criar Orcamento" apenas no ultimo passo

---

## 4. Linha de Total na Mao de Obra

### Arquivo: `src/components/budgets/BudgetRolesEditor.tsx`

**Adicionar apos a TableBody:**
```tsx
<tfoot className="bg-muted/50 font-medium">
  <tr>
    <td className="sticky left-0 bg-muted/50 z-10 p-2">Total Mao de Obra</td>
    <td className="p-2 text-right">-</td>
    {months.map((m) => (
      <td key={m} className="p-2 text-center">
        {roles.reduce((sum, r) => {
          const month = r.months.find(rm => rm.monthNumber === m);
          return sum + (month?.hours || 0);
        }, 0)}h
      </td>
    ))}
    <td className="p-2 text-center">{totalHours}h</td>
    <td className="p-2 text-right">{formatCurrency(totalValue)}</td>
    <td></td>
  </tr>
</tfoot>
```

**Calcular totais:**
```tsx
const totalHours = roles.reduce((sum, role) => sum + getRoleTotalHours(role), 0);
const totalValue = roles.reduce((sum, role) => sum + getRoleTotalValue(role), 0);
```

---

## 5. Nova Secao de Fornecedores

### Database: Nova tabela `budget_suppliers`

```sql
CREATE TABLE public.budget_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies similares a budget_materials
```

### Novos tipos: `src/types/budget.ts`

```tsx
export interface BudgetSupplierDB {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  created_at: string;
}

export interface BudgetSupplierInput {
  tempId: string;
  name: string;
  description: string;
  monthlyValue: number;
}
```

### Novo componente: `src/components/budgets/BudgetSuppliersEditor.tsx`

- Interface similar ao `BudgetMaterialsEditor`
- Campos: Nome do Fornecedor, Descricao, Valor Mensal
- Calculo: Valor Mensal x Duracao = Valor Total no Projeto

### Integracao:

- Adicionar no formulario entre Mao de Obra e Materiais
- Incluir no calculo financeiro (suppliersTotal)
- Atualizar `budgetService.ts` para salvar/carregar fornecedores

---

## 6. Nova Formula de Markup

### Conceito

A formula atual soma percentuais sobre o custo:
```
Preco = Custo + (Custo * %)
```

A nova formula usa markup divisor:
```
Preco = Custo / (1 - (impostos + desp_adm + comissao + margem))
```

### Database: Adicionar campo `net_margin_percent`

```sql
ALTER TABLE financial_settings 
ADD COLUMN net_margin_percent NUMERIC NOT NULL DEFAULT 0;
```

### Atualizar tipos e formularios

**`src/types/financialSettings.ts`:**
```tsx
export interface FinancialSettings {
  // ... campos existentes
  net_margin_percent: number;
}
```

**`src/components/settings/FinancialSettingsForm.tsx`:**
- Adicionar campo "Margem Liquida (%)"

### Nova funcao de calculo: `src/types/budget.ts`

```tsx
export function calculateBudgetWithMarkup(
  laborCost: number,
  suppliersTotal: number,
  materialsTotal: number,
  taxesPercent: number,
  adminExpensesPercent: number,
  commissionPercent: number,
  netMarginPercent: number,
  discountPercent: number
): BudgetCalculation {
  const totalCost = laborCost + suppliersTotal + materialsTotal;
  
  const totalPercentages = (taxesPercent + adminExpensesPercent + commissionPercent + netMarginPercent) / 100;
  
  // Formula markup: Preco = Custo / (1 - soma_percentuais)
  const markupDivisor = 1 - totalPercentages;
  const sellingPrice = markupDivisor > 0 ? totalCost / markupDivisor : totalCost;
  
  // Detalhar cada componente
  const taxes = sellingPrice * (taxesPercent / 100);
  const adminExpenses = sellingPrice * (adminExpensesPercent / 100);
  const commission = sellingPrice * (commissionPercent / 100);
  const netMargin = sellingPrice * (netMarginPercent / 100);
  
  // Desconto aplica sobre preco de venda
  const discount = sellingPrice * (discountPercent / 100);
  const finalTotal = sellingPrice - discount;
  
  return {
    laborCost,
    suppliersTotal,
    materialsTotal,
    totalCost,
    taxes,
    adminExpenses,
    commission,
    netMargin,
    sellingPrice,
    discount,
    finalTotal
  };
}
```

### Atualizar Resumo Financeiro

**`src/components/budgets/BudgetFinancialSummary.tsx`:**

Novo layout mostrando:
1. **Custo Total** (Mao de Obra + Fornecedores + Materiais)
2. Impostos (calculados sobre preco de venda)
3. Despesas Administrativas
4. Comissao
5. Margem Liquida
6. **Preco de Venda** (resultado do markup)
7. Desconto (se houver)
8. **Valor Final**

---

## Resumo das Alteracoes

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/pages/BudgetForm.tsx` | Modificar | Wizard para criacao, duracao 6 meses, validade auto |
| `src/components/budgets/BudgetRolesEditor.tsx` | Modificar | Adicionar linha de totais |
| `src/components/budgets/BudgetSuppliersEditor.tsx` | Novo | Editor de fornecedores |
| `src/components/budgets/BudgetFinancialSummary.tsx` | Modificar | Nova formula markup |
| `src/types/budget.ts` | Modificar | Tipos fornecedores, nova funcao calculo |
| `src/types/financialSettings.ts` | Modificar | Adicionar margem liquida |
| `src/services/budgetService.ts` | Modificar | CRUD fornecedores |
| `src/services/financialSettingsService.ts` | Modificar | Campo margem liquida |
| `src/components/settings/FinancialSettingsForm.tsx` | Modificar | Campo margem liquida |
| Database migration | SQL | Tabela budget_suppliers, campo net_margin_percent |

---

## Detalhes Tecnicos

### Estrutura do Wizard

```
Estado: currentStep (1-5)

Passo 1: Dados Basicos
  - Titulo, Cliente/Lead, Datas, Duracao

Passo 2: Mao de Obra
  - BudgetRolesEditor com linha de total

Passo 3: Fornecedores
  - BudgetSuppliersEditor (novo)

Passo 4: Materiais
  - BudgetMaterialsEditor

Passo 5: Resumo Financeiro
  - BudgetFinancialSummary com nova formula
  - Botao "Criar Orcamento"
```

### Validacoes por Passo

| Passo | Validacao |
|-------|-----------|
| 1 | Titulo obrigatorio, Cliente ou Lead, Data inicio |
| 2 | Pelo menos 1 papel com horas > 0 (opcional) |
| 3 | Nenhuma obrigatoria |
| 4 | Nenhuma obrigatoria |
| 5 | Nenhuma |
