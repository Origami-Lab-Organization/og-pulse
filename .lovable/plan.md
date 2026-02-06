

# Plano: Reorganizar Layout da Calculadora

## Objetivo

Alterar o layout da calculadora de custos para:
1. **Inputs na horizontal no topo** - Os campos de "Dados do Funcionário" dispostos lado a lado
2. **3 colunas abaixo** - Seções 1, 2 e 3 em colunas paralelas

## Nova Estrutura Visual

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Calculadora de Custos                                                               │
│ Simule os custos de contratação CLT vs PJ (Simples Nacional)                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  Dados do Funcionário                                                         │  │
│  │  ┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐    │  │
│  │  │ Salário Bruto   │ Benefícios      │ Jornada Mensal  │ Dependentes     │    │  │
│  │  │ R$ 6.000,00     │ R$ 1.200,00     │ 168h            │ 0               │    │  │
│  │  └─────────────────┴─────────────────┴─────────────────┴─────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐      │
│  │ 1. Custo Empresa     │  │ 2. Salário Líquido   │  │ 3. Equivalente PJ    │      │
│  │                      │  │                      │  │                      │      │
│  │ Base: R$ 6.000       │  │ Bruto: R$ 6.000      │  │ Comparar com:        │      │
│  │ Encargos: R$ 2.148   │  │ (-) INSS: R$ 659     │  │ (x) Custo Total      │      │
│  │ Provisões: R$ 1.167  │  │ (-) IRRF: R$ 465     │  │ ( ) Salário Bruto    │      │
│  │ Benefícios: R$ 1.200 │  │ Líquido: R$ 4.876    │  │                      │      │
│  │                      │  │ (+) Benef: R$ 1.200  │  │ Contrato: R$ 10.515  │      │
│  │ Total: R$ 10.515     │  │ Total: R$ 6.076      │  │ Líquido: R$ 9.884    │      │
│  │ Custo/h: R$ 62,59    │  │                      │  │                      │      │
│  │                      │  │                      │  │                      │      │
│  │ [Ver detalhamento]   │  │ [Ver detalhamento]   │  │ Diferença: +R$ 3.808 │      │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/calculator/CalculatorInputs.tsx` | Reformular para layout horizontal em grid de 4 colunas |
| `src/components/calculator/CalculatorResults.tsx` | Alterar de vertical (`space-y-4`) para grid de 3 colunas |
| `src/pages/EmployeeCalculator.tsx` | Reorganizar estrutura do layout (inputs em cima, resultados embaixo) |

## Detalhes de Implementação

### 1. CalculatorInputs.tsx - Layout Horizontal

Alterar o CardContent de `space-y-4` (vertical) para um grid de 4 colunas:

**Antes:**
```tsx
<CardContent className="space-y-4">
  {/* 4 campos empilhados verticalmente */}
</CardContent>
```

**Depois:**
```tsx
<CardContent>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Campo 1: Salário Bruto */}
    {/* Campo 2: Benefícios Mensais */}
    {/* Campo 3: Jornada Mensal */}
    {/* Campo 4: Dependentes */}
  </div>
</CardContent>
```

### 2. CalculatorResults.tsx - Grid de 3 Colunas

Alterar o container de cards de vertical para horizontal:

**Antes:**
```tsx
<div className="space-y-4">
  <Card>1. Custo Empresa</Card>
  <Card>2. Salário Líquido</Card>
  <Card>3. Equivalente PJ</Card>
</div>
```

**Depois:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <Card>1. Custo Empresa</Card>
  <Card>2. Salário Líquido</Card>
  <Card>3. Equivalente PJ</Card>
</div>
```

### 3. EmployeeCalculator.tsx - Nova Estrutura de Layout

Reorganizar de 2 colunas lado a lado para estrutura vertical (inputs em cima, resultados embaixo):

**Antes:**
```tsx
<div className="grid gap-6 lg:grid-cols-[350px_1fr]">
  {/* Inputs - Coluna esquerda */}
  <div className="space-y-4">
    <CalculatorInputs ... />
  </div>
  {/* Resultados - Coluna direita */}
  <div>
    <CalculatorResults ... />
  </div>
</div>
```

**Depois:**
```tsx
<div className="space-y-6">
  {/* Inputs - Linha superior horizontal */}
  <div>
    <CalculatorInputs ... />
    {!hasValidInput && salarioBruto && (
      <p className="mt-2 text-sm text-amber-600 ...">⚠️ Salário mínimo...</p>
    )}
  </div>

  {/* Resultados - 3 colunas abaixo */}
  {hasValidInput ? (
    <CalculatorResults ... />
  ) : (
    <div className="flex items-center justify-center h-48 ...">
      {/* Placeholder */}
    </div>
  )}
</div>
```

## Responsividade

| Breakpoint | Inputs | Resultados |
|------------|--------|------------|
| Mobile (<640px) | 1 coluna vertical | 1 coluna vertical |
| Tablet (640-1023px) | 2 colunas | 1 coluna vertical |
| Desktop (≥1024px) | 4 colunas lado a lado | 3 colunas lado a lado |

## Classes Tailwind para Responsividade

**Inputs:**
```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
```

**Resultados:**
```
grid grid-cols-1 lg:grid-cols-3 gap-4
```

## Ajustes nos Cards de Resultado

Com os 3 cards lado a lado, cada um ficará mais compacto. Ajustes necessários:

1. **Reduzir padding**: De `pb-3` para `pb-2` nos CardHeader
2. **Grid de componentes de custo**: Manter 2x2 para caber no espaço menor
3. **Tipografia**: Verificar se os textos não ficam truncados
4. **Collapsibles**: Continuam funcionando normalmente, expandindo dentro do card

## Notas Técnicas

- Manter a funcionalidade existente dos Collapsibles
- Não alterar a lógica de cálculos
- Preservar tooltips de ajuda nos campos
- O placeholder quando não há input válido deve ocupar largura total

