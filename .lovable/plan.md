
# Plano: Corrigir Overflow da Tabela (Solução Definitiva)

## Problema Raiz

O conteúdo da tabela está vazando e sobrepondo o sidebar porque:

1. A tabela tem `min-w-max` (expande ao tamanho do conteúdo)
2. O container `overflow-x-auto` não tem restrição de largura máxima
3. O layout flexbox não está limitando a largura do conteúdo corretamente

## Solução

Aplicar `overflow-hidden` no container pai do conteúdo principal para garantir que o overflow seja contido corretamente, e adicionar restrições de largura adequadas.

---

## Alterações

### 1. Arquivo: `src/components/layout/AppLayout.tsx`

Adicionar `overflow-hidden` no container principal para evitar que conteúdo vaze:

**Linha 34:**
```tsx
// Antes:
<SidebarInset className="flex flex-col flex-1">

// Depois:
<SidebarInset className="flex flex-col flex-1 overflow-hidden">
```

**Linha 83-84:**
```tsx
// Antes:
<main className="flex-1 overflow-auto">
  <div className="container py-6 px-6">

// Depois:
<main className="flex-1 overflow-auto min-w-0">
  <div className="py-6 px-6 max-w-full">
```

A chave é:
- `overflow-hidden` no SidebarInset para conter elementos filhos
- `min-w-0` no main para permitir que flexbox reduza o tamanho
- Remover `container` e usar `max-w-full` para evitar largura fixa

### 2. Arquivo: `src/components/budgets/BudgetRolesEditor.tsx`

Adicionar restrição de largura máxima no container da tabela:

**Linha 144:**
```tsx
// Antes:
<div className="w-full overflow-x-auto">

// Depois:
<div className="w-full overflow-x-auto max-w-full">
```

---

## Detalhes Técnicos

| Local | Classe | Propósito |
|-------|--------|-----------|
| SidebarInset | `overflow-hidden` | Impede conteúdo de vazar para fora do container |
| main | `min-w-0` | Permite que flexbox comprima o elemento |
| div container | `max-w-full` | Garante largura máxima de 100% do pai |
| Remover `container` | - | A classe `container` tem largura máxima fixa que pode conflitar |

---

## Resultado Esperado

- A tabela terá scroll horizontal interno
- O conteúdo não vazará mais sobre o sidebar
- A experiência visual será consistente em todas as larguras de tela
