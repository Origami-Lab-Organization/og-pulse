# FUNC-J7 — Timesheet com Pré-preenchimento Automático
> Jornada: Funcionário J7 · Estado auditado: 🟡 PARCIAL (~50%)
> Dependências externas: nenhuma (notificações de lembrete dependem de Func J3 Inbox — ✅ pronta)

## Estado Atual (auditado)

**✅ Já desenvolvido:**
- Página `src/pages/MyTimesheet.tsx` com lançamento semanal funcional
- `useMyAllocationData` calcula planejado vs. realizado e dias úteis com feriados (`countWorkingDays`)
- `allDailyTotals` rastreia totais diários
- Confirmar semana (`handleSubmitAll`, `MyTimesheet.tsx:341-357`)
- Atividades internas (`useMyActivityTypes`, divider "Atividades Internas", `MyTimesheet.tsx:631-707`)
- Aviso de projeto sem planejamento (`unplannedProjectIds` + `CircleAlert` + tooltip, `MyTimesheet.tsx:590-606`)
- Bloqueio de semana futura (`isFutureWeek`)

**❌ Pendente:**
- Hook `useTimesheetPrefill` (pré-preenchimento automático) — **não existe**
- Distinção visual "Sugestão" vs. "Lançado"
- Layout mobile dedicado (PWA)
- Tratamento de semana que cruza dois meses

## História de Usuário

**Como** Consultor que lança horas toda semana,
**quero** abrir o timesheet com as células já pré-preenchidas a partir da minha alocação mensal,
**para que** eu confirme e finalize em menos de 2 minutos sem reconstruir do zero o que fiz.

## Contexto

Núcleo da jornada J7 e maior alavanca de UX da persona Funcionário. O lançamento semanal já funciona e `useMyAllocationData` já calcula planejado vs. realizado e dias úteis com feriados — mas o consultor digita tudo manualmente. O pré-preenchimento é uma **sugestão não destrutiva**: nunca sobrescreve um lançamento existente. As melhorias de mobile e de semana cruzando dois meses vêm depois do núcleo (pré-preenchimento + visual).

## Critérios de Aceite

### Parte A — Pendente (desenvolver primeiro)

**CA-01 — Cálculo da sugestão (Opção C)**
- `horas_por_dia = planned_hours_for_month ÷ total_working_days_in_month`
- Sugestão de um dia = `horas_por_dia` se for dia útil (não fds, não feriado); `0` caso contrário
- Feriados vêm de `useHolidays` / `countWorkingDays` já usados em `useMyAllocationData`

**CA-02 — Hook `useTimesheetPrefill`**
- Assinatura: `useTimesheetPrefill(employeeId, weekDays, projects)` → `Record<projectId, Record<dateISO, hours>>`
- Reaproveita o cálculo de dias úteis de `useMyAllocationData` (não reimplementar)

**CA-03 — Sugestão só preenche células vazias**
- Sugestão aparece **apenas** em células sem lançamento salvo
- Célula com lançamento existente nunca é substituída pela sugestão

**CA-04 — Distinção visual Sugestão vs. Lançado**
- Célula em estado de sugestão: valor em cor mais clara + badge/indicador "Sugestão"
- Ao confirmar (CA-05): a célula passa para o estado visual "Lançado"

**CA-05 — Confirmar**
- "Confirmar semana" (`handleSubmitAll`, já existe) persiste as sugestões como lançamentos reais pelo fluxo de submit atual
- O consultor pode editar qualquer célula antes de confirmar

**CA-06 — Sem planejamento não quebra**
- Projeto em `unplannedProjectIds`: sem sugestão, mantém o `CircleAlert` já existente
- `total_working_days_in_month = 0` ou `planned = 0` → sugestão `0`, sem divisão por zero

**CA-07 — Semana futura**
- Em `isFutureWeek` os campos permanecem bloqueados (comportamento atual preservado); a sugestão não habilita lançamento futuro

### Parte B — Melhorias no existente (depois)

**CA-08 — Layout mobile (PWA)**
- Um projeto por vez com os 5 dias da semana abaixo como cards individuais
- Campos de hora grandes para toque fácil

**CA-09 — Semana que cruza dois meses**
- Dias de cada mês usam o planejamento do respectivo mês para a sugestão (`horas_por_dia` calculado por mês)
- Sem regressão no fluxo de confirmação

## Fora do Escopo

- Pré-preenchimento de atividades internas/ausências (J7 F4 — permanece sem sugestão)
- Lembrete automático de timesheet via Inbox (jornada à parte — depende de Func J3)

## Notas Técnicas

- Arquivo alvo: `src/pages/MyTimesheet.tsx`; hooks: `useMyAllocationData`, `useHolidays`
- Criar `src/hooks/useTimesheetPrefill.ts`
- A sugestão é estado de UI (não persistir até "Confirmar")
- Reutilizar `unplannedProjectIds` e `isFutureWeek` já presentes na página
- Respeitar `tenant_id`/RLS nos dados de alocação e lançamento (boundary do projeto)

## Critérios de Teste

| Cenário | Resultado esperado |
|---|---|
| Semana sem lançamentos, projeto com alocação | Células de dias úteis pré-preenchidas com `horas_por_dia`; fds/feriado em 0 |
| Célula já lançada | Sugestão não aparece nessa célula |
| Editar sugestão e confirmar | Valores salvos como lançamento; visual muda para "Lançado" |
| Mês com feriado | Distribuição usa apenas dias úteis (feriado fica 0) |
| Projeto sem planejamento | Sem sugestão + `CircleAlert` exibido |
| `planned = 0` / 0 dias úteis | Sugestão 0, sem erro de divisão |
| Semana futura | Campos bloqueados, sem sugestão habilitando lançamento |
| Mobile | Um projeto por vez, 5 dias em cards, campos grandes para toque |
| Semana cruzando dois meses | Cada dia usa o planejamento do seu mês |
