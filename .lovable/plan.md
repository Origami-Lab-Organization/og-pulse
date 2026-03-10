

## Plano: Corrigir trava de timesheet afetando outros membros do time

### Problema raiz

Em `MyTimesheet.tsx` (linha 285-289), a lógica de lock verifica o status da **submission do projeto** (`project_timesheet_submissions`):

```typescript
const isSubmitted = submission?.status === 'submitted';
const isLocked = isSubmitted || (memberEntries.length > 0 && memberEntries.every(e => e.isLocked));
```

Quando o funcionário A envia suas horas, o `useSubmitAllProjects` cria/atualiza um registro em `project_timesheet_submissions` com `status: 'submitted'` para aquele `project_id + week_start`. Quando o funcionário B abre a mesma semana, `useProjectWeekSubmissions` retorna esse registro, `isSubmitted = true`, e o projeto aparece como "Enviado" — travando B mesmo que B nunca tenha enviado nada.

### Solução

**Em `src/pages/MyTimesheet.tsx`**: Remover a dependência do `project_timesheet_submissions` para determinar se o **meu** timesheet está travado. A trava do funcionário individual deve ser baseada **apenas** no campo `is_locked` dos seus próprios registros em `project_timesheets`.

Mudanças:
1. Remover a query `useProjectWeekSubmissions` (não é mais necessária na visão "Minha Timesheet")
2. Alterar a lógica de `isLocked` para depender apenas dos entries do membro:
   ```typescript
   const memberEntries = timesheetEntries.filter(e => e.projectMemberId === member.memberId);
   const isLocked = memberEntries.length > 0 && memberEntries.every(e => e.isLocked);
   ```
3. Alterar `allProjectsLocked` para usar a mesma lógica (sem checar submissions)

**Em `src/hooks/useTimesheetSubmissions.ts`** (`useSubmitAllProjects`): A lógica de lock já filtra por `memberIds` (linha 327-328), então os registros de `project_timesheets` dos outros membros **não** estão sendo travados. O problema é apenas a camada de UI que usa o status da submission do projeto como proxy de lock.

### Arquivos alterados
- `src/pages/MyTimesheet.tsx` — remover uso de `useProjectWeekSubmissions`, basear lock apenas em `is_locked` do membro

