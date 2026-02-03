

# Plano: Portfólio de Projetos com Kanban

## Visao Geral

Criar uma nova pagina de Kanban para gerenciamento do fluxo de entrega de projetos, similar ao CRM mas focado no ciclo de vida de projetos em execucao.

## Nova Estrutura de Status

Adicionar um novo campo aos projetos para rastrear o estagio do portfolio:

| Coluna | Descricao |
|--------|-----------|
| Planejamento | Projetos recem-criados em fase de setup |
| Entrega de Valor | Projetos em execucao ativa entregando valor |
| Apresentacao de Resultados | Fase de apresentacao ao cliente |
| Value Book | Documentacao de valor entregue |
| Aprendizado e Case | Criacao de case e licoes aprendidas |
| Concluido | Projetos finalizados e documentados |

## Arquivos a Criar

### 1. Tipos do Portfolio

**Arquivo: `src/types/portfolio.ts`**

```typescript
export type PortfolioStage = 
  | 'planning'
  | 'value_delivery'
  | 'results_presentation'
  | 'value_book'
  | 'learning_case'
  | 'completed';

export const PORTFOLIO_COLUMNS = [
  { id: 'planning', label: 'Planejamento', color: 'bg-slate-100 text-slate-800' },
  { id: 'value_delivery', label: 'Entrega de Valor', color: 'bg-blue-100 text-blue-800' },
  { id: 'results_presentation', label: 'Apresentacao de Resultados', color: 'bg-purple-100 text-purple-800' },
  { id: 'value_book', label: 'Value Book', color: 'bg-amber-100 text-amber-800' },
  { id: 'learning_case', label: 'Aprendizado e Case', color: 'bg-teal-100 text-teal-800' },
  { id: 'completed', label: 'Concluido', color: 'bg-green-100 text-green-800' },
];

export const PORTFOLIO_STAGE_LABELS: Record<PortfolioStage, string> = {
  planning: 'Planejamento',
  value_delivery: 'Entrega de Valor',
  results_presentation: 'Apresentacao de Resultados',
  value_book: 'Value Book',
  learning_case: 'Aprendizado e Case',
  completed: 'Concluido',
};
```

### 2. Componentes do Kanban de Portfolio

**Arquivo: `src/components/portfolio/PortfolioKanbanBoard.tsx`**

Componente principal com DndContext do @dnd-kit:
- Grid de 6 colunas (responsivo: 3 em tablet, 2 em mobile)
- Drag and drop entre colunas
- Atualizacao de status via mutation

**Arquivo: `src/components/portfolio/PortfolioColumn.tsx`**

Coluna droppable:
- Header com titulo e contador
- ScrollArea para cards
- Indicador visual quando hovering

**Arquivo: `src/components/portfolio/PortfolioCard.tsx`**

Card draggable do projeto:
- Nome do projeto
- Cliente
- Gerente responsavel
- Valor do contrato
- Progresso de recebimentos (mini progress bar)
- Data de inicio

### 3. Pagina Principal

**Arquivo: `src/pages/Portfolio.tsx`**

Pagina usando AppLayout:
- Barra de busca
- Filtros por cliente/gerente (opcional)
- KanbanBoard com projetos

### 4. Hook de Portfolio

**Arquivo: `src/hooks/usePortfolioProjects.ts`**

Hook para:
- Buscar projetos com portfolio_stage
- Mutation para atualizar estagio
- Filtros por busca

## Alteracoes no Banco de Dados

**Nova coluna na tabela `projects`:**

```sql
ALTER TABLE projects 
ADD COLUMN portfolio_stage TEXT DEFAULT 'planning';
```

Mapeamento inicial:
- Projetos com status 'planning' -> portfolio_stage 'planning'
- Projetos com status 'active' -> portfolio_stage 'value_delivery'
- Projetos com status 'completed' -> portfolio_stage 'completed'

## Alteracoes na Navegacao

**Arquivo: `src/components/layout/AppSidebar.tsx`**

