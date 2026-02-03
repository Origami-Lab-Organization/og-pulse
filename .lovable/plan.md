
# Plano: Visualizacao de Projeto por Fase do Portfolio

## Visao Geral

Reestruturar a pagina de detalhe do projeto para exibir abas diferentes dependendo da fase no portfolio:

- **Planejamento**: Foco em preparacao do projeto (OKRs, Stakeholders, Custos Planejados, Cronograma, Resultado Esperado)
- **Execucao (Entrega de Valor em diante)**: Foco em acompanhamento (Visao Geral, Custos Realizados, Financeiro, etc.)

## Nova Estrutura de Abas

### Fase: Planejamento (portfolio_stage = 'planning')

| Aba | Descricao |
|-----|-----------|
| Visao Geral | Informacoes basicas do projeto (cliente, valor, periodo) |
| OKRs | Cadastro de objetivos e resultados-chave do projeto |
| Stakeholders | Gestao de partes interessadas e contatos |
| Custos | Planejamento de mao de obra, fornecedores e materiais |
| Cronograma | Linha do tempo e marcos do projeto |
| Resultado Esperado | Projecao financeira (receita, custo, margem) |

### Fase: Execucao (portfolio_stage != 'planning')

| Aba | Descricao |
|-----|-----------|
| Visao Geral | Dashboard com metricas de execucao |
| OKRs | Acompanhamento de OKRs (com progresso) |
| Stakeholders | Gestao de stakeholders |
| Custos | Planejado vs Realizado |
| Cronograma | Timeline com status de entregas |
| Financeiro | Fluxo de caixa, recebimentos, margem real |

## Novas Tabelas no Banco de Dados

### 1. project_okrs

Objetivos e Key Results do projeto.

```sql
CREATE TABLE public.project_okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  progress_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.project_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES project_okrs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT, -- Ex: '%', 'unidades', 'R$'
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. project_stakeholders

Partes interessadas do projeto.

```sql
CREATE TABLE public.project_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- Sponsor, Product Owner, Tech Lead, etc.
  organization TEXT, -- Cliente, Interna, Parceiro
  email TEXT,
  phone TEXT,
  influence_level TEXT, -- high, medium, low
  interest_level TEXT, -- high, medium, low
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. project_milestones (para Cronograma)

Marcos do projeto.

```sql
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  planned_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, delayed
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Novos Componentes

### Abas de Planejamento

| Componente | Descricao |
|------------|-----------|
| `ProjectPlanningOverviewTab.tsx` | Visao simplificada sem dados de execucao |
| `ProjectOKRsTab.tsx` | CRUD de OKRs com key results |
| `ProjectStakeholdersTab.tsx` | CRUD de stakeholders |
| `ProjectScheduleTab.tsx` | Timeline de milestones |
| `ProjectExpectedResultTab.tsx` | Projecao financeira planejada |

### Componentes de Apoio

| Componente | Descricao |
|------------|-----------|
| `OKRCard.tsx` | Card de um objetivo com key results |
| `OKRFormDialog.tsx` | Dialog para criar/editar OKR |
| `StakeholderCard.tsx` | Card de stakeholder |
| `StakeholderFormDialog.tsx` | Dialog para criar/editar stakeholder |
| `MilestoneTimeline.tsx` | Visualizacao de timeline |
| `MilestoneFormDialog.tsx` | Dialog para criar/editar milestone |

## Tipos TypeScript

### project_okr.ts

```typescript
export interface ProjectOKR {
  id: string;
  project_id: string;
  objective: string;
  description: string | null;
  target_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress_percent: number;
  created_at: string;
  updated_at: string;
  key_results?: ProjectKeyResult[];
}

export interface ProjectKeyResult {
  id: string;
  okr_id: string;
  description: string;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}
```

### project_stakeholder.ts

```typescript
export type InfluenceLevel = 'high' | 'medium' | 'low';
export type InterestLevel = 'high' | 'medium' | 'low';

export interface ProjectStakeholder {
  id: string;
  project_id: string;
  name: string;
  role: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  influence_level: InfluenceLevel | null;
  interest_level: InterestLevel | null;
  notes: string | null;
  created_at: string;
}

