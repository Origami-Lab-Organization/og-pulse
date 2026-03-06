

## Plano: Corrigir query ambígua de desligamentos

### Problema
A API retorna erro 300 (ambiguidade) porque existem duas foreign keys entre `employee_terminations` e `employees`:
1. `employee_terminations.employee_id → employees.id`
2. `employees.termination_id → employee_terminations.id`

PostgREST exige que o relacionamento seja explicitado quando há mais de uma FK.

### Solução
Em `src/services/terminationService.ts`, nas queries `getAll` e `getById`, trocar `employees!inner(...)` por `employees!employee_terminations_employee_id_fkey(...)` para disambiguar o relacionamento.

### Alterações

#### `src/services/terminationService.ts`
- Método `getAll` (linha ~100): trocar `employees!inner(...)` por `employees!employee_terminations_employee_id_fkey!inner(...)`
- Método `getById` (linha ~125): mesma correção no select que inclui employees, documents e adjustments

Isso resolve tanto o problema de Mariana não aparecer quanto o carregamento lento (que na verdade era o erro impedindo qualquer dado de carregar).

