

## Plano: Botão de ocultar valores monetários na tela de funcionários

### Abordagem
Adicionar um estado `hideValues` na página de funcionários com um botão de olhinho (Eye/EyeOff) na barra de ações. Quando ativo, todos os valores monetários (tabela e stats) mostram "•••••" ao invés dos valores reais.

### Mudanças

**1. `src/pages/Index.tsx`**
- Adicionar estado `const [hideValues, setHideValues] = useState(false)`
- Adicionar botão EyeOff/Eye na barra de ações (ao lado da calculadora)
- Passar `hideValues` para `EmployeeStats` e `createEmployeeColumns`

**2. `src/components/employees/EmployeesTable.tsx`**
- Adicionar prop `hideValues?: boolean` a `EmployeeColumnsProps`
- Na coluna `totalMonthlyCostEstimated`: quando `hideValues` é true, mostrar `•••••` no lugar do custo mensal e custo/hora

**3. `src/components/employees/EmployeeStats.tsx`**
- Adicionar prop `hideValues?: boolean`
- Quando ativo, mostrar `•••••` no stat "Custo Mensal Total" e na provisão

### Arquivos alterados
1. `src/pages/Index.tsx` — estado + botão
2. `src/components/employees/EmployeesTable.tsx` — ocultar valores na tabela
3. `src/components/employees/EmployeeStats.tsx` — ocultar valores nos cards

