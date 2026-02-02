
# Plano: Corrigir Submit Prematuro no Wizard de Orcamento

## Problemas Identificados

### 1. Inputs Sem Prevencao do Enter
Quando o usuario pressiona Enter em qualquer input de texto ou numero dentro do formulario, o comportamento padrao do navegador e disparar o `onSubmit` do form. Isso esta acontecendo nos seguintes componentes:

| Componente | Inputs Afetados | Linhas |
|------------|-----------------|--------|
| `BudgetRolesEditor` | Horas por mes | 187-200 |
| `BudgetSuppliersEditor` | Nome, Descricao, Valor Mensal | 93-99, 102-108, 111-125 |
| `BudgetMaterialsEditor` | Descricao, Valor | 85-91, 94-108 |

### 2. Modo de Edicao Quebrado
O modo de edicao (Tabs) referencia etapas que nao existem mais:
- `renderStepContent(3)` para Fornecedores -> retorna `null`
- `renderStepContent(4)` para Materiais -> retorna `null`
- `renderStepContent(5)` para Financeiro -> retorna `null`

---

## Solucao

### 1. Adicionar `onKeyDown` em Todos os Inputs

Adicionar a prevencao de Enter em todos os inputs editaveis:

```tsx
onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
```

**BudgetRolesEditor.tsx** (linha 190):
```tsx
<Input
  type="number"
  min={0}
  className="h-8 w-20 text-center ..."
  value={monthData?.hours || ''}
  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
  onChange={(e) => handleHoursChange(...)}
  placeholder="0"
/>
```

**BudgetSuppliersEditor.tsx** (linhas 93, 102, 111):
- Input de nome do fornecedor
- Input de descricao
- Input de valor mensal

**BudgetMaterialsEditor.tsx** (linhas 85, 94):
- Input de descricao do material
- Input de valor

### 2. Corrigir Modo de Edicao

Atualizar as abas do modo de edicao para funcionar com o novo layout de 2 etapas:

**Opcao 1 - Simplificar abas para 2**: 
- Aba "Dados Basicos" -> `renderStepContent(1)`
- Aba "Composicao" -> `renderStepContent(2)` (com grid: editores + resumo)

**Opcao 2 - Manter 5 abas e corrigir referencias**:
As abas de edicao podem manter o layout separado renderizando os componentes diretamente.

Vou implementar a **Opcao 1** para manter consistencia entre criacao e edicao.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/budgets/BudgetRolesEditor.tsx` | Adicionar `onKeyDown` nos inputs de horas |
| `src/components/budgets/BudgetSuppliersEditor.tsx` | Adicionar `onKeyDown` nos 3 inputs |
| `src/components/budgets/BudgetMaterialsEditor.tsx` | Adicionar `onKeyDown` nos 2 inputs |
| `src/pages/BudgetForm.tsx` | Simplificar TabsList para 2 abas no modo edicao |

---

## Alteracoes Detalhadas

### BudgetRolesEditor.tsx

No input de horas (linha ~190), adicionar:
```tsx
onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
```

### BudgetSuppliersEditor.tsx

Adicionar `onKeyDown` nos 3 inputs:
- Input nome (linha 93-99)
- Input descricao (linha 102-108)
- Input valor (linha 111-125)

### BudgetMaterialsEditor.tsx

Adicionar `onKeyDown` nos 2 inputs:
- Input descricao (linha 85-91)
- Input valor (linha 94-108)

### BudgetForm.tsx

Alterar modo de edicao de 5 abas para 2:

```tsx
{isEditing ? (
  <Tabs defaultValue="basic" className="w-full">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="basic">Dados Basicos</TabsTrigger>
      <TabsTrigger value="composition">Composicao</TabsTrigger>
    </TabsList>

    <TabsContent value="basic" className="mt-6">
      {renderStepContent(1)}
    </TabsContent>

    <TabsContent value="composition" className="mt-6">
      {renderStepContent(2)}
    </TabsContent>
  </Tabs>
) : (
  // Wizard mode (unchanged)
)}
```

---

## Validacao Apos Implementacao

1. **Modo Criacao**:
   - Preencher campos na etapa 1 e pressionar Enter - nao deve submeter
   - Clicar em "Proximo" - deve ir para etapa 2
   - Na etapa 2, preencher horas/valores e pressionar Enter - nao deve submeter
   - Adicionar/remover fornecedores e materiais - nao deve submeter
   - Clicar em "Criar Orcamento" - so entao deve salvar

2. **Modo Edicao**:
   - Navegar entre as 2 abas
   - Verificar que todas as secoes estao visiveis e funcionais
   - Salvar alteracoes clicando em "Salvar"

3. **Console**:
   - Sem warnings de refs
   - Sem erros de rendering
