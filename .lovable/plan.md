

# Filtro de Periodo e Horas Realizadas na Visao de Alocacao

## Objetivo

1. A visao de alocacao abre mostrando apenas o mes corrente por padrao
2. O usuario pode alternar entre ver "Mes Atual" ou "Ano Todo"
3. Cada celula de funcionario mostra tanto as horas ja realizadas (lancadas em timesheets) quanto as horas planejadas

## Alteracoes

### Arquivo: `src/components/timesheets/AllocationOverview.tsx`

**1. Filtro de periodo (Mes / Ano)**

Adicionar um toggle (Tabs ou ToggleGroup) no header do Card com duas opcoes:
- "Mes Atual" (padrao) -- filtra `monthKeys` para mostrar apenas o mes corrente (formato `YYYY-MM` do `new Date()`)
- "Ano Todo" -- mostra todos os 12 meses do ano corrente que existam nos dados

**2. Buscar horas realizadas**

Na `queryFn`, alem de buscar `project_member_months` (planejado), tambem buscar `project_timesheets` para os mesmos membros. Agrupar as horas realizadas por funcionario e mes calendario (`work_date` -> `YYYY-MM`).

A query adicional sera:
```text
supabase
  .from('project_timesheets')
  .select('project_member_id, work_date, hours')
  .in('project_member_id', allMemberIds)
```

Agrupar por employee + monthKey (extraindo `YYYY-MM` do `work_date`).

**3. Estrutura de dados atualizada**

O `EmployeeAllocation` passa a ter dois Maps:
- `months: Map<string, number>` -- horas planejadas (como ja esta)
- `actualMonths: Map<string, number>` -- horas realizadas (novo)

**4. Exibicao na celula**

Cada celula mostra:
```text
Realizado: 40h
Planejado: 176h
[barra de progresso do realizado vs planejado]
23% realizado
```

A barra de progresso principal continua baseada no planejado vs capacidade (jornada mensal) para indicar alocacao. Uma segunda barra menor (ou texto) mostra o progresso do realizado vs planejado.

**5. Status Geral**

O status geral (badge) continua calculado sobre o planejado vs capacidade, pois indica se o funcionario esta bem alocado. Porem, ao lado, mostra o total de horas realizadas vs planejadas no periodo visivel.

## Detalhes tecnicos

### Filtro de monthKeys

```text
const [periodFilter, setPeriodFilter] = useState<'month' | 'year'>('month');
const currentMonthKey = format(new Date(), 'yyyy-MM');
const currentYear = new Date().getFullYear();

const visibleMonthKeys = periodFilter === 'month'
  ? monthKeys.filter(k => k === currentMonthKey)
  : monthKeys.filter(k => k.startsWith(String(currentYear)));
```

### Query de timesheets realizados

Dentro do `queryFn` existente, apos buscar `memberMonths`, adicionar:

```text
const { data: timesheets } = await supabase
  .from('project_timesheets')
  .select('project_member_id, work_date, hours')
  .in('project_member_id', allMemberIds);

// Agrupar por employeeId + monthKey
timesheets.forEach(ts => {
  const emp = memberToEmployee.get(ts.project_member_id);
  if (!emp) return;
  const monthKey = ts.work_date.substring(0, 7); // "YYYY-MM"
  // acumular em actualMonths do employee
});
```

### Layout da celula

```text
<div>
  <span>Realizado: {actual}h</span>
  <span>Planejado: {planned}h / {capacity}h</span>
  <barra planejado vs capacidade (cores de alocacao)>
  <barra realizado vs planejado (cor neutra/azul)>
</div>
```

## Arquivo a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/timesheets/AllocationOverview.tsx` | Adicionar filtro mes/ano, buscar timesheets realizados, exibir ambos os valores nas celulas |

