
# Plano: Reformulação da Tela de Alocação de Equipe

## Contexto

O usuário deseja reformular a seção de alocação de equipe na tela de custos do projeto para melhorar a experiência do gerente durante o planejamento.

## Problemas Identificados

1. A seção "Papéis do Orçamento (referência)" é redundante e não será mais necessária
2. A tabela atual mostra funcionários alocados, mas o fluxo ideal é mostrar os **papéis** planejados e permitir selecionar funcionários para cada papel
3. O dropdown atual de funcionários não exibe informações suficientes (nome, cargo, valor/hora) para ajudar na decisão

---

## Nova Abordagem

### Conceito Principal

A seção de alocação será baseada em **papéis** (roles) ao invés de funcionários:
- Cada linha representa um **papel** planejado para o projeto
- O papel pode ter ou não um funcionário associado
- O usuário pode adicionar novos papéis manualmente
- O usuário pode deletar papéis existentes

### Fluxo do Usuário

1. Ao converter um orçamento, os papéis do orçamento são herdados como linhas na tabela
2. O gerente vê cada papel com suas horas planejadas por mês
3. Na coluna "Funcionário", há um dropdown onde pode selecionar quem executará aquele papel
4. O dropdown mostra: Nome, Cargo na Empresa, Valor/Hora
5. Pode adicionar novos papéis sem funcionário associado
6. Pode deletar papéis que não serão utilizados

---

## Alterações Técnicas

### 1. Mudança de Modelo Mental

**Antes:** A tabela lista `project_members` (funcionário + papel)
**Depois:** A tabela lista papéis, sendo que cada papel pode ter um funcionário associado (ou não)

No banco, o `project_members` já suporta isso via `budget_role_id` e os campos `role`, `seniority`, `hourly_rate`. A mudança é permitir que `employee_id` seja NULL para papéis sem funcionário associado.

### 2. Migração do Banco de Dados

```sql
-- Permitir que employee_id seja NULL para papéis sem funcionário associado
ALTER TABLE project_members 
ALTER COLUMN employee_id DROP NOT NULL;
```

### 3. Alterações no `ProjectLaborSection.tsx`

#### Remover Seção de Referência do Orçamento
- Deletar completamente o card "Papéis do Orçamento (referência)" que usa badges

#### Refatorar Tabela Principal

**Nova estrutura de colunas:**
| Papel | Senioridade | Funcionário | Orç. R$/h | Custo R$/h | Mês 1 | ... | Horas | Custo | Ações |

**Coluna "Funcionário":**
- Exibe um Select/Dropdown
- Quando não há funcionário: mostra "Selecionar funcionário"
- Quando há funcionário: mostra o nome do funcionário
- O dropdown lista funcionários disponíveis com:
  - Nome completo
  - Cargo na empresa
  - Valor/hora calculado (custo total / jornada)

**Coluna "Ações":**
- Botão de editar (lápis) - permite alterar papel, senioridade, valor/hora
- Botão de excluir (lixeira) - deleta o papel

#### Novo Dialog "Adicionar Papel"

Em vez de "Adicionar Membro", será "Adicionar Papel":

```
┌─────────────────────────────────────────────┐
│ Adicionar Papel                              │
├─────────────────────────────────────────────┤
│ Papel no Projeto: [________________]         │
│                                              │
│ ┌──────────────────┐ ┌──────────────────┐   │
│ │ Senioridade      │ │ Valor/Hora (R$)  │   │
│ │ [Select ▼      ] │ │ [___________]    │   │
│ └──────────────────┘ └──────────────────┘   │
│                                              │
│ [ ] Herdar de papel do orçamento             │
│ [Select papel do orçamento ▼]                │
│                                              │
│              [Cancelar] [Adicionar]          │
└─────────────────────────────────────────────┘
```

Se herdar do orçamento:
- Preenche automaticamente papel, senioridade, valor/hora
- Copia as horas por mês do papel do orçamento

#### Refatorar Seleção de Funcionário Inline

Na coluna "Funcionário" da tabela, usar um Select com:

```tsx
<Select 
  value={member.employee_id || ''} 
  onValueChange={(empId) => handleAssignEmployee(member.id, empId)}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecionar funcionário" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">
      <span className="text-muted-foreground italic">Sem funcionário</span>
    </SelectItem>
    {availableEmployees.map((emp) => {
      const hourlyCost = emp.totalMonthlyCostEstimated / emp.jornadaMensal;
      return (
        <SelectItem key={emp.id} value={emp.id}>
          <div className="flex flex-col">
            <span className="font-medium">{emp.nome}</span>
            <span className="text-xs text-muted-foreground">
              {emp.cargo} • {formatCurrency(hourlyCost)}/h
            </span>
          </div>
        </SelectItem>
      );
    })}
  </SelectContent>
</Select>
```

### 4. Alterações no Hook `useProjects.ts`

#### Novo Mutation: `useAssignMemberEmployee`

Permite associar/desassociar um funcionário a um papel existente:

```typescript
export const useAssignMemberEmployee = () => {
  return useMutation({
    mutationFn: async ({ memberId, projectId, employeeId }: { 
      memberId: string; 
      projectId: string; 
      employeeId: string | null;
    }) => {
      return projectService.updateMember(memberId, { employee_id: employeeId });
    },
    // ...
  });
};
```

### 5. Alterações no `projectService.ts`

Atualizar o método `addMember` para permitir `employeeId` como opcional:

```typescript
async addMember(input: CreateProjectMemberInput) {
  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: input.projectId,
      employee_id: input.employeeId || null, // Allow null
      role: input.role,
      seniority: input.seniority,
      // ...
    })
    // ...
}
```

### 6. Atualizar Tipos

Em `src/types/project.ts`:

```typescript
export interface CreateProjectMemberInput {
  projectId: string;
  employeeId?: string; // Now optional
  role: string;
  seniority: string;
  // ...
}
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Permitir `employee_id` NULL em `project_members` |
| `types/project.ts` | Tornar `employeeId` opcional no input |
| `services/projectService.ts` | Permitir criar membro sem funcionário, método para atribuir funcionário |
| `hooks/useProjects.ts` | Adicionar `useAssignMemberEmployee` |
| `ProjectLaborSection.tsx` | Remover seção de referência, refatorar tabela com seleção inline de funcionário, novo dialog para adicionar papel |

---

## Resultado Esperado

- Interface focada em papéis ao invés de funcionários
- Dropdown inline mostra nome, cargo e valor/hora do funcionário
- Possibilidade de planejar papéis sem atribuir funcionários
- Possibilidade de deletar papéis que não serão utilizados
- Referência do orçamento integrada diretamente na criação de novos papéis
