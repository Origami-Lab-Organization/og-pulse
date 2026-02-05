
# Plano: Herdar Horas do Orçamento ao Adicionar Membro

## Problema Identificado

Ao adicionar um membro à equipe do projeto usando um papel do orçamento, o sistema herda:
- Nome do papel
- Senioridade
- Valor/hora

Mas **não herda** as horas planejadas por mês que estão registradas no orçamento (tabela `budget_role_months`).

## Solução

Modificar o fluxo de adição de membro para que, após criar o `project_member`, também crie os registros de `project_member_months` copiando as horas de cada mês do papel do orçamento.

---

## Alterações Técnicas

### 1. Modificar `ProjectLaborSection.tsx`

Atualizar a função `handleAddMember` para passar as horas mensais do papel selecionado:

```typescript
const handleAddMember = () => {
  if (!newMember.employeeId || !newMember.role) return;
  
  // Obter as horas mensais do papel do orçamento (se selecionado)
  const budgetRole = budgetRoles.find(r => r.id === newMember.budgetRoleId);
  const monthlyHours = budgetRole?.months || [];
  
  addMember.mutate(
    {
      projectId,
      employeeId: newMember.employeeId,
      role: newMember.role,
      seniority: newMember.seniority,
      hoursPerMonth: 0, // Valor legado, não usado
      budgetRoleId: useBudgetRole && newMember.budgetRoleId ? newMember.budgetRoleId : undefined,
      hourlyRate: newMember.hourlyRate,
      monthlyHours, // NOVO: passar array de horas
    },
    { ... }
  );
};
```

### 2. Atualizar `CreateProjectMemberInput` em `types/project.ts`

Adicionar campo opcional para as horas mensais:

```typescript
export interface CreateProjectMemberInput {
  projectId: string;
  employeeId: string;
  role: string;
  seniority: string;
  hoursPerMonth: number;
  budgetRoleId?: string;
  hourlyRate?: number;
  monthlyHours?: { monthNumber: number; hours: number }[]; // NOVO
}
```

### 3. Modificar `projectService.addMember`

Após criar o membro, se houver `monthlyHours`, criar os registros em `project_member_months`:

```typescript
async addMember(input: CreateProjectMemberInput): Promise<ProjectMemberDB> {
  const { data, error } = await supabase
    .from('project_members')
    .insert({ ... })
    .select()
    .single();

  if (error) throw error;

  // Se houver horas do orçamento, copiar para project_member_months
  if (input.monthlyHours && input.monthlyHours.length > 0) {
    const monthInserts = input.monthlyHours.map(m => ({
      project_member_id: data.id,
      month_number: m.monthNumber,
      hours: m.hours,
    }));

    await supabase.from('project_member_months').insert(monthInserts);
  }

  return data;
}
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `types/project.ts` | Adicionar `monthlyHours` ao `CreateProjectMemberInput` |
| `services/projectService.ts` | Criar registros em `project_member_months` ao adicionar membro |
| `ProjectLaborSection.tsx` | Passar horas mensais do papel do orçamento ao adicionar membro |

---

## Benefícios

- Ao selecionar um papel do orçamento, as horas planejadas são automaticamente copiadas
- O usuário não precisa replicar manualmente a alocação mês a mês
- Mantém consistência entre planejamento comercial e execução do projeto
