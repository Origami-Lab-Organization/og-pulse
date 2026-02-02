

# Plano: Wizard de 3 Etapas com Seção de Precificação

## Objetivo

Reorganizar o wizard de orçamentos para ter 3 etapas claras:
1. **Dados Básicos** - informações do cliente e projeto
2. **Composição** - Mão de Obra, Fornecedores e Materiais com resumo simples de totais
3. **Precificação** - Custos, markup (comissão/margem) e valor final com desconto

## Layout Proposto

```text
ETAPA 2: COMPOSIÇÃO
+--------------------------------------------------+
| Mão de Obra                    [+ Adicionar]     |
| [tabela de papéis e horas]                       |
+--------------------------------------------------+
| Fornecedores                   [+ Adicionar]     |
| [tabela de fornecedores]                         |
+--------------------------------------------------+
| Materiais                      [+ Adicionar]     |
| [tabela de materiais]                            |
+--------------------------------------------------+
| MO: R$ X.XXX | Fornec: R$ X.XXX | Mat: R$ X.XXX  |  <-- rodapé simples
+--------------------------------------------------+
       [Anterior]               [Próximo ->]

ETAPA 3: PRECIFICAÇÃO
+--------------------------------------------------+
|  CUSTOS                                          |
|  +---------------------------------------------+ |
|  | Mão de Obra       | Fornecedores | Materiais| |
|  |   R$ X.XXX        |    R$ X.XXX  | R$ X.XXX | |
|  |         CUSTO TOTAL: R$ X.XXX               | |
|  +---------------------------------------------+ |
|                                                  |
|  COMPOSIÇÃO DO PREÇO                             |
|  +---------------------------------------------+ |
|  | Desp. Adm (12%)     R$ X.XXX    (somente leitura)
|  | Impostos (13%)      R$ X.XXX    (somente leitura)
|  | Comissão        [__%]  R$ X.XXX (editável)
|  | Margem          [__%]  R$ X.XXX (editável)
|  +---------------------------------------------+ |
|                                                  |
|  VALOR FINAL                                     |
|  +---------------------------------------------+ |
|  | Preço de Venda: R$ X.XXX                    | |
|  | Desconto: R$ [____]                         | |
|  |         VALOR FINAL: R$ X.XXX (destaque)    | |
|  +---------------------------------------------+ |
+--------------------------------------------------+
       [Anterior]           [Criar Orçamento]
```

## Alterações Técnicas

### 1. Atualizar Wizard Steps

**Arquivo**: `src/pages/BudgetForm.tsx`

```tsx
const WIZARD_STEPS = [
  { id: 1, title: 'Dados Básicos' },
  { id: 2, title: 'Composição' },
  { id: 3, title: 'Precificação' },
];
```

### 2. Nova Etapa 2 - Composição Simplificada

Remover o `BudgetFinancialSummary` da etapa 2 e adicionar um rodapé simples apenas com os totais:

```tsx
case 2:
  return (
    <>
      <div className="flex flex-col space-y-6">
        {/* Mão de Obra */}
        <Card>
          <CardContent className="pt-6">
            <BudgetRolesEditor ... />
          </CardContent>
        </Card>
        
        {/* Fornecedores */}
        <BudgetSuppliersEditor ... />
        
        {/* Materiais */}
        <BudgetMaterialsEditor ... />
      </div>
      
      {/* Rodapé simples com totais */}
      <div className="sticky bottom-0 z-40 -mx-6 -mb-6 border-t bg-muted/50 px-6 py-3">
        <div className="flex items-center justify-center gap-8 text-sm">
          <span>Mão de Obra: <strong>R$ X.XXX</strong></span>
          <span>Fornecedores: <strong>R$ X.XXX</strong></span>
          <span>Materiais: <strong>R$ X.XXX</strong></span>
        </div>
      </div>
    </>
  );
```

### 3. Nova Etapa 3 - Precificação

Criar um novo componente `BudgetPricingStep` ou renderizar inline:

