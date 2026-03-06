

## Plano: Corrigir cálculos financeiros para Estágio

### Problema
Dois bugs no `calculateAutoCalcs` (TerminationStep3Payroll.tsx):

1. **Valor R$ 0,00**: Para contrato ESTAGIO, o código usa `salary` (= `employee.salarioMensal`), mas estagiários têm remuneração em `employee.bolsaAuxilio`. Resultado: saldo = 0.

2. **NaN**: `monthsWorked` depende de `parseDateString(employee.dataAdmissao)`. Quando `dataAdmissao` é string vazia (vindo do banco como null → mapeado para `''` em `buildEmployeeLike`), `parseDateString` retorna data inválida → NaN se propaga para `recessDays` e `recessValue`.

### Correções

#### `src/components/employees/termination-wizard/TerminationStep3Payroll.tsx`
- No case `ESTAGIO`: usar `employee.bolsaAuxilio || salary` como base de cálculo em vez de apenas `salary`
- Na linha 65-66: adicionar guard para `dataAdmissao` vazio — se não houver data de admissão, usar fallback (ex: 0 meses) ou a própria `termination_date`

#### `src/components/terminations/detail/TerminationDetailFinancialTab.tsx`
- Em `buildEmployeeLike`: garantir que `bolsaAuxilio` está mapeado corretamente (já está na linha 41, ok)
- Em `buildWizardDataLike`: sem alteração necessária

### Detalhe técnico
```text
ANTES (ESTAGIO):
  salary = employee.salarioMensal  → 0 para estagiário
  stipendBalance = (0 / 30) * 28 = 0

DEPOIS:
  stipend = employee.bolsaAuxilio || salary
  stipendBalance = (stipend / 30) * 28 = valor correto

monthsWorked guard:
  if (!employee.dataAdmissao) → monthsWorked = 0 (sem NaN)
```

