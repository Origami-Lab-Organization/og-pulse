
## Corrigir Status de Submissao por Funcionario

### Problema Identificado

O status "Enviado" na pagina de cada funcionario e determinado pela tabela `project_timesheet_submissions`, que e **por projeto**, nao **por funcionario**. Quando o Victor envia suas horas no projeto "Gestao de Portfolio", um registro de submissao e criado para aquele projeto. Quando a Cecilia abre sua pagina, o sistema ve esse mesmo registro e mostra "Todos os Projetos Enviados" - mesmo que ela nao tenha submetido suas horas.

Alem disso, o `total_hours` na tabela `project_timesheet_submissions` e sobrescrito a cada envio com apenas as horas do ultimo funcionario que submeteu.

### Solucao

Mudar a logica de status para usar o campo `is_locked` dos registros individuais (`project_timesheets`) ao inves da tabela `project_timesheet_submissions`. Isso ja foi parcialmente feito na linha de cada projeto, mas o componente `TimesheetWeekStatus` (o banner verde no topo) ainda depende dos registros de submissao.

### Alteracoes

**1. `src/components/timesheets/TimesheetWeekStatus.tsx`**
- Adicionar prop opcional `lockedProjectCount` (numero de projetos cujas entries estao todas locked)
- Quando fornecido, usar esse valor ao inves de contar `submissions` para determinar quantos projetos estao "enviados"

**2. `src/pages/EmployeeTimesheetPage.tsx`**
- Calcular `lockedProjectCount` baseado nos entries do funcionario: um projeto conta como "enviado" se todos os entries daquele membro estao com `is_locked = true` e existem entries
- Passar `lockedProjectCount` para `TimesheetWeekStatus`

**3. `src/pages/MyTimesheet.tsx`**
- Mesma logica: calcular `lockedProjectCount` baseado nos entries do usuario logado
- Passar para `TimesheetWeekStatus`

**4. `src/hooks/useTimesheetSubmissions.ts`**
- No `useSubmitProjectWeek` e `useSubmitAllProjects`, ao fazer upsert no `project_timesheet_submissions`, primeiro buscar o `total_hours` existente e somar as novas horas, ao inves de sobrescrever

### Detalhes Tecnicos

A mudanca principal e no `TimesheetWeekStatus`:

```text
Antes: submittedCount = submissions com status 'submitted'
Depois: submittedCount = lockedProjectCount (calculado via is_locked nos entries)
```

Para o calculo do `lockedProjectCount`:

```text
Para cada projeto do funcionario:
  - Buscar entries onde projectMemberId = memberId
  - Se entries.length > 0 AND todas entries.isLocked = true -> conta como enviado
```

Para correcao do `total_hours` na submissao:

```text
Antes do upsert:
  1. Buscar total_hours atual da submissao existente
  2. Buscar soma das horas ja locked para outros membros
  3. Somar com as horas do membro atual
  4. Usar esse total no upsert
```
