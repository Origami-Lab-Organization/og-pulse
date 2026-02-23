

## Filtrar Projetos na Timesheet por Data de Inicio e Fim

### Problema

Atualmente, projetos aparecem na timesheet do funcionario apenas com base no `portfolio_stage` (nao ser "completed"). Porem, projetos que ainda nao comecaram ou ja terminaram tambem aparecem, permitindo lancamentos fora do periodo valido.

### Solucao

Filtrar projetos na timesheet com base na semana selecionada, mostrando apenas projetos cuja data de inicio/fim se sobreponha a semana em questao.

### Regras de negocio

- Projeto aparece se: `start_date <= fim_da_semana` E (`end_date >= inicio_da_semana` OU `is_continuous = true`)
- Projetos sem `start_date` continuam aparecendo (para nao quebrar dados existentes)
- Projetos com `is_continuous = true` nao sao filtrados por `end_date`

### Alteracoes

**1. `src/hooks/useMyTimesheetData.ts`**

- Receber parametros `weekStart` e `weekEnd` (strings yyyy-MM-dd)
- Incluir `start_date`, `end_date`, `is_continuous` no select dos projetos
- Apos receber os dados, filtrar no lado do cliente: manter apenas projetos cujo periodo se sobreponha a semana selecionada

**2. `src/hooks/useTimesheetData.ts` (useActiveProjectsWithMembers)**

- Mesma logica: receber `weekStart`/`weekEnd` opcionais e incluir os campos de data no select
- Filtrar no cliente apos receber os dados

**3. `src/pages/MyTimesheet.tsx`**

- Passar `startDate` e `endDate` para o hook `useMyProjectMemberships`

**4. `src/pages/Timesheets.tsx`**

- Passar `startDate` e `endDate` para o hook `useActiveProjectsWithMembers`

### Detalhes tecnicos

Filtragem no cliente (apos o fetch):

```typescript
const weekStartDate = parseISO(weekStart);
const weekEndDate = parseISO(weekEnd);

const filtered = projects.filter(p => {
  if (!p.startDate) return true; // sem data de inicio, mostra
  const projStart = parseISO(p.startDate);
  if (projStart > weekEndDate) return false; // projeto ainda nao comecou
  if (p.isContinuous) return true; // continuo, sem fim
  if (!p.endDate) return true; // sem data fim, mostra
  const projEnd = parseISO(p.endDate);
  return projEnd >= weekStartDate; // projeto ja terminou?
});
```

A interface `ProjectWithMembers` ganhara campos opcionais `startDate?`, `endDate?`, `isContinuous?` para suportar essa filtragem.

