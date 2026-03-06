

## Plano: Corrigir fluxo de desligamento e filtrar funcionários

### Problemas identificados

1. **Status errado**: `terminationService.create()` (linha 74) define o status do funcionário como `'desligado'` ao criar o desligamento. Deveria ser `'em_desligamento'`.

2. **Página de funcionários mostra desligados**: O `useEmployees` hook filtra apenas `'arquivado'`. Funcionários em desligamento e desligados continuam aparecendo.

3. **Abas desnecessárias**: A página de funcionários tem abas "Em Desligamento", "Desligados" e "Todos" — o usuário quer que essas pessoas apareçam apenas na seção `/rh/desligamentos`.

### Mudanças

#### `src/services/terminationService.ts`
- Linha 75: Mudar `status: 'desligado'` para `status: 'em_desligamento'`

#### `src/hooks/useEmployees.ts`
- Linha 85: Filtrar também `'desligado'` e `'em_desligamento'` além de `'arquivado'`

#### `src/pages/Index.tsx`
- Remover as abas de status (Em Desligamento, Desligados, Todos)
- Remover o state `statusFilter` e a lógica de filtragem por abas
- Remover referências ao status `em_desligamento` e `desligado` na página
- Manter apenas a listagem simples de funcionários ativos (que já será filtrada pelo hook)

#### `src/components/employees/EmployeesTable.tsx`
- Remover os cases de status `'desligado'` e `'em_desligamento'` do `getStatusBadge` (não serão mais exibidos nesta página)

### Arquivos modificados
- `src/services/terminationService.ts`
- `src/hooks/useEmployees.ts`
- `src/pages/Index.tsx`
- `src/components/employees/EmployeesTable.tsx`

