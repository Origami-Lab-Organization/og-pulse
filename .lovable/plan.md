

## Problema

Atualmente, o sistema impede que qualquer usuário (incluindo admins) defina a margem líquida abaixo do mínimo configurado nas configurações financeiras. O campo `onBlur` força `Math.max(minNetMarginPercent, ...)` e a verificação de margem baixa (`isMarginBelowMinimum`) só dispara quando `discountValue > 0`.

O comportamento desejado:
1. **Admin** pode definir a margem líquida abaixo do mínimo diretamente (com confirmação via checkbox)
2. **Não-admin** pode salvar com margem abaixo do mínimo, mas envia para aprovação do admin
3. A verificação deve considerar a margem efetiva (que já inclui desconto) independentemente de haver desconto explícito

## Mudanças

### 1. Remover trava do campo de margem líquida (BudgetForm.tsx)

**Linha ~949** — O `onBlur` atualmente força o valor mínimo:
```tsx
onBlur={(e) => setNetMarginPercent(Math.max(minNetMarginPercent, ...))}
```
Mudar para permitir valores abaixo do mínimo:
```tsx
onBlur={(e) => setNetMarginPercent(Math.max(0, Math.min(parseFloat(e.target.value) || 0, 100)))}
```

Também remover `min={minNetMarginPercent}` do input e usar `min={0}`.

### 2. Corrigir condição `isMarginBelowMinimum` (BudgetForm.tsx)

**Linha ~293** — Remover `&& discountValue > 0`:
```tsx
// De:
const isMarginBelowMinimum = billingType !== 'no_revenue' && billingType !== 'success_fee' 
  && calculation.effectiveMarginPercent < minNetMarginPercent && discountValue > 0;

// Para:
const isMarginBelowMinimum = billingType !== 'no_revenue' && billingType !== 'success_fee' 
  && calculation.effectiveMarginPercent < minNetMarginPercent;
```

Isso garante que a verificação funcione tanto quando a margem cai por desconto quanto quando o usuário define manualmente um `netMarginPercent` abaixo do mínimo.

### 3. Ajustar mensagem da notificação (BudgetForm.tsx)

**Linha ~321** — A mensagem atual menciona "desconto" explicitamente. Ajustar para ser mais genérica quando não houver desconto:
```
"A margem líquida efetiva do orçamento ficou em X% (mínimo: Y%). Aprovação necessária."
```

### 4. Ajustar InboxBudgetDetail (InboxBudgetDetail.tsx)

Exibir a margem líquida configurada pelo usuário nos metadados da notificação, além do desconto (que pode ser zero).

## Fluxo resultante

- **Admin editando orçamento**: pode digitar margem líquida < mínimo → aparece alerta com checkbox → confirma → salva diretamente
- **Não-admin editando orçamento**: pode digitar margem líquida < mínimo → aparece alerta informando que será enviado para aprovação → salva com `margin_override_pending = true` → notificação enviada aos admins
- **Admin na Inbox**: recebe notificação → pode aprovar ou rejeitar

Nenhuma migration é necessária — os campos `margin_override_approved` e `margin_override_pending` já existem na tabela `budgets`.

