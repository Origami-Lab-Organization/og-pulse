
# Ajustes na Tela de My Timesheet

## 1. Remover contagem do botao Enviar

No arquivo `src/pages/MyTimesheet.tsx`, linha 211, alterar o texto do botao de `Enviar ({pendingProjects.length})` para apenas `Enviar`.

## 2. Marcador "Esperado" em vermelho

No arquivo `src/components/timesheets/MyTimesheetAllocation.tsx`:

- Alterar a cor do marcador vertical de `bg-foreground/70` para `bg-red-500` (linha 51)
- Atualizar o item correspondente na legenda para usar a mesma cor vermelha
- Quando o marcador estiver em 100% (ultimo dia util do mes), posicionar o marcador no final da barra sem ultrapassar visualmente. Usar `right: 0` ao inves de `left: 100%` quando o valor for >= 100%, ou aplicar `max(calc(X% - 1px), 0)` para que a linha fique visivel dentro da barra.

## Detalhes Tecnicos

### Arquivo: `src/pages/MyTimesheet.tsx`
- Linha 211: trocar `Enviar ({pendingProjects.length})` por `Enviar`

### Arquivo: `src/components/timesheets/MyTimesheetAllocation.tsx`
- Linha 51: trocar `bg-foreground/70` por `bg-red-500`
- Ajustar posicionamento quando `expectedPercent >= 100`: usar `right: 0` para manter o marcador dentro da barra
- Na legenda, trocar a cor do indicador "Esperado" de `bg-foreground/70` para `bg-red-500`
