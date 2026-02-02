
# Plano: Corrigir Exibição de Datas de Validade do Orçamento

## Problema Identificado

As datas de validade do orçamento "Plataforma Bry" (01/10/2025 - 30/10/2025) não estão sendo exibidas corretamente. Isso ocorre porque:

1. **BudgetDetail.tsx** (linhas 195 e 202): Usa `new Date(budget.start_date)` diretamente com `format` do date-fns
2. Quando uma string `"2025-10-01"` é passada para `new Date()`, o JavaScript interpreta como UTC meia-noite
3. Em fusos horários brasileiros (UTC-3), isso resulta no dia anterior (30/09/2025 às 21:00)

Os dados no banco estão corretos:
- `start_date: "2025-10-01"`
- `valid_until: "2025-10-30"`

## Solução Proposta

Criar uma função auxiliar que converte strings `YYYY-MM-DD` para objetos Date de forma segura, mantendo a data local, e usá-la em todos os lugares que exibem datas.

## Alterações Necessárias

### 1. Criar função auxiliar em `src/lib/formatters.ts`

```text
Nova função: parseDateString(dateStr: string): Date
- Detecta strings no formato YYYY-MM-DD
- Converte para Date usando componentes separados (ano, mês, dia)
- Evita interpretação UTC
```

### 2. Atualizar `src/pages/BudgetDetail.tsx`

| Linha | Código Atual | Código Novo |
|-------|--------------|-------------|
| 195 | `format(new Date(budget.start_date), ...)` | `format(parseDateString(budget.start_date), ...)` |
| 202 | `format(new Date(budget.valid_until), ...)` | `format(parseDateString(budget.valid_until), ...)` |

### 3. Verificar consistência nos demais arquivos

- `BudgetsTable.tsx`: Já usa `formatShortDate` que trata corretamente
- `KanbanCard.tsx`: Verificar se usa a função correta

## Detalhes Técnicos

### Nova função em `src/lib/formatters.ts`:

```typescript
/**
 * Converte string de data YYYY-MM-DD para objeto Date
 * tratando como data local (não UTC)
 */
export function parseDateString(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}
```

### Atualização em `src/pages/BudgetDetail.tsx`:

```typescript
import { parseDateString } from '@/lib/formatters';

// Linha 195
{format(parseDateString(budget.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}

// Linha 202
{format(parseDateString(budget.valid_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
```

## Resultado Esperado

Após as alterações, a seção "Validade" exibirá:

```text
┌─────────────────────────────────────────────────────────┐
│ 📅 Validade                                             │
├─────────────────────────────────────────────────────────┤
│ Criação do Orçamento       Válido até                   │
│ 01 de outubro de 2025      30 de outubro de 2025        │
└─────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/formatters.ts` | Adicionar função `parseDateString` |
| `src/pages/BudgetDetail.tsx` | Usar `parseDateString` nas linhas 195 e 202 |
