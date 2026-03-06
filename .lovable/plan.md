

## Plano: Corrigir grid desalinhado no timesheet

### Problema
- **Header** (`TimesheetByEmployee`): `grid-cols-[1fr_repeat(5,60px)_80px_90px_50px]` — 1 coluna para "Cliente / Projeto"
- **Row** (`TimesheetWeekRow`): `grid-cols-[1fr_1fr_repeat(5,60px)_80px_120px]` — 2 colunas separadas para label + client
- Isso desalinha todos os dias, total, status e ação

### Solução
Unificar as definições de grid para que header e rows usem a mesma estrutura de colunas.

### Mudanças

**`src/components/timesheets/TimesheetByEmployee.tsx`**
- Atualizar o grid do header para usar 2 colunas de label (Projeto + Cliente) em vez de 1:
  - Com status/action: `grid-cols-[1fr_1fr_repeat(5,60px)_80px_120px]`
  - Sem status/action: `grid-cols-[1fr_1fr_repeat(5,60px)_80px]`
- Separar "Cliente / Projeto" em 2 headers: "Projeto" e "Cliente"
- Atualizar o grid do inline edit mode para usar a mesma estrutura

**`src/components/timesheets/TimesheetWeekRow.tsx`**
- Manter a estrutura atual de 2 colunas (já correta no row)
- Ajustar o slot de status+action para separar em 2 colunas (status 90px + action 50px) se necessário para alinhar com o header

### Arquivos alterados
- `src/components/timesheets/TimesheetByEmployee.tsx`
- `src/components/timesheets/TimesheetWeekRow.tsx` (se necessário ajustar status/action)

