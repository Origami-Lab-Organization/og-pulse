
# Simplificacao da Pagina de Alocacao

## Resumo

Remover os toggles de modo de visualizacao (Alocacao / Por Projeto / Por Funcionario) e o toggle Mes/Ano Todo. A pagina principal mostra apenas a visao de alocacao por funcionario, navegavel mes a mes. Ao clicar na linha de um funcionario, abre uma nova pagina com a visao semanal de timesheet daquele funcionario (identica ao que existia na aba "Por Funcionario"), permitindo ao gerente editar horas.

## Alteracoes

### 1. Pagina principal `Timesheets.tsx` - Simplificar

- **Remover** todo o estado e logica de `viewMode` (project/employee/allocation)
- **Remover** o estado `allocationViewMode` (month/year)
- **Remover** os toggles/tabs de modo de visualizacao
- **Remover** toda a logica de week selector, submissions, submit dialogs, admin edit dialog (isso nao faz mais parte da pagina principal)
- Manter apenas: `MonthSelector` + campo de busca + `AllocationOverview`
- A pagina fica minimalista: navega por mes e mostra a tabela de alocacao

### 2. `AllocationOverview.tsx` - Simplificar

- **Remover** a prop `viewMode` (nao existe mais visualizacao de "ano todo")
- Sempre mostrar apenas o mes selecionado (via prop `selectedMonth`)
- Ao clicar numa linha, navegar para `/alocacao/:employeeId?month=yyyy-MM` ao inves de abrir o dialog atual

### 3. Nova pagina `EmployeeTimesheetPage.tsx`

- Rota: `/alocacao/:employeeId`
- Recebe o `employeeId` da URL e opcionalmente `?month=yyyy-MM`
- Busca os projetos do funcionario (via `groupByEmployee` + dados existentes)
- Exibe:
  - Header com nome do funcionario, cargo, botao de voltar
  - `TimesheetWeekSelector` para navegar entre semanas
  - A mesma visualizacao de `TimesheetByEmployee` mas para um unico funcionario
  - Status de submissao e botoes de envio (logica que existia na pagina principal)
- Respeita a data de admissao do funcionario (semanas anteriores ficam desabilitadas ou ocultas)

### 4. Rota em `App.tsx`

- Adicionar rota `/alocacao/:employeeId` apontando para `EmployeeTimesheetPage`

### 5. Remover `EmployeeAllocationDialog.tsx`

- Substituido pela nova pagina; o dialog nao sera mais usado

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Timesheets.tsx` | Simplificar: remover tabs, viewMode, week logic, dialogs |
| `src/components/timesheets/AllocationOverview.tsx` | Remover prop `viewMode`, navegar para pagina ao clicar |
| `src/pages/EmployeeTimesheetPage.tsx` | **Criar**: pagina de timesheet do funcionario |
| `src/App.tsx` | Adicionar rota `/alocacao/:employeeId` |
| `src/components/timesheets/EmployeeAllocationDialog.tsx` | Remover (substituido pela pagina) |

## Detalhes tecnicos

### Timesheets.tsx simplificado

```text
Estado:
- selectedMonth (Date)
- searchQuery (string)

Componentes renderizados:
- MonthSelector (navegar entre meses)
- Input de busca (filtrar por funcionario)
- AllocationOverview (recebe selectedMonth e searchQuery)
```

### AllocationOverview - navegacao ao clicar

```text
import { useNavigate } from 'react-router-dom';

// No onClick da TableRow:
onClick={() => navigate(`/alocacao/${emp.employeeId}?month=${selectedMonth}`)}
```

### EmployeeTimesheetPage

```text
- useParams() para pegar employeeId
- useSearchParams() para pegar month
- Busca projetos do funcionario via query similar a useActiveProjectsWithMembers filtrada por employee
- Usa TimesheetWeekSelector para navegar semanas
- Renderiza TimesheetByEmployee para um unico funcionario
- Inclui logica de submissions e botao de envio
- Valida data de admissao para desabilitar semanas anteriores
```
