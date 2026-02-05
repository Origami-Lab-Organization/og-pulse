
# Plano: Tela de Lançamento de Timesheets

## Objetivo

Criar uma tela dedicada para lançamento de horas trabalhadas pelos funcionários nos projetos, com duas visualizações:
- **Por Projeto**: Cabeçalho com Cliente/Projeto, campos para funcionário e horas da semana
- **Por Funcionário**: Cabeçalho com Funcionário, campos para Cliente/Projeto e horas da semana

---

## Estrutura Visual

### Layout Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Timesheets                                                                 │
│  Registre as horas trabalhadas pelos funcionários nos projetos             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Semana: ◀ 03/02 - 07/02/2025 ▶]     [Por Projeto] [Por Funcionário]      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─ Bry Tecnologia / Plataforma Bry Discovery ──────────────────────────┐  │
│  │                                                                       │  │
│  │  Funcionário         │ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │ Total     │  │
│  ├──────────────────────┼──────┼──────┼──────┼──────┼──────┼───────────┤  │
│  │  Victor Couto        │ [8]  │ [8]  │ [6]  │ [8]  │ [8]  │ 38h       │  │
│  │  Maria Silva         │ [4]  │ [4]  │ [4]  │ [4]  │ [4]  │ 20h       │  │
│  │  [+ Adicionar funcionário]                                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Cliente X / Projeto Y ──────────────────────────────────────────────┐  │
│  │  ...                                                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visualização por Funcionário

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─ Victor Couto ───────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Cliente / Projeto   │ Seg  │ Ter  │ Qua  │ Qui  │ Sex  │ Total     │  │
│  ├──────────────────────┼──────┼──────┼──────┼──────┼──────┼───────────┤  │
│  │  Bry / Discovery     │ [8]  │ [8]  │ [6]  │ [8]  │ [8]  │ 38h       │  │
│  │  Cliente Y / Proj Z  │ [2]  │ [2]  │ [0]  │ [2]  │ [0]  │  6h       │  │
│  │                      │      │      │      │      │      │ Total: 44h│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Dados

### Dados Necessários

1. **Projetos ativos** com seus membros alocados
   - Buscar projetos onde `status = 'active'` ou `portfolio_stage != 'planning'`
   - Incluir cliente e membros com dados do funcionário

2. **Funcionários** alocados em projetos
   - A partir de `project_members` com join em `employees`

3. **Timesheets existentes** para a semana selecionada
   - Filtrar `project_timesheets` por `work_date` dentro da semana

### Hooks Necessários

```typescript
// Hook para buscar projetos ativos com membros
useActiveProjectsWithMembers()

// Hook já existente - timesheets por período
useTimesheetsByDateRange(startDate, endDate)

// Hook para upsert em batch (múltiplos registros)
useBatchUpsertTimesheets()
```

---

## Implementação

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Timesheets.tsx` | Página principal de timesheets |
| `src/components/timesheets/TimesheetWeekSelector.tsx` | Seletor de semana com navegação |
| `src/components/timesheets/TimesheetByProject.tsx` | Visualização agrupada por projeto |
| `src/components/timesheets/TimesheetByEmployee.tsx` | Visualização agrupada por funcionário |
| `src/components/timesheets/TimesheetWeekRow.tsx` | Linha editável com inputs de horas |
| `src/hooks/useTimesheetData.ts` | Hook para buscar dados consolidados |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/timesheets` |
| `src/components/layout/AppSidebar.tsx` | Habilitar link de Timesheets (remover `disabled: true`) |
| `src/hooks/useProjectTimesheets.ts` | Adicionar hook `useTimesheetsByDateRange` e `useBatchUpsertTimesheets` |

---

## Componentes Detalhados

### TimesheetWeekSelector

- Exibe semana atual (Seg-Sex)
- Botões para navegar entre semanas
- Formata datas no padrão brasileiro

### TimesheetByProject

- Agrupa por Cliente/Projeto
- Lista funcionários alocados no projeto
- Inputs editáveis para cada dia da semana
- Calcula total por funcionário

### TimesheetByEmployee

- Agrupa por Funcionário
- Lista projetos onde está alocado
- Inputs editáveis para cada dia da semana
- Calcula total geral do funcionário

### TimesheetWeekRow

- Linha reutilizável com inputs de horas
- Debounce para salvar automaticamente
- Validação de horas (0-24)
- Exibe total calculado

---

## Regras de Negócio

1. **Janela de Lançamento**: Seg a Sex (5 dias úteis)
2. **Projetos Elegíveis**: Apenas projetos ativos ou em execução (`portfolio_stage != 'planning'`)
3. **Funcionários Elegíveis**: Apenas membros alocados no projeto
4. **Salvamento**: Automático com debounce (upsert)
5. **Permissões**: Gerentes e Admins podem lançar horas para qualquer funcionário

---

## Detalhes Técnicos

### Query para Projetos Ativos com Membros

```sql
SELECT 
  p.id, p.name, p.start_date, p.end_date,
  c.id as client_id, c.company_name,
  pm.id as member_id, pm.employee_id, pm.role,
  e.nome, e.foto_url, e.total_monthly_cost_estimated, e.jornada_mensal
FROM projects p
JOIN clients c ON p.client_id = c.id
JOIN project_members pm ON pm.project_id = p.id
JOIN employees e ON pm.employee_id = e.id
WHERE p.status = 'active' OR p.portfolio_stage != 'planning'
ORDER BY c.company_name, p.name, e.nome
```

### Estrutura de Dados no Frontend

```typescript
interface TimesheetWeekData {
  projectId: string;
  projectName: string;
  clientName: string;
  members: {
    memberId: string;
    employeeId: string;
    employeeName: string;
    employeePhoto?: string;
    role: string;
    days: {
      date: string;
      dayOfWeek: number;
      hours: number;
    }[];
    totalHours: number;
  }[];
}
```

---

## Sequência de Implementação

```
1. Criar hooks para buscar dados
       │
       ▼
2. Criar página Timesheets.tsx
       │
       ▼
3. Criar componente TimesheetWeekSelector
       │
       ▼
4. Criar componente TimesheetByProject
       │
       ▼
5. Criar componente TimesheetByEmployee
       │
       ▼
6. Atualizar rotas e sidebar
       │
       ▼
7. Testar fluxo completo
```

