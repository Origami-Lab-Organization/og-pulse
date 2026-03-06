

## Plano: Corrigir overflow de texto longo nas colunas Projeto/Cliente

### Problema
Nomes longos de cliente (ex: "Confeccoes Hayann Ind e Com Lt...") estão invadindo as colunas de dias porque `1fr` no CSS Grid tem um tamanho mínimo implícito de `auto` (conteúdo). O `truncate` não funciona porque o track pode crescer além do esperado.

### Solução
Trocar `1fr` por `minmax(0, 1fr)` nas definições de grid em ambos os arquivos. Isso força o mínimo da coluna a zero, permitindo que `truncate` funcione corretamente.

### Mudanças

**`src/components/timesheets/TimesheetWeekRow.tsx`** (linha 246)
- `grid-cols-[1fr_1fr_repeat(5,60px)_80px_120px]` → `grid-cols-[minmax(0,1fr)_minmax(0,1fr)_repeat(5,60px)_80px_120px]`
- Idem para a variante sem action slot

**`src/components/timesheets/TimesheetByEmployee.tsx`**
- Mesma substituição em todas as ocorrências de grid-cols que usam `1fr` para Projeto/Cliente (header, inline edit, etc.)

### Arquivos alterados
- `src/components/timesheets/TimesheetWeekRow.tsx`
- `src/components/timesheets/TimesheetByEmployee.tsx`

