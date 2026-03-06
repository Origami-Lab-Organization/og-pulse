

## Plano: Margem efetiva pós-desconto com validação e aprovação admin

### Problema
Hoje a margem líquida (`netMarginPercent`) é calculada sobre o preço de venda **antes** do desconto. Quando o usuário aplica um desconto, a margem efetiva sobre o valor final cai, podendo ficar abaixo do mínimo configurado (ex: 20%) sem qualquer alerta ou bloqueio.

### Solução

**1. Calcular e exibir a margem efetiva pós-desconto**

Em `src/types/budget.ts`, adicionar ao `BudgetCalculation`:
- `effectiveMarginPercent`: margem real calculada como `((finalTotal - totalCost - taxes - adminExpenses - commission) / finalTotal) * 100`

Na função `calculateBudgetTotals`, calcular esse valor após aplicar o desconto.

**2. Exibir margem efetiva no resumo financeiro**

Em `src/components/budgets/BudgetFinancialSummary.tsx`:
- Quando houver desconto, mostrar a "Margem Efetiva" ao lado/abaixo do valor final, com destaque visual (amarelo se próxima do mínimo, vermelho se abaixo).

**3. Limitar desconto pela margem mínima (soft block)**

Em `src/pages/BudgetForm.tsx`:
- Calcular o desconto máximo permitido que mantém a margem >= `minNetMarginPercent`
- Quando o desconto resultar em margem abaixo do mínimo:
  - Exibir alerta vermelho: "Margem efetiva ({X}%) abaixo do mínimo ({Y}%). Requer aprovação do administrador."
  - Bloquear o botão "Salvar" para usuários não-admin
  - Para admins, permitir salvar com um checkbox de confirmação explícita

**4. Flag de aprovação admin no orçamento**

Migração SQL para adicionar à tabela `budgets`:
- `margin_override_approved` (boolean, default false)
- `margin_override_approved_by` (uuid, nullable)
- `margin_override_approved_at` (timestamptz, nullable)

**5. Lógica de submit**

Em `src/pages/BudgetForm.tsx`:
- Se `effectiveMarginPercent < minNetMarginPercent` e usuário é admin: permitir salvar, gravando os campos de override
- Se `effectiveMarginPercent < minNetMarginPercent` e usuário **não** é admin: bloquear submit, mostrar mensagem orientando a solicitar aprovação ao admin

### Arquivos alterados
- `src/types/budget.ts` - adicionar `effectiveMarginPercent` ao `BudgetCalculation` e ao cálculo
- `src/components/budgets/BudgetFinancialSummary.tsx` - exibir margem efetiva com indicador visual
- `src/pages/BudgetForm.tsx` - validação de desconto vs margem, lógica admin
- `src/services/budgetService.ts` - salvar campos de override
- Migração SQL - 3 colunas novas na tabela `budgets`

### Detalhes técnicos

Fórmula da margem efetiva:
```text
margemEfetiva = ((valorFinal - custoTotal - impostos - despAdm - comissao) / valorFinal) * 100

onde valorFinal = precoDeVenda - desconto
```

Desconto máximo permitido (sem override):
```text
descontoMax = precoDeVenda - (custoTotal + impostos + despAdm + comissao) / (1 - minNetMarginPercent/100)
```

A verificação de admin usa `employee.isAdmin` do `AuthContext`, que já consulta a tabela `user_roles`.

