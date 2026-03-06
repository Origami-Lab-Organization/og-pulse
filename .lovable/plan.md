

## Plano: Corrigir cálculo de comissão e melhorar edição

### Problemas identificados

1. **Valor incorreto**: A comissão está sendo calculada como `commission_percent * final_total` (preço com desconto), mas no orçamento é calculada como `commission_percent * sellingPrice` (preço de venda antes do desconto = `total_with_fees`). Ex: 5% × R$225.000 = R$11.250 (correto), mas está calculando 5% × R$175.000 = R$8.750 (errado).

2. **Não permite editar valores**: Quando comissões já existem, não há como alterar o `planned_value` de cada parcela.

3. **Falta percentual no header**: A seção de comissões não mostra qual percentual foi usado.

### Mudanças

**`src/components/projects/detail/ProjectCostsTab.tsx`**
- Trocar `budget.final_total` por `budget.total_with_fees` no cálculo de `totalCommissionValue`
- Passar `budget.total_with_fees` ao invés de `budget.final_total` para o `ProjectCommissionsSection`

**`src/components/projects/detail/ProjectCommissionsSection.tsx`**
- Receber `total_with_fees` ao invés de `final_total` no budget prop
- Mostrar o percentual no header: "Comissões (5%)"
- Tornar a coluna "Comissão" editável (inline input) quando `isEditable = true`
- Ao salvar valor editado, chamar `useUpdateCommission` com o novo `planned_value`

**`src/hooks/useProjectCommissions.ts`**
- Permitir atualizar `planned_value` no `useUpdateCommission`

**Migration SQL**
- Recalcular os `planned_value` existentes usando `total_with_fees` ao invés de `final_total`

### Arquivos alterados
1. Migration SQL (recalcular valores existentes)
2. `src/hooks/useProjectCommissions.ts`
3. `src/components/projects/detail/ProjectCommissionsSection.tsx`
4. `src/components/projects/detail/ProjectCostsTab.tsx`

