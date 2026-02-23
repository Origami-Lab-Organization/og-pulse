

## Enviar Todos os Projetos (incluindo 0 horas)

### Problema

Atualmente, o botao "Enviar" so considera projetos que possuem horas lancadas (`hours > 0`). Projetos sem horas ficam de fora do envio, permanecendo como "Rascunho" indefinidamente.

### Solucao

Alterar a logica para que o botao "Enviar" sempre envie **todos** os projetos nao-enviados da semana, registrando 0 horas quando nao houver lancamento.

### Alteracoes

**Arquivo: `src/pages/MyTimesheet.tsx`**

1. **`pendingProjects`**: remover o filtro `hours > 0` -- qualquer projeto nao-enviado e pendente
2. **`handleSubmitAll`**: ja usa `pendingProjects` que passara a incluir projetos com 0h
3. **Remover botoes individuais de envio por projeto** (ja que o envio e sempre de todos)
4. Remover estado e dialog de `SubmitProjectDialog` (nao sera mais usado)

**Arquivo: `src/components/timesheets/TimesheetWeekStatus.tsx`**

1. Remover a condicao `totalHours === 0` do `disabled` do botao -- permitir envio mesmo com 0 horas
2. Ajustar texto para refletir que todos os projetos serao enviados

### Detalhes tecnicos

No `MyTimesheet.tsx`, a mudanca principal:

```typescript
// Antes
const pendingProjects = projects.filter(p => {
  const submission = submissions.get(p.projectId);
  const hours = projectHoursMap.get(p.projectId) || 0;
  return submission?.status !== 'submitted' && hours > 0;
});

// Depois
const pendingProjects = projects.filter(p => {
  const submission = submissions.get(p.projectId);
  return submission?.status !== 'submitted';
});
```

Na action de cada linha, remover o botao "Enviar" individual, mantendo apenas o badge de status (Rascunho/Enviado).

No `TimesheetWeekStatus.tsx`:
```typescript
// Remover totalHours === 0 do disabled
disabled={isSubmitting}
```

