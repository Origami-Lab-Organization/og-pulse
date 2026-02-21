

# Reestruturacao da Pagina de Alocacao

## Resumo

Transformar a "Visao de Alocacao" na visao principal da pagina, com navegacao por mes (nao por semana), clique na linha do funcionario para ver detalhes de alocacao por projeto, e considerar data de admissao.

## Alteracoes

### 1. Pagina principal (`src/pages/Timesheets.tsx`)

- Alterar o `viewMode` padrao de `'project'` para `'allocation'`
- Quando em modo `allocation`, mostrar um seletor de mes (anterior/proximo) no lugar do seletor de semana
- Passar o mes selecionado para o `AllocationOverview`
- Remover o toggle Mes Atual/Ano Todo de dentro do AllocationOverview (ja que a navegacao sera feita na pagina pai)

### 2. Navegacao por mes no AllocationOverview

- Criar um componente `MonthSelector` simples (botoes anterior/proximo + label do mes, ex: "Fevereiro 2026") que sera exibido na area de controles da pagina
- Substituir o toggle "Mes Atual / Ano Todo" por esse seletor de mes na pagina pai
- O AllocationOverview recebe um `selectedMonth` (formato `yyyy-MM`) como prop e filtra os dados para esse mes
- Manter a opcao "Ano Todo" como um botao/tab ao lado do seletor de mes

### 3. Clique na linha do funcionario (`AllocationOverview`)

- Tornar cada `TableRow` clicavel (cursor pointer + hover)
- Ao clicar, abrir um **Dialog** (modal) mostrando a alocacao do funcionario nos projetos:
  - Nome do funcionario, cargo, jornada
  - Lista de projetos onde ele esta alocado
  - Para cada projeto: horas planejadas no mes e horas realizadas
  - Permitir que o gerente veja e entenda onde o funcionario esta alocado

### 4. Novo componente: `EmployeeAllocationDialog`

- Arquivo: `src/components/timesheets/EmployeeAllocationDialog.tsx`
- Recebe: `employeeId`, `employeeName`, `selectedMonth`, `open`, `onOpenChange`
- Busca `project_members` do funcionario com os respectivos `project_member_months` e `project_timesheets` do mes selecionado
- Exibe tabela com colunas: Projeto, Horas Planejadas, Horas Realizadas, Barra de progresso
- O gerente pode navegar para o projeto ou para a visao de timesheet do projeto

### 5. Data de admissao

- No `AllocationOverview`, buscar tambem `data_admissao` dos funcionarios (adicionar ao select de employees)
- No `EmployeeAllocationDialog`, usar `data_admissao` para:
  - Desabilitar meses anteriores a admissao (mostrar como "N/A" ou cinza)
  - Indicar visualmente que o funcionario nao estava na empresa naquele periodo

### 6. Novo componente: `MonthSelector`

- Arquivo: `src/components/timesheets/MonthSelector.tsx`
- Similar ao `TimesheetWeekSelector` mas navega por meses
- Botoes anterior/proximo, label com nome do mes/ano
- Botao "Hoje" para voltar ao mes atual
- Nao permite navegar alem do mes atual

## Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/timesheets/MonthSelector.tsx` | Seletor de navegacao por mes |
| `src/components/timesheets/EmployeeAllocationDialog.tsx` | Dialog de detalhes de alocacao do funcionario por projeto |

## Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Timesheets.tsx` | viewMode padrao `allocation`, adicionar MonthSelector, passar selectedMonth ao AllocationOverview |
| `src/components/timesheets/AllocationOverview.tsx` | Receber selectedMonth como prop, remover toggle interno, buscar data_admissao, tornar linhas clicaveis, abrir EmployeeAllocationDialog |

## Detalhes tecnicos

### MonthSelector

```text
Props: selectedMonth: Date, onMonthChange: (date: Date) => void
- Botao "<" para mes anterior
- Label: format(selectedMonth, "MMMM yyyy", { locale: ptBR })
- Botao ">" para proximo mes (desabilitado se >= mes atual)
- Botao "Hoje"
```

### AllocationOverview - novas props

```text
interface AllocationOverviewProps {
  searchQuery?: string;
  selectedMonth: string; // "yyyy-MM"
  viewMode: 'month' | 'year';
}
```

### EmployeeAllocationDialog - query

```text
- Busca project_members onde employee_id = X
- Para cada project_member, busca project_member_months do mes correspondente
- Para cada project_member, busca project_timesheets do mes correspondente
- Agrupa por projeto e exibe
```

### Consideracao de data_admissao

- Adicionar `data_admissao` ao select de employees na query do AllocationOverview
- Se o mes selecionado for anterior ao mes de admissao do funcionario, exibir a celula como "N/A" em cinza
- No EmployeeAllocationDialog, indicar se o funcionario ainda nao havia sido admitido

