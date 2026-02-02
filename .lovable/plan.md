

# Plano: Padronizar Visual do Editor de Mão de Obra

## Problemas Identificados

1. **Título com estilo diferente**: O componente `BudgetRolesEditor` usa `<h3 className="text-lg font-medium">` enquanto `BudgetSuppliersEditor` e `BudgetMaterialsEditor` usam `<CardTitle>` com ícone.

2. **Botão com estilo diferente**: O botão "Adicionar Papel" usa `variant="outline"` (borda) enquanto os outros usam o variant padrão (fundo verde/primary).

3. **Texto do botão**: O botão diz "Adicionar Papel" mas deveria dizer "Adicionar Mão de Obra" para manter consistência.

## Alterações Necessárias

### Arquivo: `src/components/budgets/BudgetRolesEditor.tsx`

#### Mudança 1 - Importar ícone (linha 2)

```tsx
// De:
import { Plus, Trash2 } from 'lucide-react';

// Para:
import { Plus, Trash2, Users } from 'lucide-react';
```

#### Mudança 2 - Atualizar título e botão (linhas 129-135)

```tsx
// De:
<div className="flex items-center justify-between">
  <h3 className="text-lg font-medium">Mão de Obra</h3>
  <Button type="button" variant="outline" size="sm" onClick={handleAddRole}>
    <Plus className="mr-2 h-4 w-4" />
    Adicionar Papel
  </Button>
</div>

// Para:
<div className="flex items-center justify-between">
  <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
    <Users className="h-5 w-5" />
    Mão de Obra
  </h3>
  <Button type="button" size="sm" onClick={handleAddRole}>
    <Plus className="mr-2 h-4 w-4" />
    Adicionar Mão de Obra
  </Button>
</div>
```

O estilo `text-2xl font-semibold leading-none tracking-tight` corresponde exatamente ao estilo do `CardTitle` do shadcn/ui, garantindo consistência visual.

#### Mudança 3 - Atualizar texto do estado vazio (linhas 139-140)

```tsx
// De:
<p className="text-muted-foreground">
  Nenhum papel alocado. Clique em "Adicionar Papel" para começar.
</p>

// Para:
<p className="text-muted-foreground">
  Nenhum profissional alocado. Clique em "Adicionar Mão de Obra" para começar.
</p>
```

## Resultado Esperado

| Elemento | Antes | Depois |
|----------|-------|--------|
| Título | `text-lg font-medium` sem ícone | `text-2xl font-semibold` com ícone Users |
| Botão | `variant="outline"` (borda) | `variant="default"` (fundo verde) |
| Texto do botão | "Adicionar Papel" | "Adicionar Mão de Obra" |

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/budgets/BudgetRolesEditor.tsx` | Atualizar estilo do título, adicionar ícone, remover variant do botão, renomear texto |

