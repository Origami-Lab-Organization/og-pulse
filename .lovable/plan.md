

# Plano: Corrigir Bug de Timezone na Exibicao de Datas

## Problema Identificado

Quando uma data como `"2025-01-15"` e retornada do banco de dados, o JavaScript interpreta como meia-noite UTC (`2025-01-15T00:00:00Z`). Ao converter para o fuso horario do Brasil (UTC-3), a data exibida fica um dia antes (`14/01/2025`).

### Exemplo do Bug

```text
Data no banco:     2025-01-15
Interpretacao JS:  2025-01-15T00:00:00Z (meia-noite UTC)
Conversao Brasil:  2025-01-14T21:00:00 (UTC-3)
Data exibida:      14/01/2025  <-- ERRADO!
```

---

## Solucao

Ao receber uma string de data no formato `YYYY-MM-DD`, devemos interpreta-la como data LOCAL (nao UTC). Para isso, basta adicionar `T00:00:00` a string antes de criar o objeto Date, ou usar uma funcao que parse os componentes da data diretamente.

---

## Alteracoes Necessarias

### Arquivo: `src/lib/formatters.ts`

Modificar a funcao `formatDate` para tratar corretamente datas no formato `YYYY-MM-DD`:

```typescript
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  if (typeof date === 'string') {
    // Se a data vier no formato YYYY-MM-DD (sem horario),
    // interpretar como data local, nao UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    }
    return new Date(date).toLocaleDateString('pt-BR');
  }
  
  return date.toLocaleDateString('pt-BR');
}

export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  if (typeof date === 'string') {
    // Mesmo tratamento para datas no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short' 
      });
    }
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
```

### Arquivo: `src/components/employees/EmployeesTable.tsx`

Atualizar para usar a funcao `formatDate` do `formatters.ts` em vez de fazer a conversao manualmente:

```typescript
// Adicionar import
import { formatDate } from '@/lib/formatters';

// Na celula de dataAdmissao (linha 165-173)
cell: ({ row }) => {
  const date = row.getValue('dataAdmissao') as string;
  if (!date) return <span className="text-muted-foreground">-</span>;
  return <span className="text-sm">{formatDate(date)}</span>;
},
```

### Arquivo: `src/components/clients/ClientsTable.tsx`

Mesma correcao para consistencia:

```typescript
// Adicionar import
import { formatDate } from '@/lib/formatters';

// Na celula que exibe data, usar formatDate(date)
```

---

## Logica da Correcao

| Entrada | Antes (Bug) | Depois (Correto) |
|---------|-------------|------------------|
| `"2025-01-15"` | 14/01/2025 | 15/01/2025 |
| `"2025-06-20"` | 19/06/2025 | 20/06/2025 |
| `"2025-12-31"` | 30/12/2025 | 31/12/2025 |

A funcao `new Date(year, month - 1, day)` cria a data no fuso horario LOCAL do navegador, evitando a conversao de UTC.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/formatters.ts` | Corrigir funcoes `formatDate` e `formatShortDate` para tratar datas `YYYY-MM-DD` como locais |
| `src/components/employees/EmployeesTable.tsx` | Usar `formatDate` importado |
| `src/components/clients/ClientsTable.tsx` | Usar `formatDate` importado (consistencia) |

---

## Criterios de Aceite

1. A data de admissao exibida na lista de funcionarios corresponde exatamente a data cadastrada
2. Nenhuma data aparece com "um dia antes"
3. A correcao funciona para qualquer fuso horario do Brasil

