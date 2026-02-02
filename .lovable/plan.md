

# Plano: Resumo Financeiro Fixo no Rodape

## Objetivo

Reorganizar o layout da etapa de Composicao do orcamento para:
1. Mover o Resumo Financeiro para um rodape fixo na parte inferior
2. Utilizar toda a largura disponivel para as secoes de Mao de Obra, Fornecedores e Materiais
3. Simplificar os cabecalhos das secoes (apenas icone + titulo, sem subtitulos)

## Layout Atual vs. Proposto

```text
LAYOUT ATUAL                          LAYOUT PROPOSTO
+---------------------------+         +--------------------------------+
|  Mao de Obra      |       |         |  Mao de Obra      [+ Adicionar]|
|  [tabela]         | Resu- |         |  [tabela largura total]        |
|-------------------|  mo   |         |--------------------------------|
|  Fornecedores     | Finan-|         |  Fornecedores     [+ Adicionar]|
|  [tabela]         | ceiro |         |  [tabela]                      |
|-------------------|       |         |--------------------------------|
|  Materiais        |       |         |  Materiais        [+ Adicionar]|
|  [tabela]         |       |         |  [tabela]                      |
+---------------------------+         +================================+
                                      | RESUMO FINANCEIRO (sticky)     |
                                      | Custos | Composicao | Total    |
                                      +--------------------------------+
```

## Alteracoes por Arquivo

### 1. BudgetForm.tsx - Layout da Etapa 2 (linhas 350-400)

Trocar o grid de 2 colunas para layout de coluna unica + rodape fixo:

**Antes:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2 space-y-6">
    {/* Mao de Obra, Fornecedores, Materiais */}
  </div>
  <div className="lg:col-span-1">
    <div className="sticky top-6">
      <BudgetFinancialSummary ... />
    </div>
  </div>
</div>
```

**Depois:**
```tsx
<div className="flex flex-col pb-48"> {/* Espaco para o rodape fixo */}
  {/* Mao de Obra - largura total */}
  <Card className="mb-6">
    <BudgetRolesEditor ... />
  </Card>

  {/* Fornecedores - largura total, sem subtitulo */}
  <BudgetSuppliersEditor ... />

  {/* Materiais - largura total, sem subtitulo */}
  <BudgetMaterialsEditor ... />

  {/* Rodape Fixo */}
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
    <BudgetFinancialSummary layout="footer" ... />
  </div>
</div>
```

### 2. BudgetFinancialSummary.tsx - Layout Horizontal para Rodape

Criar uma variante horizontal do componente para exibicao no rodape:

**Mudancas:**
- Adicionar prop `layout?: 'sidebar' | 'footer'` (default: 'sidebar')
- Quando `layout="footer"`, renderizar em formato horizontal:
  - Container com `flex` horizontal
  - Secoes lado a lado: Custos | Composicao do Preco | Preco Final
  - Inputs menores e mais compactos
  - Altura fixa (~120px)

**Estrutura do Layout Footer:**
```tsx
// layout="footer"
<div className="border-t bg-background shadow-lg py-4 px-6">
  <div className="max-w-screen-2xl mx-auto flex items-center gap-8">
    {/* Custos */}
    <div className="flex gap-4">
      <span>Mao de Obra: R$ X</span>
      <span>Fornecedores: R$ X</span>
      <span>Materiais: R$ X</span>
      <span className="font-bold">Custo Total: R$ X</span>
    </div>
    
    <Separator orientation="vertical" />
    
    {/* Composicao */}
    <div className="flex gap-4">
      <span>Desp. Adm. (12%): R$ X</span>
      <span>Impostos (13%): R$ X</span>
      <Input ... /> {/* Comissao */}
      <Input ... /> {/* Margem */}
    </div>
    
    <Separator orientation="vertical" />
    
    {/* Preco Final */}
    <div className="flex items-center gap-4">
      <span>Preco Venda: R$ X</span>
      <Input ... /> {/* Desconto */}
      <span className="text-xl font-bold text-primary">Valor Final: R$ X</span>
    </div>
  </div>
</div>
```

### 3. BudgetRolesEditor.tsx - Simplificar Cabecalho

Manter apenas icone + titulo, remover descricao (ja nao tem descricao, apenas ajustar estrutura se necessario):

**Cabecalho atual ja esta correto** - apenas `<h3>Mao de Obra</h3>` + botao

### 4. BudgetSuppliersEditor.tsx - Remover Subtitulo

**Antes (linhas 54-62):**
```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <div>
      <CardTitle className="flex items-center gap-2">
        <Truck className="h-5 w-5" />
        Fornecedores
      </CardTitle>
      <CardDescription>
        Adicione custos recorrentes de fornecedores externos...
      </CardDescription>
    </div>
    <Button ...>Adicionar Fornecedor</Button>
  </div>
</CardHeader>
```

**Depois:**
```tsx
<CardHeader className="pb-4">
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2">
      <Truck className="h-5 w-5" />
      Fornecedores
    </CardTitle>
    <Button ...>Adicionar Fornecedor</Button>
  </div>
</CardHeader>
```

### 5. BudgetMaterialsEditor.tsx - Remover Subtitulo

Similar ao Fornecedores:

**Antes (linhas 48-57):**
```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <div>
      <CardTitle className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        Materiais
      </CardTitle>
      <CardDescription>
        Adicione custos de materiais ou outros itens ao orcamento
      </CardDescription>
    </div>
    <Button ...>Adicionar Material</Button>
  </div>
</CardHeader>
```

**Depois:**
```tsx
<CardHeader className="pb-4">
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2">
      <Package className="h-5 w-5" />
      Materiais
    </CardTitle>
    <Button ...>Adicionar Material</Button>
  </div>
</CardHeader>
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/BudgetForm.tsx` | Mudar layout da etapa 2 para coluna unica + rodape fixo |
| `src/components/budgets/BudgetFinancialSummary.tsx` | Adicionar layout horizontal para modo "footer" |
| `src/components/budgets/BudgetSuppliersEditor.tsx` | Remover CardDescription |
| `src/components/budgets/BudgetMaterialsEditor.tsx` | Remover CardDescription |

## Consideracoes Tecnicas

### Responsividade do Rodape

- Em telas menores, o rodape pode empilhar os grupos verticalmente
- Usar `flex-wrap` e ajustar gaps
- Em mobile, considerar um botao que expande/colapsa o resumo

### Espaco para Scroll

- Adicionar `padding-bottom` no container principal para que o conteudo nao fique oculto atras do rodape fixo
- O rodape tera altura aproximada de 100-120px

### Consideracao para Sidebar

- O rodape fixo deve respeitar a largura da sidebar
- Usar `left` dinamico ou `ml-[var(--sidebar-width)]` quando sidebar estiver aberta

### Modo Edicao (Tabs)

- Aplicar a mesma mudanca de layout na aba "Composicao" do modo de edicao
- O rodape fixo funciona igual nos dois modos

