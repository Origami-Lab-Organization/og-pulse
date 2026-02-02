
# Plano: Corrigir Bug de Duplicacao de Orcamentos

## Problema Identificado

Ao criar um orcamento, o usuario pode pressionar Enter em qualquer input de texto ou numero dentro do formulario. Isso dispara o `onSubmit` do form, salvando o orcamento prematuramente. Se isso acontecer duas vezes (por exemplo, o usuario pressiona Enter e depois clica em "Criar Orcamento"), o sistema cria dois orcamentos.

### Componentes Afetados

| Componente | Inputs Sem Prevencao | Linhas |
|------------|---------------------|--------|
| `BudgetRolesEditor.tsx` | Inputs de horas por mes | 187-200 |
| `BudgetSuppliersEditor.tsx` | Nome do fornecedor | 93-98 |
| `BudgetSuppliersEditor.tsx` | Descricao do servico | 102-107 |
| `BudgetSuppliersEditor.tsx` | Valor mensal | 111-125 |
| `BudgetMaterialsEditor.tsx` | Descricao do material | 85-91 |
| `BudgetMaterialsEditor.tsx` | Valor | 94-108 |

### Problema Secundario

O modo de edicao (Tabs) referencia `renderStepContent(3)`, `renderStepContent(4)` e `renderStepContent(5)` que retornam `null`, causando tabs vazias.

## Solucao

### 1. Adicionar Prevencao do Enter em Todos os Inputs

Adicionar o handler `onKeyDown` em todos os inputs editaveis:

```tsx
onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
```

### 2. Corrigir Modo de Edicao

Simplificar as tabs de edicao para 2 abas (consistente com o wizard):
- Aba "Dados Basicos" -> `renderStepContent(1)`
- Aba "Composicao" -> `renderStepContent(2)` (ja inclui editores + resumo)

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/budgets/BudgetRolesEditor.tsx` | Adicionar `onKeyDown` nos inputs de horas (linha 187-200) |
| `src/components/budgets/BudgetSuppliersEditor.tsx` | Adicionar `onKeyDown` nos 3 inputs (linhas 93, 102, 111) |
| `src/components/budgets/BudgetMaterialsEditor.tsx` | Adicionar `onKeyDown` nos 2 inputs (linhas 85, 94) |
| `src/pages/BudgetForm.tsx` | Simplificar TabsList de 5 para 2 abas (linhas 413-441) |

## Alteracoes Detalhadas

### BudgetRolesEditor.tsx (linha 187-200)

Antes:
```tsx
<Input
  type="number"
  min={0}
  className="h-8 w-20 text-center ..."
  value={monthData?.hours || ''}
  onChange={(e) => handleHoursChange(...)}
  placeholder="0"
/>
```

Depois:
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

### BudgetSuppliersEditor.tsx (linhas 93, 102, 111)

Adicionar `onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}` em:
- Input de nome do fornecedor (linha 93)
- Input de descricao (linha 102)
- Input de valor mensal (linha 111)

### BudgetMaterialsEditor.tsx (linhas 85, 94)

Adicionar `onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}` em:
- Input de descricao (linha 85)
- Input de valor (linha 94)

### BudgetForm.tsx (linhas 413-441)

Antes (5 abas):
```tsx
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="basic">Dados Basicos</TabsTrigger>
  <TabsTrigger value="roles">Mao de Obra</TabsTrigger>
  <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
  <TabsTrigger value="materials">Materiais</TabsTrigger>
  <TabsTrigger value="financial">Financeiro</TabsTrigger>
</TabsList>
// ... TabsContent para cada uma (algumas renderizam null)
```

Depois (2 abas):
```tsx
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
```

## Secao Tecnica

### Por Que o Enter Causa Submissao

Em formularios HTML, pressionar Enter em um input de texto dispara o `onSubmit` do form pai. Isso e comportamento padrao do navegador. Para prevenir, precisamos interceptar o evento `keydown` e chamar `preventDefault()` quando a tecla for Enter.

### Por Que as Tabs Estavam Vazias

A funcao `renderStepContent()` so tem cases para step 1 e 2. Os steps 3, 4 e 5 caem no `default: return null`. As tabs de edicao referenciavam esses steps inexistentes.

## Validacao Apos Implementacao

1. **Modo Criacao**:
   - Preencher campos na etapa 1 e pressionar Enter -> NAO deve submeter
   - Clicar em "Proximo" -> deve ir para etapa 2
   - Na etapa 2, preencher horas/valores e pressionar Enter -> NAO deve submeter
   - Adicionar/remover fornecedores e materiais -> NAO deve submeter
   - Clicar em "Criar Orcamento" -> so entao deve salvar
   - Verificar que apenas UM orcamento foi criado

2. **Modo Edicao**:
   - Navegar entre as 2 abas
   - Verificar que todas as secoes estao visiveis e funcionais
   - Salvar alteracoes clicando em "Salvar"

3. **Console**:
   - Sem warnings de refs
   - Sem erros de rendering
