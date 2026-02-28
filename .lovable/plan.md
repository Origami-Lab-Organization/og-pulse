
# Ajustes UX/UI na Minha Timesheet

## 1. Remover o "Resumo da Semana"
O componente `TimesheetWeekStatus` sera removido da pagina `MyTimesheet`. Ele nao agrega valor no fluxo atual de lancamento por projeto.

## 2. Mover total e botao "Enviar" para dentro do card de projetos
Apos a listagem de projetos (dentro do `Card` existente), sera adicionada uma linha de rodape com:
- Total de horas da semana (alinhado a esquerda/centro)
- Botao "Enviar" (alinhado a direita)

Essa linha tera um estilo de `border-t` para separar visualmente da listagem, com padding adequado.

## 3. Corrigir alinhamento da coluna Status
O problema atual e que o grid do header e o grid das rows usam definicoes de colunas diferentes. O header usa `grid-cols-[1fr_repeat(5,60px)_80px_140px]` enquanto o `TimesheetWeekRow` usa `grid-cols-[1fr_repeat(5,60px)_80px_90px_50px]` (com actionSlot separado). Vamos unificar para uma unica definicao de grid consistente, removendo a separacao entre statusSlot e actionSlot na row, e usando uma unica coluna de status com largura fixa alinhada entre header e rows.

## Detalhes tecnicos

### Arquivos modificados

**`src/pages/MyTimesheet.tsx`**
- Remover import e uso do `TimesheetWeekStatus`
- Remover import do `SubmitAllProjectsDialog` e estados relacionados (`showSubmitAllDialog`)
- Adicionar uma linha de rodape dentro do `CardContent`, apos o `.map()` de projetos, contendo o total de horas e o botao "Enviar"
- O botao "Enviar" mantera a mesma logica de habilitacao (canSubmit, allWeekDaysReady, pendingProjects)

**`src/components/timesheets/TimesheetWeekRow.tsx`**
- Unificar o grid para usar uma coluna unica de status/action: `grid-cols-[1fr_repeat(5,60px)_80px_120px]`
- Combinar `statusSlot` e `actionSlot` em um unico slot renderizado na mesma celula, com alinhamento `justify-center`

**`src/pages/MyTimesheet.tsx` (header do grid)**
- Ajustar a definicao de colunas do header para `grid-cols-[1fr_repeat(5,60px)_80px_120px]` — mesma definicao usada nas rows

### Linha de rodape (dentro do card)
```text
+------------------------------------------------------+
| [projetos listados acima]                            |
|------------------------------------------------------|
|  Total da Semana: 12.5h            [Enviar (3)]     |
+------------------------------------------------------+
```

A logica do `SubmitAllProjectsDialog` sera mantida e acionada pelo botao. O dialog de confirmacao continuara funcionando normalmente.
