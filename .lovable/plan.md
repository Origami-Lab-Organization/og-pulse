
# Plano: Ajustes nas Paginas do Projeto em Planejamento

## Resumo das Alteracoes

1. **Marcos do cronograma**: Adicionar data de inicio e data de fim (substituindo `planned_date` unica)
2. **Remover ordem manual**: A ordenacao sera automatica pela data de inicio
3. **Renomear campo**: "Descricao" passa a ser "Entregaveis"
4. **Corrigir custos nos Resultados Esperados**: Usar dados reais do planejamento (tabelas `project_member_months` e `project_supplier_months`)

---

## Fase 1: Alteracao no Banco de Dados (Milestones)

### Migracao SQL

```sql
-- Renomear planned_date para start_date
ALTER TABLE project_milestones 
RENAME COLUMN planned_date TO start_date;

-- Adicionar coluna end_date
ALTER TABLE project_milestones 
ADD COLUMN end_date DATE;

-- Copiar dados iniciais (end_date = start_date para marcos existentes)
UPDATE project_milestones SET end_date = start_date WHERE end_date IS NULL;

-- Tornar end_date obrigatorio
ALTER TABLE project_milestones 
ALTER COLUMN end_date SET NOT NULL;

-- Renomear description para deliverables
ALTER TABLE project_milestones 
RENAME COLUMN description TO deliverables;

-- Remover coluna order_index (nao mais necessaria)
ALTER TABLE project_milestones 
DROP COLUMN order_index;
```

---

## Fase 2: Atualizar Tipos TypeScript

**Arquivo:** `src/types/projectMilestone.ts`

```typescript
export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  deliverables: string | null;  // Renomeado de description
  start_date: string;            // Renomeado de planned_date
  end_date: string;              // Novo campo
  completed_date: string | null;
  status: MilestoneStatus;
  created_at: string;
  // Removido: order_index
}

export interface CreateMilestoneInput {
  projectId: string;
  title: string;
  deliverables?: string;         // Renomeado
  startDate: string;             // Renomeado
  endDate: string;               // Novo
  // Removido: orderIndex
}

export interface UpdateMilestoneInput {
  title?: string;
  deliverables?: string;         // Renomeado
  startDate?: string;            // Renomeado
  endDate?: string;              // Novo
  completedDate?: string;
  status?: MilestoneStatus;
  // Removido: orderIndex
}
```

---

## Fase 3: Atualizar Hook de Milestones

**Arquivo:** `src/hooks/useProjectMilestones.ts`

**Alteracoes:**
- Ordenar por `start_date` em vez de `order_index`
- Atualizar campos no create/update

```typescript
// Query: ordenar por start_date
.order('start_date', { ascending: true })

// Create mutation
.insert({
  project_id: input.projectId,
  title: input.title,
  deliverables: input.deliverables || null,
  start_date: input.startDate,
  end_date: input.endDate,
})

// Update mutation
.update({
  title: updates.title,
  deliverables: updates.deliverables,
  start_date: updates.startDate,
  end_date: updates.endDate,
  completed_date: updates.completedDate,
  status: updates.status,
})
```

---

## Fase 4: Atualizar Formulario de Marco

**Arquivo:** `src/components/projects/schedule/MilestoneFormDialog.tsx`

**Alteracoes:**
1. Renomear campo "Descricao" para "Entregaveis"
2. Substituir "Data Planejada" por "Data de Inicio" e "Data de Fim"
3. Remover campo "Ordem"

```text
┌────────────────────────────────────────────────────────────────────┐
│ Novo Marco                                                         │
├────────────────────────────────────────────────────────────────────┤
│ Titulo *                                                           │
│ [ Ex: Kickoff do Projeto                               ]          │
│                                                                    │
│ Entregaveis                                                        │
│ [ Descreva os entregaveis deste marco...               ]          │
│                                                                    │
│ Data de Inicio *              Data de Fim *                       │
│ [ 2026-02-01        ]         [ 2026-02-28        ]               │
│                                                                    │
│ (Campos abaixo apenas na edicao)                                  │
│ Data de Conclusao                                                  │
│ [ ____-__-__        ]                                             │
│                                                                    │
│ Status                                                             │
│ [ Pendente                            ▼ ]                         │
├────────────────────────────────────────────────────────────────────┤
│                                  [ Cancelar ]  [ Criar ]          │
└────────────────────────────────────────────────────────────────────┘
```

