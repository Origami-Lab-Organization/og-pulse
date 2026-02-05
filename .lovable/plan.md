
# Plano: Mostrar Planejado vs Realizado por Mês na Alocação de Equipe

## Objetivo

Modificar a seção de Alocação de Equipe para exibir, em cada coluna de mês, as horas planejadas e realizadas (timesheets) lado a lado, conforme a referência visual fornecida.

---

## Formato Desejado

```
┌─────────────────┬──────────┬───────────┬─────────┬─────────┬─────────┬─────────────┬──────────────────────┐
│ Funcionário     │ Orç. R$/h│ Custo R$/h│  Mês 1  │  Mês 2  │  Mês 3  │    Horas    │        Custo         │
│                 │          │           │         │         │         │  Plan|Real  │     Plan | Real      │
├─────────────────┼──────────┼───────────┼─────────┼─────────┼─────────┼─────────────┼──────────────────────┤
│ Victor Couto    │ R$180,00 │ R$ 119,05 │ 50 | 60 │ 50 | 45 │  -  | 0 │ 100h | 105h │ R$11.904 | R$12.500  │
│ Líder de Proj.  │          │           │         │         │         │             │                      │
├─────────────────┼──────────┼───────────┼─────────┼─────────┼─────────┼─────────────┼──────────────────────┤
│ Total           │          │           │50h |60h │50h |45h │ 0h | 0h │ 100h | 105h │ R$11.904 | R$12.500  │
└─────────────────┴──────────┴───────────┴─────────┴─────────┴─────────┴─────────────┴──────────────────────┘
```

---

## Lógica de Mapeamento

Os timesheets possuem `work_date` (data real do trabalho). Para mapear para o número do mês do projeto:

```typescript
const getMonthNumber = (workDate: Date, projectStartDate: Date): number => {
  return differenceInMonths(workDate, projectStartDate) + 1;
};

// Exemplo:
// projectStartDate = 2025-01-15
// workDate = 2025-01-20 → Mês 1
// workDate = 2025-02-10 → Mês 2
// workDate = 2025-03-05 → Mês 3
```

---

## Alterações Necessárias

### 1. Arquivo: `src/components/projects/detail/ProjectCostsTab.tsx`

Passar a data de início do projeto para o `ProjectLaborSection`:

```typescript
<ProjectLaborSection
  projectId={project.id}
  members={project.members || []}
  durationMonths={durationMonths}
  isEditable={isEditable}
  budgetRoles={budget?.roles || []}
  timesheets={timesheets}
  projectStartDate={project.start_date}  // ← NOVO
/>
```

### 2. Arquivo: `src/components/projects/detail/ProjectLaborSection.tsx`

**a) Adicionar prop `projectStartDate`**:

```typescript
interface ProjectLaborSectionProps {
  // ... existentes
  projectStartDate: string;  // ← NOVO
}
```

**b) Criar função para calcular horas reais por membro e por mês**:

```typescript
const actualHoursByMemberAndMonth = useMemo(() => {
  const result: Record<string, Record<number, number>> = {};
  
  timesheets.forEach((ts) => {
    const workDate = parseISO(ts.work_date);
    const startDate = parseISO(projectStartDate);
    const monthNumber = differenceInMonths(workDate, startDate) + 1;
    
    if (!result[ts.project_member_id]) {
      result[ts.project_member_id] = {};
    }
    if (!result[ts.project_member_id][monthNumber]) {
      result[ts.project_member_id][monthNumber] = 0;
    }
    result[ts.project_member_id][monthNumber] += Number(ts.hours);
  });
  
  return result;
}, [timesheets, projectStartDate]);
```

**c) Modificar exibição das células de mês (modo não-editável)**:

Alterar de:
```tsx
<span>{getHoursForMonth(member.id, monthNum) || '-'}</span>
```

Para:
```tsx
<div className="flex items-center justify-center gap-1 text-sm">
  <span className="text-muted-foreground">
    {plannedHours > 0 ? plannedHours : '-'}
  </span>
  <span className="text-muted-foreground">|</span>
  <span className="font-medium">
    {actualHours > 0 ? actualHours : '-'}
  </span>
</div>
```

**d) Modificar cabeçalho das colunas de mês**:

Adicionar subtítulo "Plan | Real" nas colunas de mês:

```tsx
<TableHead key={m} className="text-center min-w-[80px]">
  <div className="flex flex-col">
    <span>Mês {m}</span>
    <span className="text-xs font-normal text-muted-foreground">Plan | Real</span>
  </div>
</TableHead>
```

**e) Atualizar totals por mês no rodapé**:

Calcular também o total realizado por mês e exibir no formato "50h | 60h".

---

## Comportamento Especial

| Situação | Planejado | Realizado | Exibição |
|----------|-----------|-----------|----------|
| Ambos preenchidos | 50 | 45 | 50 \| 45 |
| Apenas planejado | 50 | 0 | 50 \| - |
| Apenas realizado | 0 | 30 | - \| 30 |
| Nenhum | 0 | 0 | - \| - ou apenas - |

---

## Modo Editável (Planejamento)

Quando `isEditable=true` (fase de planejamento), manter o input para edição das horas planejadas, mas:
- Mostrar abaixo do input as horas realizadas (se houver)
- Ou exibir apenas o input se não houver timesheets

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/projects/detail/ProjectCostsTab.tsx` | Passar `projectStartDate` |
| `src/components/projects/detail/ProjectLaborSection.tsx` | Calcular e exibir horas por mês |
