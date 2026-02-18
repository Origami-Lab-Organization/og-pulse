

# Limitar campos de horas a 1 casa decimal

## Resumo

Restringir todos os campos de entrada de horas (orcamento, planejamento e timesheet) para aceitar no maximo 1 casa decimal (ex: 4.5, 8.0), em vez de permitir multiplas casas decimais ou o step de 0.5.

## Arquivos a modificar

### 1. `src/components/timesheets/TimesheetWeekRow.tsx`

- Linha 91-93: Na funcao `handleHoursChange`, adicionar arredondamento para 1 casa decimal: `Math.round(numValue * 10) / 10`
- Linha 200: Trocar `step={0.5}` por `step={0.1}` nos inputs de horas

### 2. `src/components/timesheets/AdminWeekEditDialog.tsx`

- Linha 107-109: Na funcao `handleHoursChange`, adicionar o mesmo arredondamento para 1 casa decimal
- Linha 273: Trocar `step={0.5}` por `step={0.1}`

### 3. `src/components/budgets/BudgetRolesEditor.tsx`

- Linha 192-193: Adicionar `step={0.1}` no input de horas por mes
- Linha 200: Na chamada `parseFloat(e.target.value) || 0`, aplicar arredondamento: `Math.round((parseFloat(e.target.value) || 0) * 10) / 10`

### 4. `src/components/projects/detail/ProjectLaborSection.tsx`

- Linhas 615-627 e 637-649: Adicionar `step={0.1}` nos inputs de horas de planejamento
- Nas chamadas `Number(e.target.value)`, aplicar arredondamento para 1 casa decimal

## Detalhes tecnicos

A abordagem e dupla:
1. **Input HTML**: `step={0.1}` orienta o browser sobre o incremento permitido
2. **Validacao no handler**: `Math.round(value * 10) / 10` garante que mesmo valores colados ou digitados manualmente sejam truncados para 1 casa decimal

Nenhuma alteracao de banco de dados e necessaria -- as colunas `hours` ja sao `numeric` e aceitam qualquer precisao. A restricao e apenas no frontend.

