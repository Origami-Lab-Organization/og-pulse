
## Corrigir Totais na Minha Timesheet

### Problema

Os totais exibidos no cabecalho de cada card de projeto ("Total: X.0h") e no resumo da semana somam as horas de **todos os funcionarios** do projeto, nao apenas as do funcionario logado. Isso acontece porque:

1. `useTimesheetsByDateRange` busca **todas** as entradas da semana (sem filtro por funcionario)
2. `projectHoursMap` filtra apenas por `projectId`, somando horas de todos os membros

### Solucao

Filtrar o calculo dos totais para considerar apenas os `memberId`s do funcionario logado.

### Alteracao

**Arquivo: `src/pages/MyTimesheet.tsx`**

No calculo de `projectHoursMap`, trocar o filtro de `projectId` para `memberId`:

```typescript
const projectHoursMap = useMemo(() => {
  const map = new Map<string, number>();
  for (const project of projects) {
    const memberIds = project.members.map(m => m.memberId);
    const hours = timesheetEntries
      .filter(e => memberIds.includes(e.projectMemberId))
      .reduce((sum, e) => sum + e.hours, 0);
    map.set(project.projectId, hours);
  }
  return map;
}, [projects, timesheetEntries]);
```

Isso garante que:
- O total no cabecalho de cada card mostra apenas as horas do funcionario logado
- O total geral no "Resumo da Semana" reflete apenas as horas do funcionario
- O valor enviado no dialog de submissao tambem sera correto
