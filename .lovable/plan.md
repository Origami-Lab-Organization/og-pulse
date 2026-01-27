
# Plano: Etapa 2 do Wizard de Novo Funcionario (Contratacao)

## Resumo

Ajustar a Etapa 2 do cadastro de funcionario para exibir campos dinamicos por tipo de contratacao, calcular automaticamente encargos e provisoes em tempo real usando o motor de calculo existente (`calculateEmployeeCost`), e exibir um card de "Resumo Mensal (Estimado)" com breakdown completo.

---

## O Que Ja Existe

1. **Motor de Calculo**: `src/lib/employeeCostCalculator.ts` - Funcao `calculateEmployeeCost()` ja implementada com logica para CLT, Menor Aprendiz, Estagiario, PJ e Socio.

2. **Perfil de Encargos**: Hook `usePayrollProfile()` busca as aliquotas configuradas do tenant.

3. **Tipos**: `ContractType` e `CONTRACT_TYPE_LABELS` ja definidos em `src/types/employee.ts`.

4. **Formulario Atual**: `EmployeeFormDialog.tsx` tem a estrutura do wizard, mas Step 2 mostra campos fixos (todos visiveis) e campos de encargos editaveis.

---

## Mudancas Necessarias

### 1. Remocoes

- Remover campo "Salario Liquido" do formulario
- Remover `salarioLiquido` do schema Zod e dos default values
- Remover `salarioLiquidoDisplay` state

### 2. Novos Campos no Schema

Adicionar ao schema Zod:
- `bolsaAuxilio` (number, min 0) - Para Estagiario
- `valorContratoPj` (number, min 0) - Para PJ
- `dividendos` (number, min 0) - Para Socio

### 3. Validacao Dinamica por Tipo

Implementar validacao customizada no Zod usando `.refine()`:
- CLT / Menor Aprendiz: `salarioMensal > 0`
- Estagiario: `bolsaAuxilio > 0`
- PJ: `valorContratoPj > 0`
- Socio: `proLabore > 0 OU dividendos > 0`

### 4. Campos Dinamicos na UI (Card "Valores")

Exibir campos conforme `tipoContratacao`:

```text
+----------------+-------------------------------------------+
| Tipo           | Campos Exibidos                           |
+----------------+-------------------------------------------+
| CLT            | Salario Bruto (editavel)                  |
| Menor Aprendiz | Salario Bruto (editavel)                  |
| Estagiario     | Bolsa-Auxilio (editavel)                  |
| PJ             | Valor Mensal do Contrato (editavel)       |
| Socio          | Pro-Labore (editavel), Dividendos (edit.) |
+----------------+-------------------------------------------+
```

### 5. Card "Encargos" - Campos READ-ONLY

Todos os campos de encargos serao somente leitura (disabled inputs):
- FGTS
- INSS Empresa  
- 13o Salario (provisao) - OU "Provisao Recesso" para Estagiario
- Ferias + 1/3 (provisao)

Regras de exibicao:
- Estagiario: Substituir "13o Salario" por "Provisao Recesso"; ocultar "Ferias"
- PJ: Mostrar todos zerados ou ocultar completamente o card
- Socio: Mostrar apenas FGTS e INSS (sobre pro-labore)

### 6. Integracao com Motor de Calculo

Usar `useEffect` para recalcular sempre que mudar:
- `tipoContratacao`
- `salarioMensal` / `bolsaAuxilio` / `valorContratoPj` / `proLabore` / `dividendos`
- `localBenefits` / `localTools`

Chamar `calculateEmployeeCost()` e preencher automaticamente:
- `fgts`, `inssEmpresa`, `decimoTerceiro`, `ferias`
- Valores do breakdown para exibir no resumo

### 7. Novo Card "Resumo Mensal (Estimado)"

Adicionar ao final da Etapa 2:

