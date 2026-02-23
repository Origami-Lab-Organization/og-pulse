

## Ajustar Analytics para considerar data de admissao do funcionario

### Problema

Na tabela de "Utilizacao de Funcionarios" do Analytics, a capacidade e calculada como `jornada_diaria * dias_uteis_do_mes` para todos os funcionarios igualmente, sem considerar:

1. Funcionarios admitidos **apos** o mes selecionado nao deveriam aparecer
2. Funcionarios admitidos **durante** o mes selecionado deveriam ter a capacidade proporcional (apenas dias uteis a partir da data de admissao)

### Alteracoes

**Arquivo: `src/hooks/useAnalyticsData.ts`**

1. Adicionar `data_admissao` ao select da query de `project_members` (linha 150):
   - Alterar o select para incluir `data_admissao` nos campos do employee

2. Filtrar funcionarios cuja `data_admissao` e posterior ao fim do periodo selecionado (nao devem aparecer)

3. Calcular capacidade proporcional: se `data_admissao` cai dentro do mes selecionado, contar dias uteis apenas a partir da data de admissao ate o fim do mes (usando a funcao `countWorkingDays` ja existente)

### Detalhes tecnicos

No select de members (linha 150):
```typescript
.select('id, project_id, employee_id, employee:employees(id, nome, cargo, total_monthly_cost_estimated, jornada_mensal, jornada_diaria, data_admissao)')
```

Na secao de employee utilization (linhas 311-357), ao calcular capacity:
```typescript
// Determinar data de inicio efetiva do funcionario no periodo
const admDate = emp.data_admissao ? parseISO(emp.data_admissao) : null;

// Se admissao e apos o fim do periodo, pular funcionario
if (admDate && admDate > filters.endDate) continue;

// Se admissao e durante o periodo, ajustar dias uteis
const effectiveStart = admDate && admDate > filters.startDate ? admDate : filters.startDate;
const effectiveWorkingDays = countWorkingDays(effectiveStart, filters.endDate, holidays);
const capacity = jornadaDiaria * effectiveWorkingDays;
```

Essa mesma logica sera aplicada tanto para funcionarios com horas (timesheets) quanto para funcionarios ociosos (allocated but no hours).

### Resumo

| Aspecto | Antes | Depois |
|---|---|---|
| Query members | Sem `data_admissao` | Com `data_admissao` |
| Funcionario admitido apos o mes | Aparece com capacidade cheia | Nao aparece |
| Funcionario admitido no meio do mes | Capacidade cheia (ex: 168h) | Capacidade proporcional (ex: 80h) |