export const STAKEHOLDER_ROLES = [
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'product_owner', label: 'Product Owner' },
  { value: 'tech_lead', label: 'Tech Lead' },
  { value: 'decision_maker', label: 'Tomador de Decisao' },
  { value: 'user', label: 'Usuario Final' },
  { value: 'subject_expert', label: 'Especialista' },
  { value: 'other', label: 'Outro' },
];
```

### project_milestone.ts

```typescript
export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  planned_date: string;
  completed_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  order_index: number;
  created_at: string;
}
```

## Logica de Renderizacao Condicional

**Arquivo: `src/pages/ProjectDetail.tsx`**

```typescript
// Determina se esta em modo planejamento
const isPlanning = project.portfolio_stage === 'planning';

return (
  <Tabs defaultValue="overview">
    <TabsList>
      <TabsTrigger value="overview">Visao Geral</TabsTrigger>
      <TabsTrigger value="okrs">OKRs</TabsTrigger>
      <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
      <TabsTrigger value="costs">Custos</TabsTrigger>
      <TabsTrigger value="schedule">Cronograma</TabsTrigger>
      {isPlanning ? (
        <TabsTrigger value="expected">Resultado Esperado</TabsTrigger>
      ) : (
        <TabsTrigger value="financial">Financeiro</TabsTrigger>
      )}
    </TabsList>

    <TabsContent value="overview">
      {isPlanning ? (
        <ProjectPlanningOverviewTab project={project} />
      ) : (
        <ProjectOverviewTab project={project} />
      )}
    </TabsContent>
    
    {/* ... outras abas */}
  </Tabs>
);
```

## Layout Visual - Aba OKRs

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  OKRs do Projeto                                              [+ Novo Objetivo] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ O1: Aumentar satisfacao do cliente com o sistema                          │ │
│  │ Meta: 31/03/2026 | Status: Em Andamento | Progresso: ████████░░ 80%       │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ KR1: Reduzir tempo de resposta para < 2s             ████████████░ 90%    │ │
│  │ KR2: Atingir NPS >= 50                               ████████░░░░ 70%     │ │
│  │ KR3: Zerar bugs criticos em producao                 ████████████ 100%    │ │
│  │                                                          [+ Key Result]    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ O2: Entregar MVP dentro do prazo                                           │ │
│  │ Meta: 28/02/2026 | Status: Pendente | Progresso: ░░░░░░░░░░ 0%            │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ Nenhum Key Result cadastrado                             [+ Key Result]    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Layout Visual - Aba Stakeholders

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Stakeholders                                               [+ Novo Stakeholder]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐            │
│  │ 🧑 Maria Silva    │  │ 🧑 Joao Santos    │  │ 🧑 Ana Costa      │            │
│  │ Patrocinadora     │  │ Product Owner     │  │ Tech Lead         │            │
│  │ Cliente           │  │ Cliente           │  │ Interna           │            │
│  ├───────────────────┤  ├───────────────────┤  ├───────────────────┤            │
│  │ Influencia: Alta  │  │ Influencia: Alta  │  │ Influencia: Media │            │
│  │ Interesse: Alto   │  │ Interesse: Alto   │  │ Interesse: Alto   │            │
│  ├───────────────────┤  ├───────────────────┤  ├───────────────────┤            │
│  │ 📧 maria@...      │  │ 📧 joao@...       │  │ 📧 ana@...        │            │
│  │ 📱 (11) 9999-...  │  │ 📱 (11) 8888-...  │  │ 📱 (11) 7777-...  │            │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Layout Visual - Aba Cronograma

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Cronograma                                                    [+ Novo Marco]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ●──────────────────●──────────────────●──────────────────○──────────────────○  │
│  │                  │                  │                  │                  │  │
│  Kickoff         Design          Desenvolvimento       Homolog.          Go-Live│
│  15/01/26 ✓      28/02/26 ✓      30/04/26 🔄           30/05/26          15/06/26│
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ ✓ Kickoff do Projeto                                     15/01/2026       │ │
│  │   Reuniao inicial com stakeholders                       [Concluido]      │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ ✓ Entrega do Design                                      28/02/2026       │ │
│  │   Wireframes e prototipos aprovados                      [Concluido]      │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ 🔄 Conclusao do Desenvolvimento                          30/04/2026       │ │
│  │   Features core implementadas                            [Em Andamento]   │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ ○ Homologacao                                            30/05/2026       │ │
│  │   Testes com usuario final                               [Pendente]       │ │
│  ├────────────────────────────────────────────────────────────────────────────┤ │
│  │ ○ Go-Live                                                15/06/2026       │ │
│  │   Lancamento em producao                                 [Pendente]       │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Layout Visual - Aba Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Resultado Financeiro Esperado                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Receita      │  │ Custo Plan.  │  │ Margem Bruta │  │ Margem %     │         │
│  │ R$ 40.800,00 │  │ R$ 19.568,18 │  │ R$ 21.231,82 │  │ 52,0%        │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ Composicao de Custos Planejados                                            │ │
│  │                                                                             │ │
│  │ ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │ │ Mao de Obra      │ R$ 15.068,18  │ ██████████████████████████░░░░ 77%  │ │ │
│  │ │ Fornecedores     │ R$ 4.500,00   │ ██████████░░░░░░░░░░░░░░░░░░░░ 23%  │ │ │
│  │ │ Materiais        │ R$ 0,00       │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%   │ │ │
│  │ └────────────────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ Projecao de Recebimentos                                                   │ │
│  │                                                                             │ │
│  │ Jan  ████████  R$ 20.400,00                                                 │ │
│  │ Fev  ████████  R$ 20.400,00                                                 │ │
│  │                                                                             │ │
│  │ Total: R$ 40.800,00                                                         │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Hooks Necessarios

| Hook | Descricao |
|------|-----------|
| `useProjectOKRs.ts` | CRUD de OKRs e Key Results |
| `useProjectStakeholders.ts` | CRUD de Stakeholders |
| `useProjectMilestones.ts` | CRUD de Milestones |

## Arquivos a Criar

### Tipos
- `src/types/projectOkr.ts`
- `src/types/projectStakeholder.ts`
- `src/types/projectMilestone.ts`

### Hooks
- `src/hooks/useProjectOKRs.ts`
- `src/hooks/useProjectStakeholders.ts`
- `src/hooks/useProjectMilestones.ts`

### Componentes - OKRs
- `src/components/projects/detail/ProjectOKRsTab.tsx`
- `src/components/projects/okrs/OKRCard.tsx`
- `src/components/projects/okrs/OKRFormDialog.tsx`
- `src/components/projects/okrs/KeyResultRow.tsx`
- `src/components/projects/okrs/KeyResultFormDialog.tsx`

### Componentes - Stakeholders
- `src/components/projects/detail/ProjectStakeholdersTab.tsx`
- `src/components/projects/stakeholders/StakeholderCard.tsx`
- `src/components/projects/stakeholders/StakeholderFormDialog.tsx`

### Componentes - Cronograma
- `src/components/projects/detail/ProjectScheduleTab.tsx`
- `src/components/projects/schedule/MilestoneTimeline.tsx`
- `src/components/projects/schedule/MilestoneCard.tsx`
- `src/components/projects/schedule/MilestoneFormDialog.tsx`

### Componentes - Resultado Esperado
- `src/components/projects/detail/ProjectExpectedResultTab.tsx`

### Componentes - Planejamento
- `src/components/projects/detail/ProjectPlanningOverviewTab.tsx`

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ProjectDetail.tsx` | Renderizacao condicional de abas por fase |
| `src/types/project.ts` | Adicionar portfolio_stage ao ProjectWithRelations |

## Migracao SQL

```sql
-- OKRs
CREATE TABLE public.project_okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'pending',
  progress_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.project_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES project_okrs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stakeholders
CREATE TABLE public.project_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  organization TEXT,
  email TEXT,
  phone TEXT,
  influence_level TEXT,
  interest_level TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Milestones
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  planned_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (padrao tenant-based)
ALTER TABLE project_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- Policies seguem o mesmo padrao das outras tabelas de projeto
```

## Resumo de Entregaveis

| Categoria | Quantidade |
|-----------|------------|
| Novas tabelas SQL | 4 (okrs, key_results, stakeholders, milestones) |
| Novos tipos TS | 3 |
| Novos hooks | 3 |
| Novos componentes | 15 |
| Arquivos modificados | 2 |
