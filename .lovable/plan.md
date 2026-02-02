
# Plano: Exibir Datas de Validade do Orçamento

## Problema Identificado

Atualmente a tabela de orçamentos exibe apenas a "Duração" (em meses), mas não mostra as **datas de validade do orçamento** (`start_date` e `valid_until`) que foram preenchidas.

Os dados estão salvos corretamente no banco de dados, mas não estão sendo exibidos na interface.

## Alterações Propostas

### 1. Atualizar BudgetsTable.tsx

Substituir a coluna "Duração" por "Validade" exibindo o período:

**Antes:**
| Número | Título | Cliente/Lead | Duração | Valor Final | Status | Criado em |

**Depois:**
| Número | Título | Cliente/Lead | Validade | Valor Final | Status | Criado em |

Onde "Validade" exibirá: `01/10 - 30/10/2025` (formato resumido)

### 2. Atualizar KanbanCard.tsx

O card já exibe `valid_until`, mas pode mostrar o período completo no tooltip ou de forma mais clara.

### 3. Atualizar Labels no Formulário (BudgetForm.tsx)

Renomear os labels para deixar claro que são datas de validade do orçamento:

| Campo Atual | Novo Label |
|-------------|------------|
| Data de Início | Válido de |
| Duração (meses) | Duração do Projeto (meses) |
| Válido até | Válido até |

## Detalhes Técnicos

### Arquivo: src/components/budgets/BudgetsTable.tsx

```text
Linha 59: Alterar de "Duração" para "Validade"
Linha 86: Substituir exibição de duration_months por formatação do período start_date - valid_until
```

**Código da nova célula:**
```tsx
<TableCell>
  {budget.valid_until ? (
    <span className="text-sm">
      {formatShortDate(budget.start_date)} - {formatShortDate(budget.valid_until)}
    </span>
  ) : (
    <span className="text-sm text-muted-foreground">
      A partir de {formatShortDate(budget.start_date)}
    </span>
  )}
</TableCell>
```

### Arquivo: src/components/crm/KanbanCard.tsx

Manter exibição de `valid_until` como data final de validade, que já está implementada.

### Arquivo: src/pages/BudgetForm.tsx

Atualizar labels nos campos da Step 1:
- Linha 333: "Válido de" ao invés de "Data de Início"
- Linha 338: "Duração do Projeto (meses)" para clareza
- Linha 345: Manter "Válido até"

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/budgets/BudgetsTable.tsx` | Trocar coluna Duração por Validade com período formatado |
| `src/pages/BudgetForm.tsx` | Atualizar labels dos campos de data para clareza |
| `src/lib/formatters.ts` | Verificar se `formatShortDate` já existe (opcional) |

## Resultado Esperado

Na tabela de orçamentos, ao invés de ver "2 meses", o usuário verá:
- **Validade: 01/10 - 30/10** (formato curto)
- Ou **Validade: 01 out - 30 out** (usando formatShortDate)
