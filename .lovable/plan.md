

# Plano: Reorganizar Calculadora em 3 Areas Distintas

## Objetivo

Reestruturar a interface da calculadora para apresentar 3 areas claras e distintas, considerando empresa no Simples Nacional:

1. **Custo Empresa** - Detalhamento completo do custo para a empresa
2. **Salario Liquido + Beneficios** - O que o funcionario efetivamente recebe
3. **Equivalente PJ** - Valor equivalente se contratado como PJ

## Nova Estrutura Visual

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ INPUTS (coluna esquerda)                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  1. CUSTO EMPRESA (CLT)                                              │   │
│  │  ┌─────────────────┬────────────────┬─────────────────┐              │   │
│  │  │ Base            │ Encargos       │ Provisoes       │              │   │
│  │  │ R$ 5.000        │ R$ 1.790       │ R$ 555          │              │   │
│  │  └─────────────────┴────────────────┴─────────────────┘              │   │
│  │  Beneficios: R$ 800                                                  │   │
│  │  ───────────────────────────────────────────────────────             │   │
│  │  CUSTO TOTAL: R$ 8.145/mes    Custo/Hora: R$ 48,48                   │   │
│  │  [Ver detalhamento ▼]                                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  2. SALARIO LIQUIDO DO FUNCIONARIO                                   │   │
│  │  Salario Bruto: R$ 5.000                                             │   │
│  │  (-) INSS: R$ 532,17                                                 │   │
│  │  (-) IRRF: R$ 263,87                                                 │   │
│  │  ───────────────────────────────────────────────────────             │   │
│  │  LIQUIDO: R$ 4.203,96                                                │   │
│  │  (+) Beneficios: R$ 800 (VR, VT, Saude)                              │   │
│  │  ───────────────────────────────────────────────────────             │   │
│  │  TOTAL RECEBIDO: R$ 5.003,96                                         │   │
│  │  [Ver detalhamento ▼]                                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  3. PJ EQUIVALENTE (Simples Nacional)                                │   │
│  │  Para mesmo custo empresa de R$ 8.145:                               │   │
│  │  Valor do Contrato PJ: R$ 8.145                                      │   │
│  │  (-) Impostos (~15% Simples): R$ 1.221,75                            │   │
│  │  ───────────────────────────────────────────────────────             │   │
│  │  LIQUIDO ESTIMADO PJ: R$ 6.923,25                                    │   │
│  │  Custo/Hora PJ: R$ 48,48                                             │   │
│  │                                                                      │   │
│  │  ⚠️ Diferenca liquido: +R$ 2.719,29 (+64,7% como PJ)                 │   │
│  │  ⚠️ PJ nao inclui: FGTS, 13o, Ferias, direitos trabalhistas         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Alteracoes nos Arquivos

### 1. CalculatorResults.tsx - Reescrever Completamente

Substituir a estrutura atual de 2 cards lado a lado por 3 cards verticais:

**Card 1 - Custo Empresa:**
- Resumo visual: Base + Encargos + Provisoes + Beneficios = Total
- Exibir custo/hora
- Botao para expandir detalhamento completo

**Card 2 - Salario Liquido do Funcionario:**
- Salario bruto
- Descontos (INSS + IRRF)
- Salario liquido
- Beneficios recebidos (VR, VT, etc)
- Total recebido (liquido + beneficios)
- Botao para expandir detalhamento INSS/IRRF

**Card 3 - Equivalente PJ:**
- Valor do contrato (= custo empresa CLT)
- Impostos Simples Nacional (~15%)
- Liquido estimado PJ
- Custo/hora
- Comparativo de ganho liquido vs CLT
- Notas sobre ausencia de beneficios trabalhistas

### 2. CalculatorBreakdown.tsx - Integrar ao CalculatorResults

Mover a logica de detalhamento para dentro dos cards como Collapsibles internos, em vez de cards separados.

### 3. EmployeeCalculator.tsx - Simplificar

Remover referencia ao CalculatorBreakdown separado, ja que estara integrado.

## Detalhes de Implementacao

### Card 1 - Custo Empresa

