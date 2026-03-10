

## Problema

A query `useTimesheetsByDateRange` retorna os registros de **todos os funcionários** do tenant, não apenas do usuário logado. Isso faz com que o `allDailyTotals` (usado para o indicador de borda amarela "acima da jornada") some as horas de todos os membros do time.

Resultado: se o time todo lançou 40h em uma segunda-feira, o sistema mostra borda amarela para você mesmo que você tenha 0h — porque o total agregado (40h) supera sua jornada diária (8h).

## Solução

**Em `src/pages/MyTimesheet.tsx`**: Filtrar `allDailyTotals` para considerar apenas os entries do próprio funcionário (usando os `memberId`s dos projetos onde ele está alocado).

```typescript
const myMemberIds = useMemo(() => 
  projects.flatMap(p => p.members.map(m => m.memberId)), 
  [projects]
);

const allDailyTotals = useMemo(() => {
  const totals: Record<string, number> = {};
  for (const entry of timesheetEntries) {
    if (myMemberIds.includes(entry.projectMemberId)) {
      totals[entry.workDate] = (totals[entry.workDate] ?? 0) + entry.hours;
    }
  }
  return totals;
}, [timesheetEntries, myMemberIds]);
```

Isso garante que a borda amarela só aparece quando **suas próprias** horas excedem a jornada diária.

## Arquivo alterado
- `src/pages/MyTimesheet.tsx` — filtrar `allDailyTotals` pelos member IDs do funcionário logado

