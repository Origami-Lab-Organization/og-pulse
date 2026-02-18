
# Liberar Timesheet para Funcionarios no "Meu Espaco"

## Resumo

Permitir que todos os funcionarios (independente do perfil) acessem uma pagina de timesheet pessoal na secao "Meu Espaco" do sidebar, onde poderao lancar horas nos projetos em que estao alocados. Apenas seus proprios projetos e linhas serao visiveis.

## Mudancas necessarias

### 1. Migracao SQL - Novas politicas RLS

Adicionar politicas para permitir que funcionarios insiram e atualizem **seus proprios** registros de timesheet (onde o `project_member_id` referencia um `project_member` vinculado ao seu `employee_id`).

```sql
-- Permitir que funcionarios insiram timesheets dos seus proprios memberships
CREATE POLICY "Employees can insert own timesheets"
ON public.project_timesheets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_members pm
    JOIN employees e ON e.id = pm.employee_id
    WHERE pm.id = project_timesheets.project_member_id
    AND e.auth_id = auth.uid()
  )
);

-- Permitir que funcionarios atualizem timesheets dos seus proprios memberships (apenas nao travados)
CREATE POLICY "Employees can update own timesheets"
ON public.project_timesheets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM project_members pm
    JOIN employees e ON e.id = pm.employee_id
    WHERE pm.id = project_timesheets.project_member_id
    AND e.auth_id = auth.uid()
  )
  AND is_locked = false
);
```

### 2. Nova pagina - `src/pages/MyTimesheet.tsx`

Criar uma pagina simplificada de timesheet pessoal que:
- Busca apenas os projetos onde o funcionario logado esta alocado como membro (`project_members.employee_id = employee.id`)
- Mostra a visao "por projeto" com apenas a linha do proprio funcionario (sem ver colegas)
- Usa o mesmo `TimesheetWeekSelector` para navegar entre semanas
- Usa o mesmo `TimesheetWeekRow` para editar horas
- Respeita feriados e trava de semanas enviadas (read-only quando `is_locked` ou submission `submitted`)
- Nao exibe botoes de "Enviar" ou "Editar Admin" (funcionarios apenas lancam, nao submetem)

### 3. Hook de dados - `src/hooks/useMyTimesheetData.ts`

Criar um hook dedicado para buscar:
- Projetos ativos onde o funcionario logado e membro (`project_members` com `employee_id` do usuario)
- Retorna apenas o membership do proprio funcionario (sem expor dados de colegas)

```typescript
export const useMyProjectMemberships = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['my-project-memberships', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          role,
          project_id,
          projects!inner (
            id, name, status, portfolio_stage,
            clients!inner (id, company_name)
          )
        `)
        .eq('employee_id', employeeId)
        .neq('projects.portfolio_stage', 'completed');
      // mapear para formato compativel com TimesheetWeekRow
    },
    enabled: !!employeeId,
  });
};
```

### 4. Sidebar - `src/components/layout/AppSidebar.tsx`

Adicionar "Minha Timesheet" na secao "Meu Espaco" (sem `requiresManager`):

```typescript
{
  label: 'Meu Espaco',
  items: [
    { title: 'Minha Timesheet', url: '/my-timesheet', icon: Clock },
    { title: 'Reembolsos', url: '/reimbursements', icon: Receipt },
  ] as NavItem[],
},
```

### 5. Rota - `src/App.tsx`

Adicionar rota protegida (sem `requireManager`):

```tsx
<Route
  path="/my-timesheet"
  element={
    <ProtectedRoute>
      <MyTimesheet />
    </ProtectedRoute>
  }
/>
```

## Seguranca

- Funcionarios so podem inserir/atualizar timesheets vinculados ao seu proprio `project_member_id`
- Timesheets travados (`is_locked = true`) nao podem ser alterados por funcionarios
- A submissao de semanas continua restrita a gerentes e admins
- A pagina de Timesheets completa (com visao de todos os funcionarios) continua restrita a gerentes/admins

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar 2 novas politicas RLS |
| `src/hooks/useMyTimesheetData.ts` | Criar hook para dados do proprio funcionario |
| `src/pages/MyTimesheet.tsx` | Criar pagina de timesheet pessoal |
| `src/components/layout/AppSidebar.tsx` | Adicionar link "Minha Timesheet" |
| `src/App.tsx` | Adicionar rota `/my-timesheet` |