```tsx
case 3:
  return (
    <div className="space-y-6">
      {/* Card: Custos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Custos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-sm text-muted-foreground">Mão de Obra</span>
              <p className="text-lg font-semibold">{formatCurrency(laborCost)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Fornecedores</span>
              <p className="text-lg font-semibold">{formatCurrency(suppliersTotal)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Materiais</span>
              <p className="text-lg font-semibold">{formatCurrency(materialsTotal)}</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between items-center">
            <span className="font-medium">Custo Total</span>
            <span className="text-xl font-bold">{formatCurrency(totalCost)}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Card: Composição do Preço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Composição do Preço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Despesas Adm - somente leitura */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Despesas Administrativas ({adminExpensesPercent}%)</span>
            <span>{formatCurrency(adminExpenses)}</span>
          </div>
          
          {/* Impostos - somente leitura */}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Impostos ({taxesPercent}%)</span>
            <span>{formatCurrency(taxes)}</span>
          </div>
          
          <Separator />
          
          {/* Comissão - editável */}
          <div className="flex justify-between items-center">
            <Label>Comissão (máx. {maxCommissionPercent}%)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={commissionPercent} ... className="w-20" />
              <span>%</span>
              <span className="text-muted-foreground">= {formatCurrency(commission)}</span>
            </div>
          </div>
          
          {/* Margem - editável */}
          <div className="flex justify-between items-center">
            <Label>Margem Líquida (mín. {minNetMarginPercent}%)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" value={netMarginPercent} ... className="w-20" />
              <span>%</span>
              <span className="text-muted-foreground">= {formatCurrency(netMargin)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Card: Valor Final */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Valor Final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Preço de Venda</span>
            <span className="text-xl font-semibold">{formatCurrency(sellingPrice)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <Label>Desconto</Label>
            <div className="flex items-center gap-2">
              <span>R$</span>
              <Input type="number" value={discountValue} ... className="w-32" />
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4">
            <span className="text-lg font-bold">Valor Final</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(finalTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
```

### 4. Atualizar Navegação

O botão "Criar Orçamento" só aparece quando `currentStep === 3`:

```tsx
{currentStep < WIZARD_STEPS.length ? (
  <Button type="button" onClick={handleNext}>
    Próximo
    <ArrowRight className="ml-2 h-4 w-4" />
  </Button>
) : (
  <Button type="button" onClick={() => form.handleSubmit(handleSubmit)()} disabled={isSubmitting}>
    <Save className="mr-2 h-4 w-4" />
    Criar Orçamento
  </Button>
)}
```

Esta lógica já existe e funciona corretamente - apenas mudará de step 2 para step 3.

### 5. Modo Edição (Tabs)

Atualizar as tabs para incluir a terceira aba:

```tsx
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
  <TabsTrigger value="composition">Composição</TabsTrigger>
  <TabsTrigger value="pricing">Precificação</TabsTrigger>
</TabsList>
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/BudgetForm.tsx` | Adicionar terceira etapa, simplificar etapa 2, atualizar tabs |
| `src/components/budgets/BudgetFinancialSummary.tsx` | Pode ser mantido para o modo sidebar (edição) ou removido |

## Benefícios

1. **Clareza visual**: Cada etapa tem um propósito específico
2. **Fluxo lógico**: Primeiro define o que será feito, depois precifica
3. **Menos sobrecarga**: A etapa de composição fica limpa, focada nos itens
4. **Controle de preço**: O usuário vê claramente como o preço é formado na etapa final
5. **Segurança de navegação**: Botão de salvar só aparece na última etapa

## Proteção Contra Submissão Acidental

O código atual já implementa proteções:
- `form onSubmit={(e) => e.preventDefault()` - impede submit por Enter
- `type="button"` em todos os botões
- Verificação `currentStep < WIZARD_STEPS.length` no handleSubmit

Com 3 etapas, estas proteções continuam funcionando automaticamente.

