
# Analytics de Projetos

## Resumo

Criar a pagina de Analytics (`/analytics`) com um dashboard consolidado que permite ao gestor visualizar a performance financeira e a utilizacao da equipe em todos os projetos, com filtros de periodo, cliente e gerente.

## Estrutura da Pagina

A pagina sera dividida em 3 secoes principais:

### 1. Barra de Filtros (topo)
- **Periodo**: Seletor de mes/ano, iniciando no mes atual (1o ao ultimo dia). Opcao de selecionar meses anteriores.
- **Cliente**: Select com todos os clientes que possuem projetos ativos.
- **Gerente de Projetos**: Select com todos os gerentes. Gerentes de projeto verao apenas seus proprios projetos pre-filtrados (conforme regra de visibilidade existente).

### 2. KPIs Financeiros (3 cards)
- **Receita Recebida**: Soma das parcelas com `payment_date` dentro do periodo filtrado.
- **Custos Totais**: Soma de custos de mao de obra (horas de timesheet x custo/hora real do funcionario) + custos reais de fornecedores + materiais realizados, todos dentro do periodo.
- **Margem Bruta**: (Receita - Custos) / Receita, exibida em percentual com comparacao contra a meta de margem bruta das configuracoes globais (`gross_margin_target_percent`).

### 3. Secoes Analiticas (tabs ou scroll)

#### 3a. Composicao de Custos
- Grafico de barras empilhadas ou donut mostrando a distribuicao: Mao de Obra vs Fornecedores vs Materiais.
- Tabela resumida por projeto com colunas: Projeto | Mao de Obra | Fornecedores | Materiais | Total.

#### 3b. Utilizacao de Funcionarios
- Tabela com todos os funcionarios alocados em projetos no periodo, contendo:
  - Nome | Cargo | Jornada Diaria | Capacidade no Periodo (jornada_diaria x dias uteis do mes) | Horas Alocadas (soma dos timesheets) | Utilizacao (%) | Status
- **Status de alocacao**:
  - **Sobrealorcado**: Horas alocadas > Capacidade (vermelho)
  - **Adequado**: Horas alocadas entre 80% e 100% da capacidade (verde)
  - **Subalocado**: Horas alocadas < 80% da capacidade (amarelo)
  - **Ocioso**: Sem horas registradas (cinza)
- Os dias uteis do mes serao calculados com base em 22 dias (padrao), podendo ser refinado no futuro com o calendario de feriados.

## Fontes de Dados

| Dado | Tabela/Hook | Logica |
|------|-------------|--------|
| Receita | `project_installments` | Filtrar por `payment_date` dentro do periodo |
| Custo Mao de Obra | `project_timesheets` + `employees` | Horas x (`total_monthly_cost_estimated / jornada_mensal`) |
| Custo Fornecedores | `project_supplier_actuals` | Mapear `month_number` para o mes calendario via `start_date` do projeto |
| Custo Materiais | `project_materials` | Filtrar `is_realized = true`, mapear `month_number` para mes via `start_date` |
| Utilizacao | `project_timesheets` + `employees` | Horas registradas vs capacidade (jornada_diaria x 22) |
| Meta Margem | `financial_settings` | `gross_margin_target_percent` |

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/Analytics.tsx` | Criar - pagina principal com filtros e secoes |
| `src/hooks/useAnalyticsData.ts` | Criar - hook que busca e consolida todos os dados |
| `src/components/analytics/AnalyticsKPIs.tsx` | Criar - cards de Receita, Custos e Margem |
| `src/components/analytics/CostCompositionChart.tsx` | Criar - grafico de composicao de custos |
| `src/components/analytics/CostByProjectTable.tsx` | Criar - tabela de custos por projeto |
| `src/components/analytics/EmployeeUtilizationTable.tsx` | Criar - tabela de utilizacao com status |
| `src/components/analytics/AnalyticsFilters.tsx` | Criar - barra de filtros (periodo, cliente, gerente) |
| `src/App.tsx` | Modificar - adicionar rota `/analytics` |
| `src/components/layout/AppSidebar.tsx` | Modificar - remover `disabled: true` do item Analytics |

## Detalhes Tecnicos

### Hook `useAnalyticsData`
O hook recebera os filtros (startDate, endDate, clientId, managerId) e fara as queries necessarias:

1. Buscar projetos filtrados (por cliente e/ou gerente) via `projectService.getAll` com os filtros de visibilidade ja existentes.
2. Com os IDs dos projetos filtrados, buscar em paralelo:
   - `project_installments` com `payment_date` no periodo
   - `project_timesheets` com `work_date` no periodo
   - `project_supplier_actuals` (mapeando month_number para data real)
   - `project_materials` com `is_realized = true` (mapeando month_number para data real)
   - `project_members` com employees para dados de custo
3. Consolidar e retornar os dados calculados.

### Calculo de Custo de Mao de Obra no Periodo
Para cada registro de timesheet no periodo:
```
custo = horas * (employee.total_monthly_cost_estimated / employee.jornada_mensal)
```

### Mapeamento de month_number para Data Calendario
Os fornecedores e materiais usam `month_number` relativo ao inicio do projeto. Para mapear:
```
data_real = addMonths(project.start_date, month_number - 1)
```
Verificar se o mes resultante esta dentro do periodo filtrado.

### Filtro de Periodo
- Default: mes atual (1o ao ultimo dia)
- Seletor tipo MonthPicker com botoes de navegacao (anterior/proximo)
- Formato: "Fevereiro 2026"

### Visibilidade
Respeitar as regras existentes: Admins veem tudo, Gerentes veem apenas seus projetos.
