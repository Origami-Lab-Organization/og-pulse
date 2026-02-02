
# Plano: Tela de Gestao de Projeto em Tela Cheia

## Visao Geral

Criar uma experiencia completa de gestao de projetos em tela cheia (mantendo sidebar) com navegacao por abas, substituindo o modal atual. Esta primeira fase foca na **Visao Geral** e **Dados Financeiros**.

## Arquitetura da Solucao

```text
/projects/:id
    │
    ├── Visao Geral (Tab 1) ─────────────────────────────────────────────────────
    │   ├── Header com status, cliente, gerente
    │   ├── Cards de resumo (duracao, valor, progresso)
    │   └── Descricao e informacoes basicas
    │
    ├── Custos (Tab 2) ──────────────────────────────────────────────────────────
    │   ├── Mao de Obra (horas alocadas por membro)
    │   ├── Fornecedores (custos de servico externo)
    │   └── Materiais (custos avulsos)
    │
    ├── Financeiro (Tab 3) ──────────────────────────────────────────────────────
    │   ├── Planejado vs Realizado
    │   ├── Analise de margem
    │   └── Curva de tendencia (grafico temporal)
    │
    ├── Stakeholders (Tab 4) - Futuro ───────────────────────────────────────────
    │   └── Gestao de partes interessadas e nivel de apoio
    │
    └── Cronograma (Tab 5) - Futuro ─────────────────────────────────────────────
        └── Marcos e entregas principais
```

## Novas Tabelas no Banco de Dados

### 1. `project_suppliers` - Fornecedores do Projeto

Custos recorrentes mensais com fornecedores externos durante a execucao.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| project_id | uuid | FK para projects |
| supplier_id | uuid | FK para suppliers (opcional) |
| name | text | Nome do fornecedor |
| description | text | Descricao do servico |
| monthly_value | numeric | Valor mensal |
| start_month | integer | Mes de inicio (1-based) |
| end_month | integer | Mes de fim (1-based) |
| created_at | timestamp | Data criacao |

### 2. `project_materials` - Materiais do Projeto

Custos avulsos com materiais e insumos.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| project_id | uuid | FK para projects |
| description | text | Descricao do material |
| value | numeric | Valor total |
| purchase_date | date | Data prevista/realizada |
| is_realized | boolean | Se ja foi realizado |
| created_at | timestamp | Data criacao |

### 3. `project_costs_actual` - Custos Realizados

Lancamentos de custos realizados para comparar com planejado.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| project_id | uuid | FK para projects |
| category | text | 'labor', 'supplier', 'material' |
| reference_id | uuid | ID do item relacionado (opcional) |
| description | text | Descricao |
| value | numeric | Valor realizado |
| period_month | integer | Mes do custo |
| created_at | timestamp | Data criacao |

## Estrutura de Arquivos

### Novos Arquivos

```text
src/
├── pages/
│   └── ProjectDetail.tsx                    # Pagina principal do projeto
│
├── components/projects/
│   ├── detail/
│   │   ├── ProjectHeader.tsx                # Header com status e acoes
│   │   ├── ProjectOverviewTab.tsx           # Aba Visao Geral
│   │   ├── ProjectCostsTab.tsx              # Aba Custos
│   │   ├── ProjectFinancialTab.tsx          # Aba Financeiro
│   │   ├── ProjectSuppliersSection.tsx      # Tabela de fornecedores
│   │   ├── ProjectMaterialsSection.tsx      # Tabela de materiais
│   │   ├── ProjectFinancialChart.tsx        # Grafico planejado vs realizado
│   │   └── ProjectTrendChart.tsx            # Curva de tendencia
│   │
│   └── (arquivos existentes)
│
├── types/
│   └── project.ts                           # Adicionar novos tipos
│
├── services/
│   └── projectService.ts                    # Adicionar novos metodos
│
└── hooks/
    └── useProjects.ts                       # Adicionar novos hooks
```

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/projects/:id` |
| `src/pages/Projects.tsx` | Navegar para `/projects/:id` ao clicar |
| `src/types/project.ts` | Adicionar tipos para suppliers, materials, costs |
| `src/services/projectService.ts` | CRUD para novas entidades |
| `src/hooks/useProjects.ts` | Hooks para novas entidades |

## Implementacao Fase 1: Visao Geral e Financeiro

### 1. Migracoes SQL

```sql
-- Tabela: project_suppliers
CREATE TABLE public.project_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  monthly_value numeric NOT NULL DEFAULT 0,
  start_month integer NOT NULL DEFAULT 1,
  end_month integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela: project_materials
