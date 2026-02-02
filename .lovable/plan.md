

# Plano: Corrigir Alinhamento dos Campos de Horas

## Problema Identificado

Na tabela de Mao de Obra, os campos de input para horas de cada mes estao desalinhados em relacao aos cabecalhos "Mes 1", "Mes 2", etc.

### Causa Raiz

O `TableCell` que contem o input usa apenas `className="p-1"`, sem nenhum mecanismo de centralizacao. O input tem largura fixa `w-20` (80px), mas nao esta centralizado dentro da celula.

```tsx
// Codigo atual (linha 189)
<TableCell key={m} className="p-1">
  <Input ... className="h-8 w-20 text-center ..." />
</TableCell>
```

### Comparacao com Cabecalho

O cabecalho usa `text-center`:
```tsx
<TableHead key={m} className="min-w-[80px] text-center">
  Mes {m}
</TableHead>
```

## Solucao

Adicionar centralizacao no `TableCell` usando flexbox para garantir que o input fique centralizado:

```tsx
// Corrigido
<TableCell key={m} className="p-1">
  <div className="flex justify-center">
    <Input ... className="h-8 w-20 text-center ..." />
  </div>
</TableCell>
```

Ou alternativamente, usar classes de alinhamento diretamente na celula:

```tsx
<TableCell key={m} className="p-1 text-center">
  <Input ... className="h-8 w-20 text-center mx-auto ..." />
</TableCell>
```

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/budgets/BudgetRolesEditor.tsx` | Adicionar centralizacao no TableCell dos inputs de horas (linha 189) |

## Alteracao Tecnica

Na linha 189, mudar de:

```tsx
<TableCell key={m} className="p-1">
  <Input
    type="number"
    min={0}
    className="h-8 w-20 text-center [appearance:textfield] ..."
```

Para:

```tsx
<TableCell key={m} className="p-1 text-center">
  <Input
    type="number"
    min={0}
    className="h-8 w-20 text-center mx-auto [appearance:textfield] ..."
```

A adicao de `text-center` na celula e `mx-auto` no input garantira que o campo fique perfeitamente centralizado abaixo do cabecalho "Mes X".

## Resultado Visual Esperado

| Antes | Depois |
|-------|--------|
| Input alinhado a esquerda da celula | Input centralizado sob o cabecalho |

