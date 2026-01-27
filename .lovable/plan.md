

# Plano: Ajustes na Etapa 2 do Wizard de Funcionarios

## Resumo das Mudancas

1. Atualizar os valores default das aliquotas para refletir o regime do Simples Nacional
2. Simplificar o card de resumo mostrando apenas custo de salario e encargos

---

## 1. Revisao das Aliquotas para Simples Nacional

### Aliquotas Atuais vs Simples Nacional

| Encargo                   | Valor Atual | Simples Nacional | Acao           |
|---------------------------|-------------|------------------|----------------|
| FGTS CLT                  | 8%          | 8%               | Manter         |
| FGTS Menor Aprendiz       | 2%          | 2%               | Manter         |
| INSS Patronal             | 20%         | **0%**           | **Alterar**    |
| RAT/SAT                   | 3%          | **0%**           | **Alterar**    |
| Terceiros (Sistema S)     | 5.8%        | **0%**           | **Alterar**    |
| INSS Pro-Labore           | 20%         | **0%**           | **Alterar**    |
| FGTS Pro-Labore           | 0%          | 0%               | Manter         |

### Justificativa Legal

No regime do Simples Nacional (LC 123/2006):
- **INSS Patronal**: Substituido pelo recolhimento unificado no DAS
- **RAT/SAT**: Incluido no DAS, nao ha pagamento separado
- **Terceiros (Sistema S)**: Empresas do Simples sao isentas de contribuicao ao Sistema S
- **FGTS**: Permanece obrigatorio (nao faz parte do DAS)

### Arquivos a Modificar

**1. `src/types/payrollProfile.ts`** - Alterar DEFAULT_PAYROLL_PROFILE:

```typescript
export const DEFAULT_PAYROLL_PROFILE = {
  fgtsRateClt: 0.08,           // Manter 8%
  fgtsRateApprentice: 0.02,    // Manter 2%
  inssPatronalRate: 0,         // Alterar de 0.20 para 0 (Simples)
  ratRate: 0,                  // Alterar de 0.03 para 0 (Simples)
  terceirosRate: 0,            // Alterar de 0.058 para 0 (Simples)
  outrosRate: 0,               // Manter 0
  inssPatronalProlaboreRate: 0, // Alterar de 0.20 para 0 (Simples)
  fgtsProlaboreRate: 0,        // Manter 0
  // Incidencia sobre provisoes - desativar INSS/RAT/Terceiros
  applyFgtsOn13th: true,
  applyInssOn13th: false,      // Alterar para false
  applyRatOn13th: false,       // Alterar para false
  applyTerceirosOn13th: false, // Alterar para false
  applyOutrosOn13th: false,
  applyFgtsOnVacation: true,
  applyInssOnVacation: false,  // Alterar para false
  applyRatOnVacation: false,   // Alterar para false
  applyTerceirosOnVacation: false, // Alterar para false
  applyOutrosOnVacation: false,
};
```

**2. Migration SQL** - Atualizar defaults na tabela:

```sql
ALTER TABLE public.payroll_profiles 
  ALTER COLUMN inss_patronal_rate SET DEFAULT 0,
  ALTER COLUMN rat_rate SET DEFAULT 0,
  ALTER COLUMN terceiros_rate SET DEFAULT 0,
  ALTER COLUMN inss_patronal_prolabore_rate SET DEFAULT 0,
  ALTER COLUMN apply_inss_on_13th SET DEFAULT false,
  ALTER COLUMN apply_rat_on_13th SET DEFAULT false,
  ALTER COLUMN apply_terceiros_on_13th SET DEFAULT false,
  ALTER COLUMN apply_inss_on_vacation SET DEFAULT false,
  ALTER COLUMN apply_rat_on_vacation SET DEFAULT false,
  ALTER COLUMN apply_terceiros_on_vacation SET DEFAULT false;
```

---

## 2. Simplificacao do Card de Resumo

### Alteracao em `src/components/employees/EmployeeFormDialog.tsx`

Modificar a funcao `renderCostSummaryCard()` para:

- Remover linhas de "Beneficios" e "Ferramentas"
- Substituir "Custo Total Mensal/Anual" por "Subtotal Salarial"
- Adicionar mensagem informativa sobre etapas seguintes

### Codigo Final do Card

```tsx
const renderCostSummaryCard = () => {
  if (!costBreakdown) return null;

  const subtotalSalarial = 
    costBreakdown.baseAmount + 
    costBreakdown.chargesAmount + 
    costBreakdown.provisionsAmount;

  return (
    <Card className="mt-6 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Resumo de Custo (Estimado)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Base</span>
          <span className="text-right font-medium">
            {formatCurrency(costBreakdown.baseAmount)}
          </span>
          <span className="text-muted-foreground">Encargos</span>
          <span className="text-right font-medium">
            {formatCurrency(costBreakdown.chargesAmount)}
          </span>
          <span className="text-muted-foreground">Provisões</span>
          <span className="text-right font-medium">
            {formatCurrency(costBreakdown.provisionsAmount)}
          </span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between font-bold text-lg">
          <span>SUBTOTAL SALARIAL</span>
          <span className="text-primary">
            {formatCurrency(subtotalSalarial)}
          </span>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Benefícios e ferramentas serão adicionados nas etapas seguintes.
        </p>
        
        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-warning-foreground">
            Cálculo estimado; valide com contabilidade.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Arquivos a Modificar

1. **`src/types/payrollProfile.ts`** - Atualizar DEFAULT_PAYROLL_PROFILE com aliquotas zeradas para Simples Nacional
2. **`src/components/employees/EmployeeFormDialog.tsx`** - Simplificar card de resumo
3. **Nova migration SQL** - Atualizar defaults na tabela payroll_profiles

---

## Resumo das Alteracoes

| Item                              | De           | Para         |
|-----------------------------------|--------------|--------------|
| INSS Patronal (default)           | 20%          | 0%           |
| RAT (default)                     | 3%           | 0%           |
| Terceiros (default)               | 5.8%         | 0%           |
| INSS Pro-Labore (default)         | 20%          | 0%           |
| Incidencia INSS/RAT/Terceiros     | true         | false        |
| Card Resumo - Beneficios          | Exibir       | Remover      |
| Card Resumo - Ferramentas         | Exibir       | Remover      |
| Card Resumo - Total               | Custo Total  | Subtotal Sal |

---

## Nota Importante

Os valores permanecem **configuraveis** no Perfil de Encargos em Configuracoes. Se o tenant optar por Lucro Presumido/Real no futuro, o administrador pode alterar as aliquotas para os valores tradicionais (20% INSS, 3% RAT, etc).

---

## Criterios de Aceite

1. Defaults do perfil de encargos refletem Simples Nacional (INSS/RAT/Terceiros = 0%)
2. FGTS permanece 8% CLT e 2% Menor Aprendiz
3. Card de resumo na Etapa 2 mostra apenas Base, Encargos, Provisoes e Subtotal Salarial
4. Mensagem informativa indica que beneficios/ferramentas virao nas proximas etapas
5. Aliquotas permanecem configuraveis em Configuracoes > Encargos/Folha