```text
+------------------------------------------+
| Resumo Mensal (Estimado)                 |
+------------------------------------------+
| Base                         R$ X.XXX,XX |
| Encargos                     R$ X.XXX,XX |
| Provisoes                    R$ X.XXX,XX |
| Beneficios                   R$ X.XXX,XX |
| Ferramentas                  R$ X.XXX,XX |
+------------------------------------------+
| CUSTO TOTAL MENSAL          R$ XX.XXX,XX |
| CUSTO TOTAL ANUAL          R$ XXX.XXX,XX |
+------------------------------------------+
| (!) Calculo estimado; valide com         |
|     contabilidade.                       |
+------------------------------------------+
```

---

## Detalhamento Tecnico

### Arquivo: `src/components/employees/EmployeeFormDialog.tsx`

**1. Imports Adicionais:**
```typescript
import { usePayrollProfile } from '@/hooks/usePayrollProfile';
import { calculateEmployeeCost, CostBreakdown } from '@/lib/employeeCostCalculator';
import { AlertCircle } from 'lucide-react';
```

**2. Schema Zod Atualizado:**
```typescript
const formSchema = z.object({
  // ... campos existentes ...
  // REMOVER: salarioLiquido
  bolsaAuxilio: z.number().min(0),
  valorContratoPj: z.number().min(0),
  dividendos: z.number().min(0),
}).refine((data) => {
  switch (data.tipoContratacao) {
    case 'CLT':
    case 'MENOR_APRENDIZ':
      return data.salarioMensal > 0;
    case 'ESTAGIO':
      return data.bolsaAuxilio > 0;
    case 'PJ':
      return data.valorContratoPj > 0;
    case 'SOCIO':
      return data.proLabore > 0 || data.dividendos > 0;
    default:
      return true;
  }
}, {
  message: 'Preencha o valor base conforme o tipo de contratacao',
  path: ['salarioMensal'],
});
```

**3. Estados Adicionais:**
```typescript
const [bolsaAuxilioDisplay, setBolsaAuxilioDisplay] = useState('');
const [valorContratoPjDisplay, setValorContratoPjDisplay] = useState('');
const [dividendosDisplay, setDividendosDisplay] = useState('');
const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
```

**4. Hook do Perfil de Encargos:**
```typescript
const { data: payrollProfile } = usePayrollProfile();
```

**5. useEffect para Calculo Automatico:**
```typescript
useEffect(() => {
  if (!payrollProfile) return;
  
  const benefitsTotal = localBenefits.reduce((sum, b) => sum + b.monthlyValue, 0);
  const toolsTotal = localTools.reduce((sum, t) => sum + t.monthlyCost, 0);
  
  const breakdown = calculateEmployeeCost({
    tipoContratacao: form.getValues('tipoContratacao'),
    salarioBruto: form.getValues('salarioMensal'),
    bolsaAuxilio: form.getValues('bolsaAuxilio'),
    valorContratoPj: form.getValues('valorContratoPj'),
    proLabore: form.getValues('proLabore'),
    dividendos: form.getValues('dividendos'),
    benefitsTotalMonthly: benefitsTotal,
    toolsTotalMonthly: toolsTotal,
    payrollProfile,
  });
  
  setCostBreakdown(breakdown);
  
  // Atualizar campos read-only
  form.setValue('fgts', breakdown.details.fgts);
  form.setValue('inssEmpresa', breakdown.details.inss);
  form.setValue('decimoTerceiro', breakdown.details.provisao13);
  form.setValue('ferias', breakdown.details.provisaoFerias);
  
  // Atualizar displays
  setFgtsDisplay(formatCurrency(breakdown.details.fgts));
  setInssDisplay(formatCurrency(breakdown.details.inss));
  setDecimoDisplay(formatCurrency(breakdown.details.provisao13 || breakdown.details.provisaoRecesso));
  setFeriasDisplay(formatCurrency(breakdown.details.provisaoFerias));
}, [tipoContratacao, salarioMensal, bolsaAuxilio, valorContratoPj, proLabore, dividendos, payrollProfile, localBenefits, localTools]);
```

**6. Funcao renderFinancialFields() Refatorada:**