---

## Fase 5: Atualizar Visualizacao do Cronograma

**Arquivo:** `src/components/projects/detail/ProjectScheduleTab.tsx`

**Alteracoes:**
1. Exibir periodo (inicio - fim) em vez de data unica
2. Atualizar timeline visual para mostrar datas de inicio e fim

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Marco: Kickoff do Projeto                                                   │
│ Entregaveis: Reuniao de alinhamento, definicao de escopo                   │
│                                                                             │
│ Periodo: 01/02/2026 - 15/02/2026                                           │
│ Status: [Em Andamento]                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 6: Corrigir Resultados Esperados

**Arquivo:** `src/components/projects/detail/ProjectExpectedResultTab.tsx`

### Problema Atual:
O calculo de custos usa dados incorretos:
- **Mao de obra**: Usa `hours_per_month` (campo legado) em vez de somar os dados de `project_member_months`
- **Fornecedores**: Usa `monthly_value * (end_month - start_month + 1)` em vez de somar `project_supplier_months`

### Solucao:
Buscar os dados mensais reais (mesmo approach usado no `ProjectCostsTab`):

```typescript
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';

export function ProjectExpectedResultTab({ project }: ProjectExpectedResultTabProps) {
  // Buscar dados mensais
  const memberIds = useMemo(() => (project.members || []).map((m) => m.id), [project.members]);
  const supplierIds = useMemo(() => (project.suppliers || []).map((s) => s.id), [project.suppliers]);

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);

  const costs = useMemo(() => {
    // CORRETO: Calcular mao de obra a partir das horas mensais reais
    let laborCost = 0;
    project.members?.forEach((member) => {
      const employee = member.employee;
      if (!employee) return;
      
      const totalMonthlyCost = employee.total_monthly_cost_estimated || 0;
      const workHours = employee.jornada_mensal || 168;
      const realHourlyCost = workHours > 0 ? totalMonthlyCost / workHours : 0;

      const memberHours = memberMonths
        .filter((mm) => mm.project_member_id === member.id)
        .reduce((sum, mm) => sum + Number(mm.hours), 0);

      laborCost += realHourlyCost * memberHours;
    });

    // CORRETO: Calcular fornecedores a partir dos valores mensais reais
    const suppliersCost = supplierMonths.reduce((sum, sm) => sum + Number(sm.value), 0);

    // Materiais permanecem igual
    const materialsCost = project.materials?.reduce((total, material) => {
      return total + material.value;
    }, 0) || 0;

    return { laborCost, suppliersCost, materialsCost };
  }, [project.members, project.materials, memberMonths, supplierMonths]);

  // ... resto do componente
}
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| **Banco de Dados** | Renomear `planned_date` -> `start_date`, adicionar `end_date`, renomear `description` -> `deliverables`, remover `order_index` |
| `src/types/projectMilestone.ts` | Atualizar interfaces com novos campos |
| `src/hooks/useProjectMilestones.ts` | Atualizar queries e mutations para novos campos |
| `src/components/projects/schedule/MilestoneFormDialog.tsx` | Reformular formulario com datas de inicio/fim, renomear "Descricao" para "Entregaveis", remover campo "Ordem" |
| `src/components/projects/detail/ProjectScheduleTab.tsx` | Atualizar exibicao para mostrar periodo (inicio-fim) |
| `src/components/projects/detail/ProjectExpectedResultTab.tsx` | Usar `useProjectMemberMonths` e `useProjectSupplierMonths` para calcular custos corretamente |

---

## Beneficios

1. **Marcos com periodo**: Permite definir duracao de cada entrega, nao apenas uma data pontual
2. **Ordem automatica**: Simplifica interface removendo campo manual
3. **Nomenclatura clara**: "Entregaveis" e mais preciso que "Descricao"
4. **Custos corretos**: Resultados esperados refletem os dados reais planejados mes a mes
