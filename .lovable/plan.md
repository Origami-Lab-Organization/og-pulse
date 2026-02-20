

# Ajustes na Sessao de Alocacao e Badges de Analytics

## 1. Renomear rota `/timesheets` para `/alocacao`

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Rota de `/timesheets` para `/alocacao` (linha 131) |
| `src/components/layout/AppSidebar.tsx` | URL do item "Alocacao" de `/timesheets` para `/alocacao` (linha 79) |

## 2. Atualizar titulo e descricao da pagina

- **`src/pages/Timesheets.tsx`**: Titulo de "Timesheets" para "Alocacao", descricao e breadcrumb atualizados

## 3. Campo de pesquisa por projeto

- **`src/pages/Timesheets.tsx`**: Adicionar um `Input` com icone de busca para filtrar projetos por nome ou cliente. Aplicado antes de passar dados para `TimesheetByProject` e `TimesheetByEmployee`

## 4. Bloquear navegacao para semanas futuras

- **`src/components/timesheets/TimesheetWeekSelector.tsx`**: Desabilitar o botao de proxima semana quando a semana seguinte estaria no futuro (comparando com a semana atual do calendario)

## 5. Nova aba "Visao de Alocacao"

- **Novo componente** `src/components/timesheets/AllocationOverview.tsx`: Tabela matricial com funcionarios nas linhas e meses nas colunas, mostrando horas planejadas vs capacidade mensal com indicadores visuais
- **`src/pages/Timesheets.tsx`**: Adicionar terceira aba `allocation` ao lado de "Por Projeto" e "Por Funcionario"

## 6. Cores de alocacao ajustadas (NOVO vs plano anterior)

As cores seguem a logica de maximizar alocacao:

| Faixa | Cor | Status |
|-------|-----|--------|
| 80-100% | Verde | Adequado (meta ideal) |
| Abaixo de 80% | Amarelo | Subalocado |
| Acima de 100% | Vermelho | Sobrealocado |
| 0 horas | Cinza | Ocioso |

Isso se aplica a:
- **`src/components/timesheets/AllocationOverview.tsx`** (novo componente)
- **`src/hooks/useAnalyticsData.ts`** (funcao `getUtilizationStatus` - ja esta correto com esses ranges)
- **`src/components/analytics/EmployeeUtilizationTable.tsx`** - Ajustar as cores dos badges:
  - `overallocated` (>100%): variant `destructive` (vermelho) -- ja esta correto
  - `adequate` (80-100%): mudar para verde (usar variant `default` com classe verde)
  - `underallocated` (<80%): mudar para amarelo/warning
  - `idle` (0h): manter cinza/outline

## Detalhes tecnicos

### Bloqueio de semana futura (TimesheetWeekSelector.tsx)

```text
const currentWeekStart = getWeekStart(new Date());
const nextWeekStart = getWeekStart(addWeeks(selectedDate, 1));
const canGoForward = nextWeekStart <= currentWeekStart;
// Botao de avancar fica disabled={!canGoForward}
```

### Filtro de busca (Timesheets.tsx)

```text
const [searchQuery, setSearchQuery] = useState('');
const filteredProjects = (projects || []).filter(p => {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return p.projectName.toLowerCase().includes(q) 
    || p.clientName.toLowerCase().includes(q);
});
```

### Cores dos badges (EmployeeUtilizationTable.tsx)

```text
overallocated: variant 'destructive' (vermelho)
adequate: classe customizada verde (bg-green-100 text-green-800)
underallocated: classe customizada amarelo (bg-yellow-100 text-yellow-800) 
idle: variant 'outline' (cinza)
```

### AllocationOverview.tsx - Estrutura

Busca `project_member_months` para todos os membros dos projetos ativos. Cruza com `jornada_mensal` do funcionario. Tabela mostra:
- Linhas: funcionarios
- Colunas: meses do projeto
- Celulas: barra de progresso colorida (verde 80-100%, amarelo <80%, vermelho >100%)
- Totalizador por funcionario com horas disponiveis

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `src/App.tsx` | Alterar rota |
| `src/components/layout/AppSidebar.tsx` | Atualizar URL |
| `src/pages/Timesheets.tsx` | Titulo, busca, nova aba |
| `src/components/timesheets/TimesheetWeekSelector.tsx` | Bloquear semanas futuras |
| `src/components/timesheets/AllocationOverview.tsx` | **Novo** - Visao de alocacao |
| `src/components/analytics/EmployeeUtilizationTable.tsx` | Ajustar cores dos badges |

