

## Plano: Adicionar coluna de percentual e melhorar edição de comissões

### Problema
1. Não há coluna de percentual na tabela -- o % é fixo do orçamento, mas o usuário quer poder variar mês a mês
2. Não é possível editar valor/percentual ao pagar ou após pagamento
3. Precisa de botão "Editar" além do "Pagar"/"Desfazer"

### Mudanças

**1. Migration SQL** -- adicionar coluna `commission_percent` à tabela `project_commissions`
```sql
ALTER TABLE project_commissions ADD COLUMN commission_percent numeric NOT NULL DEFAULT 0;
-- Populate existing rows from budget
UPDATE project_commissions pc
SET commission_percent = b.commission_percent
FROM projects p JOIN budgets b ON b.id = p.budget_id
WHERE p.id = pc.project_id;
```

**2. `src/hooks/useProjectCommissions.ts`**
- Adicionar `commission_percent` ao tipo `ProjectCommission`
- Incluir `commission_percent` no `useGenerateCommissions` (salvar o % do budget em cada row)
- Incluir `commission_percent` no `useUpdateCommission`

**3. `src/components/projects/detail/ProjectCommissionsSection.tsx`**
- Adicionar coluna "%" na tabela entre "Status Parcela" e "Comissão"
- Mostrar o percentual de cada linha (ex: "5%")
- Reformular dialog de pagamento para incluir campos editáveis de **percentual** e **valor** (mudar um recalcula o outro com base no valor da parcela)
- Adicionar botão "Editar" (ícone Pencil) na coluna Ação para comissões já pagas ou pendentes, abrindo o mesmo dialog em modo edição
- No dialog: campos Percentual (%), Valor (R$), Pago a, Data Pgto -- ao alterar % recalcula valor e vice-versa
- Remover inline editing (click-to-edit na célula) em favor do dialog unificado

### Arquivos alterados
1. Migration SQL (nova coluna `commission_percent`)
2. `src/hooks/useProjectCommissions.ts`
3. `src/components/projects/detail/ProjectCommissionsSection.tsx`

