
# Plano: Corrigir Overflow da Tabela de Mão de Obra

## Problema

O scroll horizontal da tabela de mão de obra está vazando para fora do container e sobrepondo o menu lateral esquerdo (sidebar). O `ScrollArea` do Radix não está contendo o conteúdo corretamente.

---

## Solução

Substituir o `ScrollArea` do Radix por um container simples com `overflow-x-auto`, que funciona melhor para scroll horizontal de tabelas.

---

## Alteração

### Arquivo: `src/components/budgets/BudgetRolesEditor.tsx`

**Antes (linhas 144-228):**
```tsx
<ScrollArea className="w-full">
  <div className="min-w-max">
    <Table>
      ...
    </Table>
  </div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

**Depois:**
```tsx
<div className="w-full overflow-x-auto">
  <Table className="min-w-max">
    ...
  </Table>
</div>
```

### Limpeza de Imports

Remover import não utilizado:
```tsx
// Remover:
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
```

---

## Detalhes Técnicos

| Alteração | Descrição |
|-----------|-----------|
| Remover `ScrollArea` | O componente Radix não está contendo o overflow corretamente |
| Usar `overflow-x-auto` | Solução nativa CSS que funciona melhor para tabelas |
| Mover `min-w-max` para Table | Garante que a tabela expanda conforme necessário |
| Remover import | Limpar código não utilizado |

---

## Resultado Esperado

A tabela terá scroll horizontal interno, sem vazar para o sidebar, mantendo a visualização correta mesmo com 6+ meses de colunas.
