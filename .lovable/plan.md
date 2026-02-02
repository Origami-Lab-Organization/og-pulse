
# Plano: Sistema de Perfis de Funcionarios (Admin, Gerente de Projetos, Usuario)

## Contexto Atual

### Como Funciona Hoje
1. O campo `isGerente` (boolean) na tabela `employees` indica se o funcionario e administrador
2. No formulario de cadastro, existe um Switch "Administrador?" que define esse campo
3. A tabela `user_roles` ja possui o enum `app_role` com 3 valores: `admin`, `user`, `manager`
4. Na criacao do funcionario, o edge function `create-employee-user` atribui:
   - `role: 'admin'` se `isGerente = true`
   - `role: 'user'` se `isGerente = false`
5. A selecao de gerentes de projeto filtra por `isGerente = true` OU cargo contendo "gerente"

### Problemas Identificados
1. O campo `isGerente` confunde "gerente de projetos" com "administrador do sistema"
2. Nao existe distincao clara entre os 3 niveis de perfil
3. O role `manager` no banco nao e utilizado
4. A logica de filtro de gerentes e imprecisa (depende do nome do cargo)

---

## Solucao Proposta

### Novo Campo: `system_role`

Substituir o boolean `isGerente` por um campo de texto com 3 valores possiveis:

| Perfil | Valor | Descricao |
|--------|-------|-----------|
| Administrador | `admin` | Acesso total ao sistema, gerencia usuarios e configuracoes |
| Gerente de Projetos | `manager` | Pode gerenciar projetos, nao tem acesso a configuracoes |
| Usuario | `user` | Acesso basico, apenas visualizacao e funcoes limitadas |

### UX do Formulario

Substituir o Switch por um Select com as 3 opcoes:

```text
Perfil no Sistema *
┌─────────────────────────────────────────┐
│ Selecione o perfil               ▼      │
├─────────────────────────────────────────┤
│ ○ Administrador                         │
│     Acesso total ao sistema             │
│ ○ Gerente de Projetos                   │
│     Pode gerenciar projetos             │
│ ● Usuario                               │
│     Acesso basico (padrao)              │
└─────────────────────────────────────────┘
```

---

## Alteracoes Tecnicas

### 1. Banco de Dados

**Adicionar coluna `system_role` na tabela `employees`:**
- Tipo: `text`
- Valores permitidos: `'admin'`, `'manager'`, `'user'`
- Default: `'user'`
- Manter `is_gerente` temporariamente para retrocompatibilidade

**Migracao de dados existentes:**
```sql
-- Migrar dados existentes
UPDATE employees SET system_role = 
  CASE WHEN is_gerente = true THEN 'admin' ELSE 'user' END
WHERE system_role IS NULL;
```

### 2. Edge Function `create-employee-user/index.ts`

| Antes | Depois |
|-------|--------|
| `isGerente: boolean` | `systemRole: 'admin' \| 'manager' \| 'user'` |
| `role: isGerente ? 'admin' : 'user'` | `role: systemRole` |

### 3. Formulario de Funcionarios

**Arquivo: `src/components/employees/EmployeeFormDialog.tsx`**

| Antes | Depois |
|-------|--------|
| Campo `isGerente` (Switch boolean) | Campo `systemRole` (Select com 3 opcoes) |
| Default: `false` | Default: `'user'` |

### 4. Tipos e Interfaces

**Arquivo: `src/types/employee.ts`**
```typescript
export type SystemRole = 'admin' | 'manager' | 'user';

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente de Projetos',
  user: 'Usuario',
};
```

### 5. Servico de Funcionarios

**Arquivo: `src/services/employeeService.ts`**
- Adicionar campo `systemRole` no `CreateEmployeeInput`
- Mapear `system_role` do banco para `systemRole` no frontend

### 6. Hooks de Funcionarios

**Arquivo: `src/hooks/useEmployees.ts`**
- Adicionar `systemRole` no mapeamento `dbToEmployee()`
- Criar hook `useProjectManagers()` para filtrar apenas funcionarios com `systemRole = 'manager'`

### 7. Selecao de Gerentes de Projeto

**Arquivos afetados:**
- `src/components/projects/ProjectFormDialog.tsx`
- `src/components/crm/CloseBusinessDialog.tsx`

| Antes | Depois |
|-------|--------|
| `filter(e => e.isGerente \|\| e.cargo.includes('gerente'))` | `filter(e => e.systemRole === 'manager')` |

### 8. Contexto de Autenticacao

**Arquivo: `src/contexts/AuthContext.tsx`**
- Buscar `system_role` junto com dados do funcionario
- Manter verificacao de `isAdmin` baseada em `user_roles.role = 'admin'`

---

## Fluxo de Dados

```text
┌─────────────────────────────────────────────────────────────┐
│                    Formulario de Funcionario                │
│                                                             │
│  Perfil no Sistema: [Gerente de Projetos ▼]                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Edge Function: create-employee-user            │
│                                                             │
│  1. Cria registro em employees com system_role = 'manager'  │
│  2. Cria registro em user_roles com role = 'manager'        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Selecao de Gerente de Projeto              │
│                                                             │
│  Mostra apenas: employees WHERE system_role = 'manager'     │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `migration_add_system_role.sql` | Criar | Adicionar coluna e migrar dados |
| `src/types/employee.ts` | Modificar | Adicionar `SystemRole` type e labels |
| `src/services/employeeService.ts` | Modificar | Adicionar `systemRole` no input e mapeamento |
| `src/hooks/useEmployees.ts` | Modificar | Mapear `systemRole`, criar `useProjectManagers` |
| `src/components/employees/EmployeeFormDialog.tsx` | Modificar | Substituir Switch por Select |
| `src/components/projects/ProjectFormDialog.tsx` | Modificar | Usar `useProjectManagers()` |
| `src/components/crm/CloseBusinessDialog.tsx` | Modificar | Usar `useProjectManagers()` |
| `supabase/functions/create-employee-user/index.ts` | Modificar | Aceitar `systemRole` e usar no role |
| `src/contexts/AuthContext.tsx` | Modificar | Buscar e expor `systemRole` |

---

## Compatibilidade

### Funcionarios Existentes
- Os funcionarios atuais serao migrados automaticamente:
  - `is_gerente = true` -> `system_role = 'admin'`
  - `is_gerente = false` -> `system_role = 'user'`
- Nenhum funcionario existente tera perfil `manager` (precisa ser atribuido manualmente)

### Admin do Tenant
- O admin que criou o tenant continuara sendo admin
- Novos funcionarios terao default `user` conforme solicitado

### RLS Policies
- As policies existentes usam `has_role()` e `is_admin_or_manager()` que ja consultam `user_roles`
- A nova coluna `system_role` sera sincronizada com `user_roles.role`