CREATE TABLE public.project_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  purchase_date date,
  is_realized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para ambas as tabelas
-- (Policies seguindo padrao existente de projects)
```

### 2. Pagina ProjectDetail.tsx

```tsx
// Estrutura principal
export default function ProjectDetail() {
  const { id } = useParams();
  const { data: project } = useProject(id);
  
  return (
    <AppLayout
      title={project.name}
      breadcrumbs={[
        { label: 'Projetos', href: '/projects' },
        { label: project.name }
      ]}
      actions={<ProjectActions project={project} />}
    >
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="costs">Custos</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="stakeholders" disabled>Stakeholders</TabsTrigger>
          <TabsTrigger value="schedule" disabled>Cronograma</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <ProjectOverviewTab project={project} />
        </TabsContent>
        
        <TabsContent value="costs">
          <ProjectCostsTab project={project} />
        </TabsContent>
        
        <TabsContent value="financial">
          <ProjectFinancialTab project={project} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
```

### 3. Aba Visao Geral

Conteudo:
- Cards de resumo: Status, Cliente, Gerente, Duracao
- Valores: Total do Contrato, Recebido, Pendente
- Descricao do projeto
- Tabela de parcelas (resumo)

### 4. Aba Custos

Subsecoes com tabelas editaveis:
- **Mao de Obra**: Reutiliza `ProjectMembersTable` existente
- **Fornecedores**: Nova tabela com CRUD inline
- **Materiais**: Nova tabela com CRUD inline

Cada secao mostra subtotal e o total geral de custos.

### 5. Aba Financeiro

Componentes:
- **Cards de Resultado**: Custo Planejado, Custo Realizado, Variacao
- **Analise de Margem**: Valor Contrato vs Custo Total, % margem
- **Grafico Planejado vs Realizado**: Barras agrupadas por mes
- **Curva de Tendencia**: Linha temporal com projecao

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Resultado Financeiro                                                       │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Planejado    │  │ Realizado    │  │ Variacao     │  │ Margem       │    │
│  │ R$ 50.000    │  │ R$ 45.000    │  │ -R$ 5.000    │  │ 32%          │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Grafico: Planejado vs Realizado por Mes                            │   │
│  │  [=======] Planejado                                                │   │
│  │  [=====  ] Realizado                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Curva de Tendencia                                                  │   │
│  │  ────────────────                                                    │   │
│  │  Custos acumulados com projecao de tendencia                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Restricoes por Status

Quando `status === 'planning'`:
- Todas as edicoes habilitadas
- Mensagem: "Configure os custos planejados antes de iniciar o projeto"

Quando `status !== 'planning'`:
- Custos planejados: somente leitura
- Custos realizados: editaveis
- Exibe comparativo planejado vs realizado

## Navegacao

### Fluxo de Navegacao

1. Usuario acessa `/projects`
2. Clica em uma linha da tabela
3. Navega para `/projects/:id`
4. Visualiza projeto em tela cheia com abas

### Alteracao em Projects.tsx

```tsx
// Antes: abre modal
const handleView = (project) => {
  setViewingProjectId(project.id);
  setDetailDialogOpen(true);
};

// Depois: navega para pagina
const handleView = (project) => {
  navigate(`/projects/${project.id}`);
};
```

## Proximos Passos (Fases Futuras)

### Fase 2: Stakeholders
- Tabela `project_stakeholders`
- Campos: nome, organizacao, papel, nivel_apoio, influencia
- Matriz de poder vs interesse

### Fase 3: Cronograma
- Tabela `project_milestones`
- Campos: titulo, data_prevista, data_realizada, status
- Visualizacao tipo timeline

## Resumo de Alteracoes

| Categoria | Item |
|-----------|------|
| Migracoes | 2 novas tabelas + RLS policies |
| Paginas | 1 nova (`ProjectDetail.tsx`) |
| Componentes | 8 novos componentes |
| Services | Adicoes ao `projectService.ts` |
| Hooks | Adicoes ao `useProjects.ts` |
| Tipos | Adicoes ao `project.ts` |
| Rotas | 1 nova rota em `App.tsx` |
