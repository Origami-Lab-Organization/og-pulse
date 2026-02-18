

# Corrigir casas decimais nos campos de horas

## Problema

Dois problemas combinados causam a exibicao de valores com muitas casas decimais na aba de custos dos projetos:

1. **Dados no banco**: Existem 40 registros na tabela `project_timesheets` com valores como 5.56, 4.67, 0.44 (mais de 1 casa decimal), gerados antes da restricao no frontend
2. **Acumulo de ponto flutuante**: Ao somar horas de timesheet por membro/mes no JavaScript, ocorrem erros de precisao (ex: 83.80000000000003 em vez de 83.8)

## Solucao

### 1. Migracao SQL - Corrigir dados existentes

Arredondar todos os valores de horas existentes para 1 casa decimal em todas as tabelas relevantes:

```sql
UPDATE project_timesheets SET hours = ROUND(hours::numeric, 1) WHERE hours != ROUND(hours::numeric, 1);
UPDATE project_member_months SET hours = ROUND(hours::numeric, 1) WHERE hours != ROUND(hours::numeric, 1);
UPDATE budget_role_months SET hours = ROUND(hours::numeric, 1) WHERE hours != ROUND(hours::numeric, 1);
```

### 2. Frontend - Arredondar valores acumulados na exibicao

Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

- **Linha 334**: No calculo de `actualHoursByMember`, arredondar o acumulo:
  `result[ts.project_member_id] = Math.round((result[ts.project_member_id] + Number(ts.hours)) * 10) / 10`

- **Linha 356**: No calculo de `actualHoursByMemberAndMonth`, arredondar o acumulo:
  `result[ts.project_member_id][monthNumber] = Math.round((result[ts.project_member_id][monthNumber] + Number(ts.hours)) * 10) / 10`

- **Linhas 388-396**: No calculo de `totals`, arredondar os acumulos de horas por mes e totais gerais

- **Linhas 410-411**: No calculo de `memberTotals`, arredondar `plannedHours` acumulado

- **Linhas 661, 665, 679, 682, 684**: Nos renders de horas, aplicar `.toFixed(1)` ou arredondamento para garantir exibicao limpa (ex: `{actualHours > 0 ? Math.round(actualHours * 10) / 10 : '-'}`)

### Resumo de arquivos

| Arquivo | Mudanca |
|---------|---------|
| Migracao SQL | Arredondar dados existentes em 3 tabelas |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Arredondar acumulos de horas nos useMemo e na exibicao |

