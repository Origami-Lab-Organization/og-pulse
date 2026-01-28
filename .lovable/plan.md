
# Plano: Corrigir Calculo de Provisoes de Funcionarios

## Analise do Problema

A calculadora de referência mostra provisões detalhadas que o sistema atual não exibe corretamente:

| Item | Calculadora Referência | Sistema Atual |
|------|------------------------|---------------|
| 13º prop. 1/12 | R$ 208,33 | R$ 208,33 ✓ |
| Férias prop. 1/12 | R$ 208,33 | (agrupado) |
| 1/3 de férias | R$ 69,44 | (agrupado) |
| FGTS férias (prov) | R$ 22,22 | (oculto em encargosFerias) |
| FGTS 13º (prov) | R$ 16,67 | (oculto em encargos13) |

### Diferenca Principal

O código atual calcula `provisaoFerias` como:
```typescript
details.provisaoFerias = (baseAmount * (1 + 1/3)) / 12;  // = 277,77
```

Isso agrupa Férias + 1/3 em um único valor, enquanto a calculadora de referência separa:
- Férias: R$ 208,33 (salário / 12)
- 1/3 Férias: R$ 69,44 (férias / 3)

Os campos FGTS sobre provisões (`encargos13` e `encargosFerias`) existem no código mas são somados no total de encargos sem exibição detalhada.

---

## Solucao Proposta

### 1. Expandir CostBreakdownDetails

Adicionar campos separados para exibição detalhada:

```typescript
// src/lib/employeeCostCalculator.ts

export interface CostBreakdownDetails {
  // Encargos sobre salário
  fgts: number;
  inss: number;
  rat: number;
  terceiros: number;
  outros: number;
  
  // Provisões detalhadas
  provisao13: number;           // 13º salário (salário / 12)
  provisaoFeriasBase: number;   // NOVO: Férias base (salário / 12)
  provisaoFeriasTerco: number;  // NOVO: 1/3 de férias (férias / 3)
  provisaoFerias: number;       // Total férias + 1/3 (mantido para compatibilidade)
  provisaoRecesso: number;      // Recesso estagiário
  
  // Encargos sobre provisões
  fgts13: number;               // NOVO: FGTS sobre 13º
  fgtsFerias: number;           // NOVO: FGTS sobre férias + 1/3
  encargos13: number;           // Total encargos 13º (mantido)
  encargosFerias: number;       // Total encargos férias (mantido)
}
```

### 2. Atualizar Calculo em employeeCostCalculator.ts

```typescript
case 'CLT':
case 'MENOR_APRENDIZ': {
  baseAmount = input.salarioBruto;
  const fgtsRate = input.tipoContratacao === 'CLT' 
    ? profile.fgtsRateClt 
    : profile.fgtsRateApprentice;

  // Encargos sobre salário
  details.fgts = baseAmount * fgtsRate;
  details.inss = baseAmount * profile.inssPatronalRate;
  details.rat = baseAmount * profile.ratRate;
  details.terceiros = baseAmount * profile.terceirosRate;
  details.outros = baseAmount * profile.outrosRate;

  // Provisões detalhadas
  details.provisao13 = baseAmount / 12;
  details.provisaoFeriasBase = baseAmount / 12;      // Férias (sem 1/3)
  details.provisaoFeriasTerco = details.provisaoFeriasBase / 3;  // 1/3 férias
  details.provisaoFerias = details.provisaoFeriasBase + details.provisaoFeriasTerco;

  // FGTS sobre provisões (separado)
  details.fgts13 = profile.applyFgtsOn13th ? details.provisao13 * fgtsRate : 0;
  details.fgtsFerias = profile.applyFgtsOnVacation ? details.provisaoFerias * fgtsRate : 0;

  // Encargos totais sobre provisões (para manter compatibilidade)
  const rates13 = sum13thApplicableRates(profile, fgtsRate);
  const ratesVacation = sumVacationApplicableRates(profile, fgtsRate);
  
  details.encargos13 = details.provisao13 * rates13;
  details.encargosFerias = details.provisaoFerias * ratesVacation;

  // Totais
  chargesAmount = details.fgts + details.inss + details.rat + details.terceiros + details.outros
                + details.encargos13 + details.encargosFerias;
  provisionsAmount = details.provisao13 + details.provisaoFerias;
  break;
}
```

### 3. Atualizar Interface do Formulario

