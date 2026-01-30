

# Plano: Corrigir Fluxo do Wizard de Criacao de Orcamentos

## Problemas Identificados

### 1. Submit Prematuro na Etapa de Resumo
Ao pressionar Enter nos campos editaveis do `BudgetFinancialSummary` (comissao, margem liquida, desconto), o formulario e submetido automaticamente. Isso ocorre porque:
- Os `<Input>` nao previnem o comportamento padrao do Enter
- Como estao dentro de um `<form>`, o Enter em um input dispara `onSubmit`

### 2. Ordem dos Campos Incorreta
Na primeira etapa "Dados Basicos", a ordem atual e:
1. Titulo do Orcamento
2. Tipo de Cliente  

A ordem correta deveria ser:
1. Tipo de Cliente (Cliente Existente ou Lead)
2. Titulo do Orcamento

### 3. Warning de Refs no Console
O componente `BudgetMaterialsEditor` esta gerando warning:
```
Warning: Function components cannot be given refs...
Check the render method of BudgetForm.
at BudgetMaterialsEditor
```

---

## Solucao

### 1. Prevenir Submit ao Pressionar Enter nos Inputs

No `BudgetFinancialSummary.tsx`, adicionar `onKeyDown` em todos os inputs numericos para prevenir o comportamento padrao do Enter:

```tsx
<Input
  type="number"
  onKeyDown={(e) => {
    if (e.key === 'Enter') e.preventDefault();
  }}
  // ... outras props
/>
```

Isso se aplica a:
- Input de Comissao (linha 99-111)
- Input de Margem Liquida (linha 126-138)
- Input de Desconto (linha 164-176)

### 2. Reordenar Campos na Etapa 1

No `BudgetForm.tsx`, dentro do `renderStepContent(1)` (linhas 243-340), mover o bloco do FormField de "clientType" para **antes** do FormField de "title":

Ordem atual:
```
1. FormField name="title"
2. FormField name="clientType"
3. FormField name="clientId" ou leadName/leadContact
```

Nova ordem:
```
1. FormField name="clientType"
2. FormField name="title"
3. FormField name="clientId" ou leadName/leadContact
```

### 3. Adicionar forwardRef ao BudgetMaterialsEditor

O `BudgetMaterialsEditor` precisa ser envolvido com `forwardRef` para resolver o warning de refs:

```tsx
import { forwardRef } from 'react';

export const BudgetMaterialsEditor = forwardRef<HTMLDivElement, BudgetMaterialsEditorProps>(
  function BudgetMaterialsEditor({ materials, onMaterialsChange }, ref) {
    // ... conteudo existente
    return (
      <div ref={ref}>
        <Card>
          {/* ... */}
        </Card>
      </div>
    );
  }
);
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/budgets/BudgetFinancialSummary.tsx` | Adicionar `onKeyDown` para prevenir Enter em 3 inputs |
| `src/pages/BudgetForm.tsx` | Reordenar campos: clientType antes de title |
| `src/components/budgets/BudgetMaterialsEditor.tsx` | Adicionar `forwardRef` |

---

## Validacao Apos Correcao

1. Navegar pelo wizard completo (5 etapas) sem submits prematuros
2. Verificar que o campo "Tipo de Cliente" aparece antes do "Titulo" na etapa 1
3. Preencher campos numericos no resumo e pressionar Enter - nao deve salvar
4. Clicar em "Criar Orcamento" na etapa 5 - so entao deve salvar
5. Console sem warnings de refs

