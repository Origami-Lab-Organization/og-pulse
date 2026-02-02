

# Plano: Simplificar Wizard de Orcamento para 2 Telas

## Objetivo

Transformar o wizard de 5 etapas em apenas 2 telas:

1. **Tela 1 - Dados Basicos**: Tipo de cliente, titulo, datas, duracao, observacoes
2. **Tela 2 - Composicao do Orcamento**: Mao de Obra, Fornecedores, Materiais em secoes + Resumo Financeiro **sempre visivel**

---

## Arquitetura da Nova Interface

```text
+-----------------------------------------------+
|              TELA 2 - COMPOSICAO              |
+---------------------------+-------------------+
|                           |                   |
|  [Mao de Obra]            |                   |
|  - Tabela de papeis       |    RESUMO         |
|  - Adicionar papel        |    FINANCEIRO     |
|                           |                   |
|  [Fornecedores]           |    (sempre        |
|  - Lista de fornecedores  |     visivel)      |
|  - Adicionar fornecedor   |                   |
|                           |    - Custos       |
|  [Materiais]              |    - Taxas        |
|  - Lista de materiais     |    - Comissao     |
|  - Adicionar material     |    - Margem       |
|                           |    - Desconto     |
|                           |    - VALOR FINAL  |
+---------------------------+-------------------+
```

---

## Mudancas Detalhadas

### 1. Atualizar Constantes do Wizard

```tsx
// Antes: 5 etapas
const WIZARD_STEPS = [
  { id: 1, title: 'Dados Basicos' },
  { id: 2, title: 'Mao de Obra' },
  { id: 3, title: 'Fornecedores' },
  { id: 4, title: 'Materiais' },
  { id: 5, title: 'Resumo' },
];

// Depois: 2 etapas
const WIZARD_STEPS = [
  { id: 1, title: 'Dados Basicos' },
  { id: 2, title: 'Composicao' },
];
```

### 2. Reestruturar `renderStepContent`

**Tela 1 (Dados Basicos)**: Mantem igual - formulario com tipo de cliente, titulo, datas, etc.

**Tela 2 (Composicao)**: Layout em 2 colunas:
- **Coluna Esquerda (2/3)**: Secoes empilhadas verticalmente
  - Mao de Obra (BudgetRolesEditor)
  - Fornecedores (BudgetSuppliersEditor)
  - Materiais (BudgetMaterialsEditor)
- **Coluna Direita (1/3)**: Resumo Financeiro (sticky/fixo ao rolar)
  - BudgetFinancialSummary sempre visivel

### 3. Implementar Layout Responsivo

```tsx
// Tela 2: Grid com 2 colunas
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Coluna principal: Secoes de custos */}
  <div className="lg:col-span-2 space-y-6">
    {/* Mao de Obra */}
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
  
  {/* Coluna lateral: Resumo sempre visivel */}
  <div className="lg:col-span-1">
    <div className="sticky top-6">
      <BudgetFinancialSummary ... />
    </div>
  </div>
</div>
```

### 4. Atualizar Indicador de Passos

Simplificar o indicador visual para mostrar apenas 2 passos em vez de 5.

### 5. Atualizar Logica de Navegacao

- `handleNext`: Agora so tem 1 transicao (etapa 1 -> etapa 2)
- `validateCurrentStep`: Mantem validacao apenas para etapa 1
- Botao "Criar Orcamento" aparece na etapa 2

---

## Beneficios da Nova Estrutura

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Etapas | 5 cliques | 2 cliques |
| Visibilidade do preco | So na etapa 5 | Sempre visivel na etapa 2 |
| UX | Fragmentado | Fluido e contextualizado |
| Feedback visual | Tardio | Imediato ao editar valores |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/BudgetForm.tsx` | Reestruturar wizard de 5 para 2 etapas, novo layout em grid |

---

## Consideracoes Tecnicas

1. **Responsividade**: Em mobile, o resumo aparece acima ou abaixo das secoes (stack vertical)
2. **Sticky**: O resumo usa `sticky top-6` para ficar fixo durante scroll em desktop
3. **Scroll**: A coluna esquerda pode ter scroll independente enquanto o resumo permanece visivel
4. **Atualizacao em tempo real**: O resumo ja atualiza automaticamente conforme os valores mudam

---

## Validacao Apos Implementacao

1. Criar novo orcamento: navegar pelas 2 etapas
2. Verificar que o resumo atualiza em tempo real ao adicionar mao de obra
3. Verificar que o resumo permanece visivel ao rolar a pagina
4. Testar responsividade em mobile
5. Confirmar que "Criar Orcamento" funciona na etapa 2

