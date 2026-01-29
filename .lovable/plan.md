
# Plano: Ajustes na Tela de Orçamento

## Objetivo

Implementar 4 correções na página de criação/edição de orçamentos para melhorar a usabilidade.

---

## Alterações

### 1. Renomear aba "Alocação" para "Mão de Obra"

**Arquivo:** `src/pages/BudgetForm.tsx`

Alterar linha 179:
- De: `<TabsTrigger value="roles">Alocação</TabsTrigger>`
- Para: `<TabsTrigger value="roles">Mão de Obra</TabsTrigger>`

---

### 2. Remover coluna duplicada de Senioridade

**Arquivo:** `src/components/budgets/BudgetRolesEditor.tsx`

A senioridade já aparece no dropdown (ex: "Consultor de Inovação (Sênior)"), então a coluna separada é redundante.

**Remover:**
- Linha 150: `<TableHead className="min-w-[100px]">Senioridade</TableHead>`
- Linhas 182-184: A célula que exibe a senioridade separadamente

Isso também libera espaço horizontal, resolvendo parte do problema de overflow.

---

### 3. Ajustar título da seção interna

**Arquivo:** `src/components/budgets/BudgetRolesEditor.tsx`

Alterar linha 130:
- De: `<h3 className="text-lg font-medium">Alocação de Papéis</h3>`
- Para: `<h3 className="text-lg font-medium">Mão de Obra</h3>`

---

### 4. Ocultar setas de incremento nos inputs de horas

**Arquivo:** `src/components/budgets/BudgetRolesEditor.tsx`

Adicionar classe CSS para remover spinners nativos do input type="number":

```tsx
className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
```

---

## Detalhes Técnicos

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/pages/BudgetForm.tsx` | 179 | Renomear tab "Alocação" → "Mão de Obra" |
| `src/components/budgets/BudgetRolesEditor.tsx` | 130 | Renomear título "Alocação de Papéis" → "Mão de Obra" |
| `src/components/budgets/BudgetRolesEditor.tsx` | 150 | Remover header "Senioridade" |
| `src/components/budgets/BudgetRolesEditor.tsx` | 182-184 | Remover célula de senioridade |
| `src/components/budgets/BudgetRolesEditor.tsx` | 195 | Adicionar classes para ocultar spinners |

---

## Resultado Esperado

- Aba renomeada para "Mão de Obra"
- Tabela mais compacta sem coluna duplicada de senioridade
- Senioridade visível apenas no dropdown de seleção do papel
- Inputs de horas sem setas de incremento/decremento
