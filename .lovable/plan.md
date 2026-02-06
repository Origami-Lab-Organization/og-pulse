
# Plano: Ajustes na Calculadora de Custos

## Alteracoes Solicitadas

1. **Cores neutras nos cards** - Remover cores azul, verde e amber dos cards, usando uma paleta neutra
2. **Aliquota Simples Nacional de 6%** - Alterar a taxa de 15% para 6%
3. **Seletor de base PJ** - Permitir ao usuario escolher entre "Custo Total Empresa" ou "Salario Bruto" como base para o calculo do equivalente PJ

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/netSalaryCalculator.ts` | Alterar `PJ_SIMPLES_TAX_RATE` de 0.15 para 0.06 |
| `src/components/calculator/CalculatorResults.tsx` | Remover cores e adicionar logica de selecao de base PJ |
| `src/pages/EmployeeCalculator.tsx` | Adicionar estado para base PJ selecionada |

## Detalhes de Implementacao

### 1. Alterar Aliquota Simples Nacional

No arquivo `src/lib/netSalaryCalculator.ts`:

```typescript
// Antes
export const PJ_SIMPLES_TAX_RATE = 0.15;

// Depois
export const PJ_SIMPLES_TAX_RATE = 0.06;
```

### 2. Cores Neutras nos Cards

Substituir as cores especificas por classes neutras:

| Elemento | Antes | Depois |
|----------|-------|--------|
| Card 1 (Custo Empresa) | `border-blue-200 bg-blue-50/50` | `border-border` |
| Card 2 (Salario Liquido) | `border-green-200 bg-green-50/50` | `border-border` |
| Card 3 (PJ) | `border-amber-200 bg-amber-50/50` | `border-border` |
| Icones | Cores especificas | `text-primary` |
| Destaques internos | `bg-blue-100`, `bg-green-100`, `bg-amber-100` | `bg-muted` |
| Textos destacados | `text-blue-700`, `text-green-700`, `text-amber-700` | `text-foreground` |
| Bordas nos collapsibles | `border-blue-200`, `border-green-200` | `border-border` |

### 3. Seletor de Base para Calculo PJ

Adicionar um RadioGroup no Card 3 permitindo escolher a base de comparacao:

```text
┌─────────────────────────────────────────────────────────────┐
│  3. Equivalente PJ (Simples Nacional)                       │
│                                                             │
│  Comparar com:                                              │
│  ( ) Custo Total Empresa (R$ 8.145)                        │
│  (x) Salario Bruto (R$ 5.000)                              │
│                                                             │
│  Valor do Contrato: R$ 5.000                               │
│  (-) Impostos (~6% Simples): R$ 300                        │
│  ─────────────────────────────────────────                 │
│  Liquido Estimado: R$ 4.700                                │
│                                                             │
│  Comparativo com CLT:                                       │
│  Diferenca no liquido: -R$ 303,96 (-6,1%)                  │
└─────────────────────────────────────────────────────────────┘
```

**Implementacao:**

1. No `EmployeeCalculator.tsx`, adicionar estado:
```typescript
const [pjBase, setPjBase] = useState<'total_cost' | 'gross_salary'>('total_cost');
```

2. Passar como prop para `CalculatorResults`:
```typescript
<CalculatorResults
  cltCost={cltCost}
  cltNetSalary={cltNetSalary}
  jornadaMensal={jornadaNum}
  pjBase={pjBase}
  setPjBase={setPjBase}
/>
```

3. No `CalculatorResults.tsx`, adicionar RadioGroup:
```typescript
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// No Card 3, antes do calculo
<div className="space-y-2">
  <p className="text-sm font-medium">Comparar com:</p>
  <RadioGroup value={pjBase} onValueChange={setPjBase}>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="total_cost" id="total_cost" />
      <Label htmlFor="total_cost">
        Custo Total Empresa ({formatCurrency(cltCost.totalMonthlyCost)})
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="gross_salary" id="gross_salary" />
      <Label htmlFor="gross_salary">
        Salario Bruto ({formatCurrency(cltNetSalary.grossSalary)})
      </Label>
    </div>
  </RadioGroup>
</div>

// Calculo do PJ baseado na selecao
const pjEquivalentValue = pjBase === 'total_cost' 
  ? cltCost.totalMonthlyCost 
  : cltNetSalary.grossSalary;
```

## Resumo Visual das Mudancas

### Antes (cores especificas)

```text
Card 1: Borda azul, fundo azul claro, icone azul
Card 2: Borda verde, fundo verde claro, icone verde  
Card 3: Borda amber, fundo amber claro, icone amber
```

### Depois (cores neutras)

```text
Card 1: Borda neutra, fundo neutro, icone primary
Card 2: Borda neutra, fundo neutro, icone primary
Card 3: Borda neutra, fundo neutro, icone primary + RadioGroup para selecao
```

## Aviso do Simples Nacional

Atualizar o texto do aviso no Card 3:

```typescript
// Antes
<li>Aliquota de 15% e estimativa (varia por anexo/faturamento)</li>

// Depois
<li>Aliquota de 6% e estimativa (varia por anexo/faturamento)</li>
```

## Notas Tecnicas

- Manter a responsividade existente nos grids
- Os Collapsibles continuam funcionando normalmente
- O comparativo de diferenca se adapta automaticamente a base selecionada
- Usar componente `RadioGroup` ja existente no projeto
