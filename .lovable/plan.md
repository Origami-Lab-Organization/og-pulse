

# Analytics de Alocacao na Minha Timesheet

## Resumo

Adicionar uma secao de analytics no topo da pagina "Minha Timesheet" mostrando ao funcionario um resumo visual de como esta sua alocacao no mes corrente (baseado na semana selecionada), com detalhamento por projeto.

## O que o funcionario vera

### Card de Resumo Mensal

Um card colapsavel acima dos projetos mostrando:

1. **Resumo geral do mes**: barra de progresso com horas realizadas vs capacidade mensal (jornada), similar ao que ja existe na visao de Alocacao do gerente
2. **Tabela por projeto**: cada projeto onde o funcionario esta alocado, mostrando:
   - Nome do projeto / cliente
   - Horas planejadas no mes (vindo de `project_member_months`)
   - Horas realizadas no mes (soma dos timesheets)
   - Barra de progresso visual
   - Percentual de execucao

```text
+----------------------------------------------------------+
| Minha Alocacao - Fevereiro/2026                          |
|                                                          |
| Geral: 35h / 132h capacidade (26% realizado)            |
| [====------------------------------]                     |
|                                                          |
| Projeto           | Plan. | Real. | Progresso            |
| Cliente A / Proj1 |  80h  |  20h  | [===-------] 25%    |
| Cliente B / Proj2 |  46h  |  15h  | [====------] 33%    |
| Sem alocacao      |   6h  |       | (livre)              |
+----------------------------------------------------------+
```

## Alteracoes

### Novo componente: `src/components/timesheets/MyTimesheetAllocation.tsx`

Componente que recebe os projetos do funcionario, busca as horas planejadas (`project_member_months`) e calcula as horas realizadas a partir dos timesheets do mes. Exibe o card com resumo e tabela por projeto.

### Novo hook: `src/hooks/useMyAllocationData.ts`

Hook que, dado o `employeeId` e o mes (yyyy-MM), busca:
- `project_member_months` para cada `project_member` do funcionario, convertendo `month_number` para o mes calendario usando o `start_date` do projeto
- `project_timesheets` agregados por projeto para o mes
- Jornada mensal do funcionario

### Modificacao: `src/pages/MyTimesheet.tsx`

Adicionar o componente `MyTimesheetAllocation` acima da lista de projetos, passando o mes derivado da semana selecionada.

## Detalhes tecnicos

### Hook `useMyAllocationData`

```text
Inputs: employeeId, monthKey (yyyy-MM)

Query:
1. Buscar project_members do funcionario (reusar useMyProjectMemberships)
2. Para cada project_member, buscar project_member_months
3. Converter month_number -> mes calendario usando start_date do projeto
4. Filtrar apenas o mes solicitado
5. Buscar project_timesheets do mes (work_date LIKE monthKey%)
6. Agrupar por projeto

Output: Array de { projectId, projectName, clientName, plannedHours, actualHours }
```

### Componente `MyTimesheetAllocation`

- Usa `Collapsible` do Radix para permitir expandir/colapsar
- Mostra barra de progresso geral (realizado vs capacidade)
- Tabela compacta com barras por projeto
- Cores: verde escuro para realizado, verde claro para planejado restante (mesmo padrao da tela de Alocacao)
- Responsivo: em mobile, simplifica para cards empilhados

### Integracao no MyTimesheet

O mes e derivado da semana selecionada: `format(weekStart, 'yyyy-MM')`. Quando o usuario navega entre semanas, o resumo mensal se atualiza se mudar de mes.

