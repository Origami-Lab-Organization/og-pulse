

# Plano: Ajustar Regras de Configuracao Financeira nos Orcamentos

## Problema

Atualmente, os percentuais financeiros nos orcamentos nao seguem as regras de negocio desejadas:
- Despesas administrativas e impostos podem ser alterados (deveriam ser fixos)
- Comissao pode exceder o maximo configurado
- Margem liquida pode ser menor que o minimo configurado
- Ao alterar configuracoes, orcamentos existentes perdem seus valores originais

---

## Regras de Negocio

| Campo | Editavel no Orcamento? | Regra |
|-------|------------------------|-------|
| Despesas Administrativas | Nao | Valor fixo definido pelo admin |
| Impostos | Nao | Valor fixo definido pelo admin |
| Comissao | Sim | Minimo: 0%, Maximo: valor configurado |
| Margem Liquida | Sim | Minimo: valor configurado, Maximo: 100% |

---

## 1. Migracao de Banco de Dados

### Adicionar coluna `net_margin_percent` na tabela `budgets`

A tabela `budgets` precisa armazenar a margem liquida como snapshot para preservar o valor definido no momento da criacao do orcamento.

```sql
ALTER TABLE budgets 
ADD COLUMN net_margin_percent numeric NOT NULL DEFAULT 0;
```

---

## 2. Alteracoes no Frontend

### 2.1 Componente: `BudgetFinancialSummary.tsx`

Ajustar para que:
- Despesas Administrativas: exibir apenas como texto (sem input)
- Impostos: exibir apenas como texto (sem input)
- Comissao: input com `min={0}` e `max={maxCommissionPercent}`
- Margem Liquida: input com `min={minNetMarginPercent}` e `max={100}`

Adicionar nova prop `minNetMarginPercent` para definir o minimo.

### 2.2 Componente: `BudgetForm.tsx`

Quando for um novo orcamento:
- Inicializar `commissionPercent` com 0 (ou valor padrao)
- Inicializar `netMarginPercent` com o valor configurado nas configuracoes financeiras (minimo)

Quando for edicao:
- Usar os valores armazenados no snapshot do orcamento
- Aplicar as mesmas regras de min/max

Ao salvar:
- Enviar os valores de snapshot para o backend (admin_expenses, taxes, commission, net_margin)

### 2.3 Service: `budgetService.ts`

Atualizar o `create` e `update` para:
- Salvar `net_margin_percent` na tabela `budgets`
- Garantir que os valores de percentuais sejam preservados como snapshot

---

## 3. Detalhes Tecnicos

### Tipos atualizados: `src/types/budget.ts`

Adicionar `net_margin_percent` ao `BudgetDB`:

```typescript
export interface BudgetDB {
  // ... campos existentes ...
  net_margin_percent: number; // NOVO
}
```

### Props atualizadas: `BudgetFinancialSummary.tsx`

```typescript
interface BudgetFinancialSummaryProps {
  calculation: BudgetCalculation;
  adminExpensesPercent: number;
  taxesPercent: number;
  commissionPercent: number;
  maxCommissionPercent: number;
  netMarginPercent: number;
  minNetMarginPercent: number; // NOVO
  discountPercent: number;
  onCommissionChange: (value: number) => void;
  onNetMarginChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
}
```

### Logica de validacao no formulario

```typescript
// Comissao: min 0, max configurado
const handleCommissionChange = (value: number) => {
  const clamped = Math.max(0, Math.min(value, maxCommissionPercent));
  setCommissionPercent(clamped);
};

// Margem Liquida: min configurado, max 100
const handleNetMarginChange = (value: number) => {
  const clamped = Math.max(minNetMarginPercent, Math.min(value, 100));
  setNetMarginPercent(clamped);
};
```

---

## 4. Fluxo de Dados

### Novo Orcamento

```text
1. Carregar financial_settings do tenant
2. Valores fixos (snapshot):
   - adminExpensesPercent = settings.admin_expenses_percent
   - taxesPercent = settings.taxes_percent
3. Valores editaveis com limites:
   - commissionPercent = 0 (pode ir ate settings.commission_percent)
   - netMarginPercent = settings.net_margin_percent (minimo, pode aumentar)
4. Ao salvar, todos os 4 valores sao gravados na tabela budgets
```

### Edicao de Orcamento

```text
1. Carregar orcamento existente
2. Usar valores do snapshot do orcamento (NAO recarregar settings!)
3. Limites de edicao baseados nos valores originais:
   - maxCommissionPercent = budget.commission_percent (valor original maximo)
   - minNetMarginPercent = budget.net_margin_percent (valor original minimo)
4. Usuario so pode ajustar dentro desses limites
```

**Nota importante:** Para edicao, os limites sao baseados nos valores originais do orcamento, nao nas configuracoes atuais. Isso preserva a integridade do orcamento mesmo se as configuracoes mudarem.

---

## 5. Alteracao na Visualizacao (BudgetDetail.tsx)

Atualizar para exibir `net_margin_percent` do orcamento ao inves de usar 0:

```typescript
return calculateBudgetTotals(
  roles,
  materials,
  suppliers,
  budget.duration_months,
  budget.admin_expenses_percent,
  budget.taxes_percent,
  budget.commission_percent,
  budget.net_margin_percent, // Usar valor do orcamento
  budget.discount_percent
);
```

---

## Resumo das Alteracoes

| Tipo | Arquivo | Descricao |
|------|---------|-----------|
| Database | Migration SQL | Adicionar coluna `net_margin_percent` em `budgets` |
| Modificar | `src/types/budget.ts` | Adicionar `net_margin_percent` no `BudgetDB` |
| Modificar | `src/components/budgets/BudgetFinancialSummary.tsx` | Tornar Desp. Adm e Impostos read-only, adicionar prop `minNetMarginPercent` |
| Modificar | `src/pages/BudgetForm.tsx` | Aplicar regras de min/max, inicializar valores corretamente |
| Modificar | `src/pages/BudgetDetail.tsx` | Usar `net_margin_percent` do orcamento |
| Modificar | `src/services/budgetService.ts` | Salvar `net_margin_percent` no create/update |