Exibir os campos detalhados no formulário de funcionários:

**Arquivo:** `src/components/employees/EmployeeFormDialog.tsx`

```typescript
{/* Encargos e Provisões - Se aplicável */}
{(showCharges || showProvisions) && tipoContratacao !== 'PJ' && (
  <>
    <Separator />
    <div>
      <h4 className="text-sm font-medium mb-1">
        {tipoContratacao === 'ESTAGIO' ? 'Provisões' : 'Encargos e Provisões'}
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        Calculados automaticamente
      </p>
      
      {/* Encargos sobre Salário */}
      {showCharges && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Encargos sobre Salário</p>
          <div className="grid grid-cols-2 gap-4">
            <FormItem>
              <FormLabel>FGTS (8%)</FormLabel>
              <Input disabled value={formatCurrency(costBreakdown?.details.fgts || 0)} className="bg-muted" />
            </FormItem>
            {/* INSS, RAT, etc - se configurados */}
          </div>
        </div>
      )}
      
      {/* Provisões */}
      {showProvisions && tipoContratacao !== 'ESTAGIO' && tipoContratacao !== 'SOCIO' && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Provisões Mensais</p>
          <div className="grid grid-cols-2 gap-4">
            <FormItem>
              <FormLabel>13º prop. 1/12</FormLabel>
              <Input disabled value={formatCurrency(costBreakdown?.details.provisao13 || 0)} className="bg-muted" />
            </FormItem>
            <FormItem>
              <FormLabel>Férias prop. 1/12</FormLabel>
              <Input disabled value={formatCurrency(costBreakdown?.details.provisaoFeriasBase || 0)} className="bg-muted" />
            </FormItem>
            <FormItem>
              <FormLabel>1/3 de Férias</FormLabel>
              <Input disabled value={formatCurrency(costBreakdown?.details.provisaoFeriasTerco || 0)} className="bg-muted" />
            </FormItem>
          </div>
        </div>
      )}
      
      {/* Encargos sobre Provisões */}
      {showCharges && showProvisions && tipoContratacao !== 'ESTAGIO' && tipoContratacao !== 'SOCIO' && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Encargos sobre Provisões</p>
          <div className="grid grid-cols-2 gap-4">
            <FormItem>
              <FormLabel>FGTS 13º (prov)</FormLabel>
              <Input disabled value={formatCurrency(costBreakdown?.details.fgts13 || 0)} className="bg-muted" />
            </FormItem>
            <FormItem>
              <FormLabel>FGTS Férias (prov)</FormLabel>
              <Input disabled value={formatCurrency(costBreakdown?.details.fgtsFerias || 0)} className="bg-muted" />
            </FormItem>
          </div>
        </div>
      )}
    </div>
  </>
)}
```

### 4. Atualizar Funcionarios Existentes

Criar script/edge function para recalcular e atualizar o `breakdown_json` de todos os funcionários existentes com os novos campos.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/employeeCostCalculator.ts` | Adicionar campos detalhados e ajustar cálculo |
| `src/components/employees/EmployeeFormDialog.tsx` | Exibir provisões detalhadas |
| `src/hooks/useEmployees.ts` | Garantir mapeamento dos novos campos |

---

## Exemplo de Calculo (CLT R$ 2.500)

| Item | Fórmula | Valor |
|------|---------|-------|
| Salário | - | R$ 2.500,00 |
| FGTS salário | 2.500 × 8% | R$ 200,00 |
| 13º prop. 1/12 | 2.500 / 12 | R$ 208,33 |
| Férias prop. 1/12 | 2.500 / 12 | R$ 208,33 |
| 1/3 de Férias | 208,33 / 3 | R$ 69,44 |
| FGTS 13º (prov) | 208,33 × 8% | R$ 16,67 |
| FGTS Férias (prov) | 277,77 × 8% | R$ 22,22 |
| **Total** | - | **R$ 3.225,00** |

---

## Criterios de Aceite

1. O formulário de funcionário CLT exibe todas as provisões separadamente
2. FGTS sobre 13º aparece como linha separada
3. FGTS sobre Férias aparece como linha separada
4. 1/3 de férias aparece separado da provisão de férias
5. O total de custo mensal confere com a calculadora de referência
6. Funcionários existentes têm seus custos recalculados
7. O `breakdown_json` salva todos os campos detalhados
