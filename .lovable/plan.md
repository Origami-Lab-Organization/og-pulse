
# Plano: Planejamento de Custos Mes a Mes para Projetos

## Visao Geral

Implementar um sistema de planejamento de custos mensais para projetos, permitindo que cada tipo de custo (mao de obra, fornecedores, materiais) seja configurado mes a mes, similar ao que ja existe na funcionalidade de orcamentos.

## Alteracoes no Banco de Dados

### 1. Nova Tabela: `project_member_months`

Armazena as horas alocadas por membro por mes do projeto.

```sql
CREATE TABLE project_member_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_member_id UUID NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(project_member_id, month_number)
);
```

### 2. Nova Tabela: `project_supplier_months`

Armazena o valor mensal de cada fornecedor por mes.

```sql
CREATE TABLE project_supplier_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_supplier_id UUID NOT NULL REFERENCES project_suppliers(id) ON DELETE CASCADE,
  month_number INTEGER NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(project_supplier_id, month_number)
);
```

### 3. Adicionar Coluna em `project_materials`

Adicionar `month_number` para associar o material a um mes especifico.

```sql
ALTER TABLE project_materials ADD COLUMN month_number INTEGER DEFAULT 1;
```

### 4. Adicionar Coluna em `projects`

Adicionar `duration_months` para definir a duracao do projeto em meses.

```sql
ALTER TABLE projects ADD COLUMN duration_months INTEGER NOT NULL DEFAULT 1;
```

### 5. Politicas RLS

Criar politicas RLS para as novas tabelas seguindo o padrao existente (via projeto -> tenant).

## Arquivos a Serem Modificados

### Types e Interfaces

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/project.ts` | Adicionar interfaces `ProjectMemberMonthDB`, `ProjectSupplierMonthDB` e tipos de input |

### Hooks

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useProjectCosts.ts` | Adicionar hooks para gerenciar member_months e supplier_months |

### Componentes - Custos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/detail/ProjectCostsTab.tsx` | Adicionar props de duracao e calcular custos por mes |
| `src/components/projects/detail/ProjectLaborSection.tsx` | **NOVO** - Editor de mao de obra mes a mes (similar a BudgetRolesEditor) |
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Refatorar para editor mes a mes |
| `src/components/projects/detail/ProjectMaterialsSection.tsx` | Adicionar selecao de mes |

### Componentes - Checklist

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/detail/ProjectPlanningOverviewTab.tsx` | Adicionar verificacao dinamica de custos e cronograma no checklist |

## Interface do Usuario

### Aba de Custos em Planejamento

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  Duracao do Projeto: [6] meses                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MAO DE OBRA                                            [+ Adicionar Membro] │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ Funcionario    │ Valor/h │ Mes 1 │ Mes 2 │ Mes 3 │ ... │ Total H │ Total ││
│  │────────────────│─────────│───────│───────│───────│─────│─────────│───────││
│  │ Joao Silva     │  R$ 85  │  40h  │  40h  │  20h  │ ... │  100h   │ R$8.5k││
│  │ Maria Santos   │ R$ 120  │  80h  │  80h  │  80h  │ ... │  240h   │ R$28k ││
│  │────────────────│─────────│───────│───────│───────│─────│─────────│───────││
│  │ TOTAL          │    -    │ 120h  │ 120h  │ 100h  │ ... │  340h   │ R$36k ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  FORNECEDORES                                       [+ Adicionar Fornecedor] │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ Nome           │ Mes 1   │ Mes 2   │ Mes 3   │ ... │ Total             ││
│  │────────────────│─────────│─────────│─────────│─────│───────────────────││
│  │ Agencia MKT    │ R$ 5k   │ R$ 5k   │ R$ 5k   │ ... │ R$ 30k            ││
│  │ Consultoria    │ R$ 10k  │    -    │    -    │ ... │ R$ 10k            ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  MATERIAIS                                            [+ Adicionar Material] │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ Descricao             │ Mes    │ Valor                                   ││
│  │───────────────────────│────────│─────────────────────────────────────────││
│  │ Licenca Software      │ Mes 1  │ R$ 2.000                                ││
│  │ Equipamento           │ Mes 3  │ R$ 15.000                               ││
│  └──────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Logica do Checklist de Custos

O item "Custos planejados" sera marcado como concluido quando:
- Houver pelo menos um custo preenchido (membro com horas, fornecedor com valor, ou material)

```typescript
const hasCosts = 
  (project.members?.length || 0) > 0 || 
  (project.suppliers?.length || 0) > 0 || 
  (project.materials?.length || 0) > 0;
```

### Logica do Checklist de Cronograma

O item "Cronograma definido" sera marcado como concluido quando:
- Houver pelo menos um milestone cadastrado

```typescript
const hasMilestones = milestones.length > 0;
```

## Fluxo de Implementacao

### Fase 1: Banco de Dados
1. Criar migracao com novas tabelas e colunas
2. Adicionar politicas RLS

### Fase 2: Backend (Types e Hooks)
1. Atualizar types em `src/types/project.ts`
2. Adicionar hooks para member_months e supplier_months
3. Atualizar queries existentes para incluir novos dados

### Fase 3: Frontend - Editor de Mao de Obra
1. Criar `ProjectLaborSection.tsx` com tabela mes a mes
2. Integrar com hook de membros e meses

### Fase 4: Frontend - Editor de Fornecedores
1. Refatorar `ProjectSuppliersSection.tsx` para layout mes a mes
2. Atualizar dialogo de adicao

### Fase 5: Frontend - Editor de Materiais
1. Adicionar selecao de mes no formulario de materiais
2. Exibir mes na tabela

### Fase 6: Checklist Dinamico
1. Importar hooks necessarios em `ProjectPlanningOverviewTab.tsx`
2. Implementar logica dinamica para "Custos planejados" e "Cronograma definido"

## Resumo de Arquivos

| Arquivo | Operacao | Descricao |
|---------|----------|-----------|
| `supabase/migrations/...` | Criar | Migracao para novas tabelas |
| `src/types/project.ts` | Editar | Adicionar novos tipos |
| `src/hooks/useProjectCosts.ts` | Editar | Adicionar hooks para meses |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Criar | Novo componente de mao de obra |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Editar | Integrar novo layout |
| `src/components/projects/detail/ProjectSuppliersSection.tsx` | Editar | Layout mes a mes |
| `src/components/projects/detail/ProjectMaterialsSection.tsx` | Editar | Adicionar selecao de mes |
| `src/components/projects/detail/ProjectPlanningOverviewTab.tsx` | Editar | Checklist dinamico |

## Consideracoes Tecnicas

1. **Performance**: Usar `useMemo` para calculos de totais por mes e por item
2. **Scroll Horizontal**: Tabelas com muitos meses precisam de scroll horizontal
3. **Responsividade**: Em telas menores, considerar exibir apenas resumo
4. **Retrocompatibilidade**: Projetos existentes terao `duration_months = 1` e custos do mes 1
