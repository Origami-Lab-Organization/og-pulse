
# Plano: Filtrar Timesheets/Projetos por Gerente do Projeto

## Entendimento do Problema

Atualmente, todos os gerentes de projeto (`is_gerente = true`) conseguem ver **todos os projetos e timesheets** da organização. O requisito é:

| Perfil | Projetos Visíveis | Timesheets Visíveis |
|--------|-------------------|---------------------|
| **Admin** (`user_roles.role = 'admin'`) | Todos da organização | Todos da organização |
| **Gerente de Projeto** (`is_gerente = true` sem role admin) | Apenas onde é `manager_id` | Apenas dos projetos que gerencia |

## Arquitetura Atual

### Fluxo de Dados
1. **Timesheets**: `useActiveProjectsWithMembers()` busca todos os projetos ativos sem filtro
2. **Projetos**: `projectService.getAll()` busca todos os projetos do tenant

### Campos Relevantes
- `projects.manager_id` → UUID do funcionário que é gerente do projeto
- `employees.id` → ID do funcionário logado
- `employees.is_gerente` → Indica se é gerente
- `user_roles.role = 'admin'` → Indica se é administrador

## Solução Proposta

### 1. Modificar `useActiveProjectsWithMembers` (Timesheets)

Adicionar parâmetros para filtrar por gerente:

```typescript
export const useActiveProjectsWithMembers = (options?: { 
  isAdmin?: boolean; 
  employeeId?: string;
}) => {
  return useQuery({
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`...`)
        .or('status.eq.active,portfolio_stage.neq.planning');

      // Se não é admin, filtra apenas projetos onde é gerente
      if (!options?.isAdmin && options?.employeeId) {
        query = query.eq('manager_id', options.employeeId);
      }
      
      // ...
    }
  });
};
```

### 2. Modificar `projectService.getAll` (Projetos)

Adicionar parâmetro opcional para filtrar:

```typescript
async getAll(tenantId: string, options?: { 
  isAdmin?: boolean; 
  managerId?: string;
}): Promise<ProjectWithRelations[]> {
  let query = supabase
    .from('projects')
    .select(`...`)
    .eq('tenant_id', tenantId);
  
  // Filtra por gerente se não for admin
  if (!options?.isAdmin && options?.managerId) {
    query = query.eq('manager_id', options.managerId);
  }
  
  // ...
}
```

### 3. Atualizar `useProjects` Hook

Passar informações do usuário logado:

```typescript
export const useProjects = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin;
  const employeeId = employee?.id;

  return useQuery({
    queryKey: ['projects', tenantId, isAdmin, employeeId],
    queryFn: () => projectService.getAll(tenantId!, {
      isAdmin,
      managerId: isAdmin ? undefined : employeeId,
    }),
    enabled: !!tenantId,
  });
};
```

### 4. Atualizar Tela de Timesheets

```typescript
// Em Timesheets.tsx
const { employee } = useAuth();
const isAdmin = employee?.isAdmin ?? false;

const { data: projects } = useActiveProjectsWithMembers({
  isAdmin,
  employeeId: employee?.id,
});
```

### 5. Atualizar Portfolio (se necessário)

A mesma lógica deve ser aplicada ao hook `usePortfolioProjects` para consistência.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useTimesheetData.ts` | Adicionar parâmetros de filtro em `useActiveProjectsWithMembers` |
| `src/services/projectService.ts` | Adicionar parâmetros de filtro em `getAll` |
| `src/hooks/useProjects.ts` | Passar `isAdmin` e `employeeId` para o service |
| `src/pages/Timesheets.tsx` | Passar parâmetros de filtro para o hook |
| `src/pages/Projects.tsx` | Garantir que usa o hook atualizado |
| `src/hooks/usePortfolioProjects.ts` | Aplicar mesma lógica de filtro |

## Fluxo Final

```text
┌─────────────────────────────────────────────────────────────┐
│                    Usuário Acessa /timesheets               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │   Verifica perfil     │
          │   (isAdmin? / id?)    │
          └───────────┬───────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    ┌───────────┐           ┌───────────────────┐
    │  É Admin  │           │ É Gerente Projeto │
    └─────┬─────┘           └─────────┬─────────┘
          │                           │
          ▼                           ▼
    ┌───────────────┐         ┌──────────────────────┐
    │ Busca TODOS   │         │ Busca apenas projetos│
    │ os projetos   │         │ onde manager_id = id │
    └───────────────┘         └──────────────────────┘
```

## Considerações de Segurança

- O filtro é aplicado no frontend via queries ao Supabase
- As RLS policies existentes garantem que usuários só acessam dados do próprio tenant
- O campo `manager_id` é confiável pois vem da tabela de projetos protegida por RLS

## Impacto

| Funcionalidade | Impactada |
|----------------|-----------|
| Timesheets | Sim - verá apenas projetos que gerencia |
| Projetos | Sim - listagem filtrada |
| Portfolio | Sim - kanban filtrado |
| Detalhes do Projeto | Não - acesso direto via URL continua funcionando |
| Orçamentos | Não - lógica separada |