Card "Valores" com renderizacao condicional:
```typescript
{/* CLT / Menor Aprendiz */}
{(tipoContratacao === 'CLT' || tipoContratacao === 'MENOR_APRENDIZ') && (
  <FormField name="salarioMensal" ... />
)}

{/* Estagiario */}
{tipoContratacao === 'ESTAGIO' && (
  <FormField name="bolsaAuxilio" label="Bolsa-Auxilio" ... />
)}

{/* PJ */}
{tipoContratacao === 'PJ' && (
  <FormField name="valorContratoPj" label="Valor Mensal do Contrato" ... />
)}

{/* Socio */}
{tipoContratacao === 'SOCIO' && (
  <>
    <FormField name="proLabore" label="Pro-Labore (mensal)" ... />
    <FormField name="dividendos" label="Dividendos (mensal)" ... />
  </>
)}
```

Card "Encargos" com campos disabled:
```typescript
<Input 
  disabled 
  value={fgtsDisplay}
  className="bg-muted"
/>
```

Labels dinamicos para Estagiario:
```typescript
{tipoContratacao === 'ESTAGIO' ? 'Provisao Recesso' : '13o Salario'}
```

**7. Novo Componente: Card Resumo Mensal**
```typescript
const renderCostSummaryCard = () => {
  if (!costBreakdown) return null;
  
  return (
    <Card className="mt-6 border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Resumo Mensal (Estimado)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span>Base</span>
          <span className="text-right">{formatCurrency(costBreakdown.baseAmount)}</span>
          <span>Encargos</span>
          <span className="text-right">{formatCurrency(costBreakdown.chargesAmount)}</span>
          <span>Provisoes</span>
          <span className="text-right">{formatCurrency(costBreakdown.provisionsAmount)}</span>
          <span>Beneficios</span>
          <span className="text-right">{formatCurrency(costBreakdown.benefitsAmount)}</span>
          <span>Ferramentas</span>
          <span className="text-right">{formatCurrency(costBreakdown.toolsAmount)}</span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between font-bold text-lg">
          <span>CUSTO TOTAL MENSAL</span>
          <span className="text-primary">{formatCurrency(costBreakdown.totalMonthlyCost)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>CUSTO TOTAL ANUAL</span>
          <span>{formatCurrency(costBreakdown.totalAnnualCost)}</span>
        </div>
        
        <Alert variant="warning" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Calculo estimado; valide com contabilidade.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
```

---

## Arquivos a Modificar

1. **`src/components/employees/EmployeeFormDialog.tsx`**
   - Adicionar imports (`usePayrollProfile`, `calculateEmployeeCost`, `Separator`, `Calculator`, `AlertCircle`)
   - Atualizar schema Zod (remover `salarioLiquido`, adicionar `bolsaAuxilio`, `valorContratoPj`, `dividendos`, validacao dinamica)
   - Adicionar estados para novos campos e `costBreakdown`
   - Adicionar hook `usePayrollProfile()`
   - Adicionar `useEffect` para calculo automatico
   - Refatorar `renderFinancialFields()` com campos condicionais e read-only
   - Adicionar `renderCostSummaryCard()` no final da Etapa 2
   - Remover referencias a `salarioLiquido`

2. **`src/types/employee.ts`** (opcional)
   - Adicionar campos `bolsaAuxilio`, `valorContratoPj`, `dividendos` se nao existirem no Employee interface

---

## Fluxo de Usuario

1. Usuario seleciona "Tipo de Contratacao" no dropdown
2. Campos de valores mudam dinamicamente conforme o tipo
3. Usuario preenche o valor base (ex: Salario Bruto para CLT)
4. Sistema calcula automaticamente FGTS, INSS, provisoes
5. Card "Resumo Mensal" mostra breakdown em tempo real
6. Valores de Beneficios/Ferramentas aparecem como 0 ate preencher Etapas 3/4
7. Aviso "Calculo estimado; valide com contabilidade" sempre visivel

---

## Criterios de Aceite

1. Campo "Salario Liquido" removido
2. Campos base mudam conforme tipo de contratacao
3. Encargos/provisoes sao read-only e calculados automaticamente
4. Para Estagiario: FGTS/INSS = 0, exibe "Provisao Recesso"
5. Para PJ: todos encargos/provisoes = 0
6. Para Socio: encargos apenas sobre Pro-Labore
7. Card Resumo recalcula em tempo real
8. Validacao: Socio precisa Pro-Labore OU Dividendos > 0
