

# Plano: Calculadora de Custos de Funcionário

## Objetivo

Criar uma calculadora independente que permita simular custos de contratação CLT vs PJ sem necessidade de cadastrar o funcionário. A ferramenta calculará:
1. **Custo para a Empresa** - Salário + Encargos + Provisões + Benefícios
2. **Salário Líquido do Funcionário** - Salário Bruto menos descontos (INSS, IRRF)
3. **Comparativo CLT vs PJ** - Visualização lado a lado para tomada de decisão

## Arquitetura

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Página: Calculadora                           │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌────────────────────────────┐ │
│  │    INPUTS                    │  │   RESULTADOS              │ │
│  │  • Salário Bruto CLT         │  │   ┌────────┐ ┌────────┐   │ │
│  │  • Benefícios (opcional)     │  │   │  CLT   │ │   PJ   │   │ │
│  │  • Jornada Mensal            │  │   └────────┘ └────────┘   │ │
│  └─────────────────────────────┘  │                            │ │
│                                    │   Custo Empresa: R$ X     │ │
│                                    │   Sal. Líquido: R$ Y      │ │
│                                    │                            │ │
│                                    │   [Detalhamento]          │ │
│                                    └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Cálculos a Implementar

### 1. Salário Líquido CLT (Descontos do Funcionário)

**INSS do Empregado (Tabela 2024):**
| Faixa Salarial | Alíquota |
|----------------|----------|
| Até R$ 1.412,00 | 7,5% |
| R$ 1.412,01 a R$ 2.666,68 | 9% |
| R$ 2.666,69 a R$ 4.000,03 | 12% |
| R$ 4.000,04 a R$ 7.786,02 | 14% |
| Acima de R$ 7.786,02 | Teto: R$ 908,86 |

**IRRF (Tabela 2024):**
| Base de Cálculo | Alíquota | Dedução |
|-----------------|----------|---------|
| Até R$ 2.259,20 | Isento | - |
| R$ 2.259,21 a R$ 2.826,65 | 7,5% | R$ 169,44 |
| R$ 2.826,66 a R$ 3.751,05 | 15% | R$ 381,44 |
| R$ 3.751,06 a R$ 4.664,68 | 22,5% | R$ 662,77 |
| Acima de R$ 4.664,68 | 27,5% | R$ 896,00 |

**Fórmula:**
```
Base IRRF = Salário Bruto - INSS - (Dependentes × R$ 189,59)
Salário Líquido = Salário Bruto - INSS - IRRF
```

### 2. Comparativo PJ

Para o comparativo, consideramos:
- **Valor PJ sugerido** = Custo Total CLT (para equivalência de custo empresa)
- **Valor PJ mínimo** = Salário Bruto CLT + Encargos + Provisões (sem benefícios)
- Mostrar quanto o profissional receberia líquido como PJ (estimando ~15% de impostos no Simples)

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/netSalaryCalculator.ts` | Funções para calcular INSS, IRRF e salário líquido |
| `src/pages/EmployeeCalculator.tsx` | Página da calculadora |
| `src/components/calculator/CalculatorInputs.tsx` | Formulário de entrada |
| `src/components/calculator/CalculatorResults.tsx` | Cards de resultado CLT vs PJ |
| `src/components/calculator/CalculatorBreakdown.tsx` | Detalhamento expandível |

### Modificações

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/calculator` |
| `src/components/layout/AppSidebar.tsx` | Adicionar link "Calculadora" no grupo Gestão |

## Detalhes Técnicos

### 1. Calculador de Salário Líquido (`netSalaryCalculator.ts`)

```typescript
interface INSSBracket {
  min: number;
  max: number;
  rate: number;
}

interface IRRFBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

// Tabelas atualizadas 2024
const INSS_BRACKETS: INSSBracket[] = [
  { min: 0, max: 1412.00, rate: 0.075 },
  { min: 1412.01, max: 2666.68, rate: 0.09 },
  { min: 2666.69, max: 4000.03, rate: 0.12 },
  { min: 4000.04, max: 7786.02, rate: 0.14 },
];
const INSS_CEILING = 908.86;

const IRRF_BRACKETS: IRRFBracket[] = [
  { min: 0, max: 2259.20, rate: 0, deduction: 0 },
  { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
  { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 381.44 },
  { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
  { min: 4664.69, max: Infinity, rate: 0.275, deduction: 896.00 },
];
const DEPENDENT_DEDUCTION = 189.59;

export function calculateINSS(salarioBruto: number): number
export function calculateIRRF(salarioBruto: number, inss: number, dependents: number): number
export function calculateNetSalary(salarioBruto: number, dependents: number): NetSalaryBreakdown
```

### 2. Página da Calculadora

**Inputs:**
- Salário Bruto CLT (obrigatório)
- Benefícios mensais (opcional, default 0)
- Jornada mensal (default 168h)
- Número de dependentes IRRF (default 0)

**Outputs lado a lado:**

| Métrica | CLT | PJ Equivalente |
|---------|-----|----------------|
| Custo Empresa | R$ X | R$ X |
| Valor Bruto | R$ Y | R$ Y |
| Descontos | R$ Z | ~15% Simples |
| Líquido Estimado | R$ W | R$ V |
| Custo/Hora | R$ A | R$ B |

### 3. Navegação

Adicionar no grupo "Gestão" do sidebar (acessível a managers/admins):
```typescript
{ title: 'Calculadora', url: '/calculator', icon: Calculator, requiresManager: true }
```

## Fluxo de Uso

1. Usuário acessa "Calculadora" no menu lateral
2. Informa salário bruto CLT desejado e benefícios
3. Sistema calcula em tempo real:
   - **CLT**: Custo empresa, encargos, provisões, salário líquido
   - **PJ**: Valor equivalente de contrato para mesmo custo empresa
4. Usuário visualiza comparativo para decisão

## Interface Visual

A calculadora utilizará:
- Cards lado a lado (CLT vs PJ)
- Cores diferenciadas (primary para CLT, secondary para PJ)
- Collapsible para detalhamento de cálculos
- Tooltips explicando cada item
- Input com máscara de moeda (reutilizar `formatCurrencyMask`)

## Validações

- Salário bruto mínimo: R$ 1.412,00 (salário mínimo 2024)
- Benefícios: >= 0
- Jornada: 1-220 horas
- Dependentes: 0-10

