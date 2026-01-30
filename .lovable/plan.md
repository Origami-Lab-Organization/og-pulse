
# Plano: Corrigir Fluxo do Wizard de Criacao de Orcamentos

## Problema Identificado

Ao clicar nos botoes "Adicionar Fornecedor" ou "Adicionar Material" durante a criacao do orcamento no modo Wizard, o formulario e enviado automaticamente, causando o salvamento prematuro e impedindo que o usuario chegue ate a ultima etapa.

### Causa Raiz

Os botoes dentro dos componentes `BudgetSuppliersEditor` e `BudgetMaterialsEditor` **nao possuem `type="button"`**, fazendo com que se comportem como `type="submit"` (comportamento padrao em HTML). Quando clicados dentro de um `<form>`, disparam o `onSubmit` do formulario.

### Evidencia do Erro no Console

```
Warning: Function components cannot be given refs... Check the render method of `BudgetForm`.
at BudgetFinancialSummary
```

Este erro tambem indica que o `BudgetFinancialSummary` esta recebendo uma ref do Radix Tabs, mas nao usa `forwardRef`.

---

## Problemas a Corrigir

| # | Problema | Arquivo | Linha |
|---|----------|---------|-------|
| 1 | Botao "Adicionar Fornecedor" sem `type="button"` | `BudgetSuppliersEditor.tsx` | 64 |
| 2 | Botao de remover fornecedor sem `type="button"` | `BudgetSuppliersEditor.tsx` | 131 |
| 3 | Botao "Adicionar Material" sem `type="button"` | `BudgetMaterialsEditor.tsx` | 58 |
| 4 | Botao de remover material sem `type="button"` | `BudgetMaterialsEditor.tsx` | 112 |
| 5 | `BudgetFinancialSummary` nao usa `forwardRef` | `BudgetFinancialSummary.tsx` | 22 |

---

## Solucao

### 1. Corrigir `BudgetSuppliersEditor.tsx`

Adicionar `type="button"` em todos os botoes:

```tsx
// Linha 64: Botao Adicionar Fornecedor
<Button type="button" onClick={handleAddSupplier} size="sm">
  <Plus className="mr-2 h-4 w-4" />
  Adicionar Fornecedor
</Button>

// Linha 131: Botao Remover Fornecedor
<Button
  type="button"
  variant="ghost"
  size="icon"
  onClick={() => handleRemoveSupplier(supplier.tempId)}
  className="text-destructive hover:text-destructive"
>
  <Trash2 className="h-4 w-4" />
</Button>
```

### 2. Corrigir `BudgetMaterialsEditor.tsx`

Adicionar `type="button"` em todos os botoes:

```tsx
// Linha 58: Botao Adicionar Material
<Button type="button" onClick={handleAddMaterial} size="sm">
  <Plus className="mr-2 h-4 w-4" />
  Adicionar Material
</Button>

// Linha 112: Botao Remover Material
<Button
  type="button"
  variant="ghost"
  size="icon"
  onClick={() => handleRemoveMaterial(material.tempId)}
  className="text-destructive hover:text-destructive"
>
  <Trash2 className="h-4 w-4" />
</Button>
```

### 3. Corrigir `BudgetFinancialSummary.tsx`

Adicionar `forwardRef` para resolver o warning do React:

```tsx
import { forwardRef } from 'react';

export const BudgetFinancialSummary = forwardRef<HTMLDivElement, BudgetFinancialSummaryProps>(
  function BudgetFinancialSummary(props, ref) {
    // ... conteudo do componente
    return (
      <Card ref={ref}>
        {/* ... */}
      </Card>
    );
  }
);
```

---

## Por Que BudgetRolesEditor Funciona?

O componente `BudgetRolesEditor` ja esta correto porque seus botoes tem `type="button"` (linhas 131 e 212). Esta e a pratica correta que deve ser aplicada aos outros componentes.

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/budgets/BudgetSuppliersEditor.tsx` | Adicionar `type="button"` nos 2 botoes |
| `src/components/budgets/BudgetMaterialsEditor.tsx` | Adicionar `type="button"` nos 2 botoes |
| `src/components/budgets/BudgetFinancialSummary.tsx` | Envolver com `forwardRef` para aceitar refs |

---

## Validacao Apos Correcao

Apos implementar as correcoes, testar:

1. Criar novo orcamento e navegar por todas as 5 etapas do wizard
2. Adicionar e remover fornecedores na etapa 3 sem que o formulario seja salvo
3. Adicionar e remover materiais na etapa 4 sem que o formulario seja salvo
4. Verificar que o console nao exibe mais warnings sobre refs
5. Confirmar que o salvamento so ocorre ao clicar em "Criar Orcamento" na etapa 5