```tsx
<Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
  <CardHeader>
    <CardTitle>1. Custo para a Empresa (CLT)</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Grid com os 4 componentes de custo */}
    <div className="grid grid-cols-4 gap-2 text-center">
      <div className="p-3 rounded bg-background">
        <p className="text-xs text-muted-foreground">Base</p>
        <p className="font-bold">{formatCurrency(cltCost.baseAmount)}</p>
      </div>
      <div className="p-3 rounded bg-background">
        <p className="text-xs text-muted-foreground">Encargos</p>
        <p className="font-bold">{formatCurrency(cltCost.chargesAmount)}</p>
      </div>
      <div className="p-3 rounded bg-background">
        <p className="text-xs text-muted-foreground">Provisoes</p>
        <p className="font-bold">{formatCurrency(cltCost.provisionsAmount)}</p>
      </div>
      <div className="p-3 rounded bg-background">
        <p className="text-xs text-muted-foreground">Beneficios</p>
        <p className="font-bold">{formatCurrency(cltCost.benefitsAmount)}</p>
      </div>
    </div>

    {/* Total e Custo/Hora */}
    <div className="mt-4 p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30">
      <div className="flex justify-between items-center">
        <span className="font-semibold">Custo Total Mensal</span>
        <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
          {formatCurrency(cltCost.totalMonthlyCost)}
        </span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground mt-1">
        <span>Custo/Hora</span>
        <span>{formatCurrency(cltHourlyCost)}/h</span>
      </div>
    </div>

    {/* Collapsible detalhamento */}
    <Collapsible>
      <CollapsibleTrigger>Ver detalhamento</CollapsibleTrigger>
      <CollapsibleContent>
        {/* Detalhes de encargos e provisoes */}
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

### Card 2 - Salario Liquido

```tsx
<Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
  <CardHeader>
    <CardTitle>2. Salario Liquido do Funcionario</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Calculo do liquido */}
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Salario Bruto</span>
        <span>{formatCurrency(cltNetSalary.grossSalary)}</span>
      </div>
      <div className="flex justify-between text-destructive">
        <span>(-) INSS</span>
        <span>- {formatCurrency(cltNetSalary.inss)}</span>
      </div>
      <div className="flex justify-between text-destructive">
        <span>(-) IRRF</span>
        <span>- {formatCurrency(cltNetSalary.irrf)}</span>
      </div>
      <div className="flex justify-between font-semibold border-t pt-2">
        <span>Salario Liquido</span>
        <span>{formatCurrency(cltNetSalary.netSalary)}</span>
      </div>
    </div>

    {/* Beneficios */}
    <div className="mt-4 p-3 rounded bg-green-100 dark:bg-green-900/30">
      <div className="flex justify-between text-sm">
        <span>(+) Beneficios</span>
        <span>+ {formatCurrency(cltCost.benefitsAmount)}</span>
      </div>
      <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
        <span>Total Recebido</span>
        <span className="text-green-700 dark:text-green-300">
          {formatCurrency(cltNetSalary.netSalary + cltCost.benefitsAmount)}
        </span>
      </div>
    </div>

    {/* Collapsible detalhamento INSS/IRRF */}
  </CardContent>
</Card>
```

### Card 3 - Equivalente PJ

```tsx
<Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
  <CardHeader>
    <CardTitle>3. Equivalente PJ (Simples Nacional)</CardTitle>
    <CardDescription>
      Valor de contrato PJ para o mesmo custo empresa
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Calculo PJ */}
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Valor do Contrato</span>
        <span className="font-bold">{formatCurrency(pjEquivalentValue)}</span>
      </div>
      <div className="flex justify-between text-destructive">
        <span>(-) Impostos (~15% Simples)</span>
        <span>- {formatCurrency(pjEstimatedTax)}</span>
      </div>
      <div className="flex justify-between font-bold text-lg border-t pt-2">
        <span>Liquido Estimado</span>
        <span className="text-amber-700 dark:text-amber-300">
          {formatCurrency(pjNetEstimate)}
        </span>
      </div>
    </div>

    {/* Comparativo */}
    <div className="mt-4 p-3 rounded bg-amber-100 dark:bg-amber-900/30">
      <p className="text-sm font-medium mb-2">Comparativo com CLT:</p>
      <div className="flex justify-between">
        <span>Diferenca no liquido</span>
        <span className="font-bold text-green-600">
          + {formatCurrency(netDifference)} (+{netDifferencePercent}%)
        </span>
      </div>
    </div>

    {/* Aviso */}
    <div className="mt-4 p-3 rounded border border-amber-300 dark:border-amber-700 text-sm">
      <p className="font-medium">Importante:</p>
      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
        <li>PJ nao tem FGTS, 13o, ferias remuneradas</li>
        <li>Aliquota de 15% e estimativa (varia por anexo/faturamento)</li>
        <li>PJ deve arcar com contador e obrigacoes fiscais</li>
      </ul>
    </div>
  </CardContent>
</Card>
```

## Cores dos Cards

| Area | Cor Principal | Justificativa |
|------|---------------|---------------|
| Custo Empresa | Azul | Representa a perspectiva do empregador |
| Salario Liquido | Verde | Representa ganho/dinheiro no bolso |
| PJ Equivalente | Amber/Dourado | Representa alternativa/opcao |

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/calculator/CalculatorResults.tsx` | Reescrever com 3 cards verticais |
| `src/components/calculator/CalculatorBreakdown.tsx` | Integrar como Collapsibles internos |
| `src/pages/EmployeeCalculator.tsx` | Remover import do CalculatorBreakdown separado |

## Notas Tecnicas

- Manter a logica de calculo existente em `employeeCostCalculator.ts` e `netSalaryCalculator.ts`
- Usar a constante `PJ_SIMPLES_TAX_RATE = 0.15` ja existente para Simples Nacional
- Layout responsivo: em telas menores, os cards ficam empilhados verticalmente
- Collapsibles comecam fechados para nao sobrecarregar a interface inicial