Adicionar item na secao Operacoes ACIMA de Projetos:

```typescript
{
  label: 'Operacoes',
  requiresAdmin: true,
  items: [
    { title: 'Portfolio de Projetos', url: '/portfolio', icon: LayoutDashboard, requiresAdmin: true },
    { title: 'Projetos', url: '/projects', icon: FolderKanban, requiresAdmin: true },
    // ... resto
  ],
}
```

**Arquivo: `src/App.tsx`**

Adicionar rota protegida:

```typescript
<Route 
  path="/portfolio" 
  element={
    <RoleProtectedRoute requireAdmin>
      <Portfolio />
    </RoleProtectedRoute>
  } 
/>
```

## Layout Visual

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Portfolio de Projetos                                               [+ Novo]   │
│  Fluxo de entrega de projetos                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Buscar projetos...]                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │Planejam. │ │Entrega   │ │Apresent. │ │Value Book│ │Aprendiz. │ │Concluido │  │
│ │    2     │ │    3     │ │    1     │ │    0     │ │    1     │ │    5     │  │
│ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤  │
│ │          │ │          │ │          │ │          │ │          │ │          │  │
│ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │          │ │ ┌──────┐ │ │ ┌──────┐ │  │
│ │ │Card 1│ │ │ │Card 3│ │ │ │Card 6│ │ │  Vazio   │ │ │Card 8│ │ │ │Card 9│ │  │
│ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │          │ │ └──────┘ │ │ └──────┘ │  │
│ │          │ │          │ │          │ │          │ │          │ │          │  │
│ │ ┌──────┐ │ │ ┌──────┐ │ │          │ │          │ │          │ │ ┌──────┐ │  │
│ │ │Card 2│ │ │ │Card 4│ │ │          │ │          │ │          │ │ │Card10│ │  │
│ │ └──────┘ │ │ └──────┘ │ │          │ │          │ │          │ │ └──────┘ │  │
│ │          │ │          │ │          │ │          │ │          │ │          │  │
│ │          │ │ ┌──────┐ │ │          │ │          │ │          │ │ ...      │  │
│ │          │ │ │Card 5│ │ │          │ │          │ │          │ │          │  │
│ │          │ │ └──────┘ │ │          │ │          │ │          │ │          │  │
│ │          │ │          │ │          │ │          │ │          │ │          │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Design do Card

```text
┌────────────────────────────────┐
│ Nome do Projeto                │
├────────────────────────────────┤
│ 🏢 Cliente XYZ                 │
│ 👤 Joao Silva                  │
├────────────────────────────────┤
│ R$ 40.800,00                   │
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░ 35%       │
│ Inicio: 01/01/2026             │
└────────────────────────────────┘
```

## Responsividade

| Breakpoint | Colunas |
|------------|---------|
| Desktop (>1280px) | 6 colunas |
| Tablet (768-1280px) | 3 colunas com scroll horizontal |
| Mobile (<768px) | 2 colunas com scroll horizontal |

## Resumo de Arquivos

### Novos Arquivos
| Arquivo | Descricao |
|---------|-----------|
| `src/types/portfolio.ts` | Tipos e constantes do portfolio |
| `src/pages/Portfolio.tsx` | Pagina principal |
| `src/components/portfolio/PortfolioKanbanBoard.tsx` | Board principal |
| `src/components/portfolio/PortfolioColumn.tsx` | Coluna droppable |
| `src/components/portfolio/PortfolioCard.tsx` | Card draggable |
| `src/hooks/usePortfolioProjects.ts` | Hook de dados |

### Arquivos Modificados
| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/AppSidebar.tsx` | Adicionar link Portfolio |
| `src/App.tsx` | Adicionar rota /portfolio |
| `src/types/project.ts` | Adicionar portfolio_stage ao tipo |
| `src/services/projectService.ts` | Adicionar metodo updatePortfolioStage |

### Migracao SQL
Nova coluna `portfolio_stage` na tabela `projects` com valor default 'planning'

