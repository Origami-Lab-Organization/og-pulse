

# Ajustes no Seletor de Semanas

## Mudancas

### 1. Adicionar semanas futuras ao seletor

No `TimesheetWeekSelector.tsx`, alterar a geracao de semanas para incluir semanas futuras (ex: 12 semanas a frente), alem das 26 semanas passadas. Adicionar constante `WEEKS_FORWARD = 12`. A semana atual ficara no meio da lista, permitindo scroll para ambos os lados.

### 2. Centralizar a semana atual ao abrir

Ao montar o componente, o auto-scroll deve focar no chip da semana atual (nao apenas da selecionada). Usar `scrollIntoView` com `inline: 'center'` no ref da semana atual para que ela apareca centralizada na tela.

Criar um ref separado para a semana atual (`currentChipRef`) e fazer o scroll inicial para ela. O scroll subsequente (ao mudar selecao) continua focando no chip selecionado.

### 3. Bloquear lancamento de horas em semanas futuras

No `MyTimesheet.tsx`, verificar se a semana selecionada e futura (`weekStart > currentWeekStart`). Se for futura, passar `isLocked={true}` para o `TimesheetWeekRow` e esconder o botao "Enviar". Os projetos e alocacoes continuam visiveis para consulta, mas os campos de horas ficam desabilitados.

## Detalhes Tecnicos

### `src/components/timesheets/TimesheetWeekSelector.tsx`

- Adicionar `const WEEKS_FORWARD = 12`
- No `useMemo`, gerar semanas de `-WEEKS_BACK` ate `+WEEKS_FORWARD`
- Adicionar `currentChipRef` para a semana atual
- No `useEffect` inicial (mount), fazer scroll para `currentChipRef` com `inline: 'center'`
- Manter scroll para `selectedChipRef` ao mudar selecao

### `src/pages/MyTimesheet.tsx`

- Calcular `const isFutureWeek = weekStart > getWeekStart(new Date())`
- No `TimesheetWeekRow`, passar `isLocked={isLocked || isFutureWeek}`
- Esconder botao "Enviar" quando `isFutureWeek`
- Desabilitar submit quando semana futura

