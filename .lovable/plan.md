

# Plano: Liberar Acesso para Gerentes de Projeto

## Entendimento Atual

O sistema possui dois níveis de acesso verificados no frontend:

1. **isAdmin** - Verificado na tabela `user_roles` (role = 'admin')
2. **is_gerente** - Campo booleano na tabela `employees`

Atualmente, as seções de Gestão, Comercial e Operações estão configuradas como `requiresAdmin`, bloqueando o acesso para Gerentes de Projeto (`is_gerente = true`).

## Nova Estrutura de Permissões

| Seção | Admin | Gerente de Projeto | Usuário |
|-------|-------|-------------------|---------|
| Visão Geral | Sim | Sim | Sim |
| **Gestão** (Funcionários, Clientes, Fornecedores) | Sim | Sim | Não |
| **Comercial** (CRM, Orçamentos) | Sim | Sim | Não |
| **Operações** (Portfólio, Projetos, Timesheets, Analytics) | Sim | Sim | Não |
| **Configurações** (Tabela de Preços, Configurações) | Sim | Não | Não |

## Alterações Necessárias

### 1. Atualizar RoleProtectedRoute

**Arquivo:** `src/components/auth/RoleProtectedRoute.tsx`

Alterar a lógica para que `requireManager` seja suficiente para acessar as rotas de Gestão, Comercial e Operações:

```typescript
// Verificar se usuário precisa de acesso de admin (apenas Configurações)
if (requireAdmin && !employee.isAdmin) {
  return <Navigate to="/dashboard" replace />;
}

// Verificar se usuário precisa de acesso de gerente (Admin também pode)
if (requireManager && !employee.is_gerente && !employee.isAdmin) {
  return <Navigate to="/dashboard" replace />;
}
```

A lógica atual já está correta. O que precisa mudar é o uso do prop `requireManager` em vez de `requireAdmin` nas rotas apropriadas.

### 2. Atualizar Rotas no App.tsx

**Arquivo:** `src/App.tsx`

Trocar `requireAdmin` por `requireManager` nas rotas de Gestão, Comercial e Operações:

```text
ANTES:
┌────────────────────────────────────────────────────────────────────┐
│ /                    → requireAdmin    (Funcionários)             │
│ /clients             → requireAdmin    (Clientes)                 │
│ /suppliers           → requireAdmin    (Fornecedores)             │
│ /crm                 → requireAdmin    (CRM)                      │
│ /budgets/*           → requireAdmin    (Orçamentos)               │
│ /portfolio           → requireAdmin    (Portfólio)                │
│ /projects/*          → requireAdmin    (Projetos)                 │
│ /pricing             → requireAdmin    (Tabela de Preços)         │
│ /settings            → requireAdmin    (Configurações)            │
└────────────────────────────────────────────────────────────────────┘

DEPOIS:
┌────────────────────────────────────────────────────────────────────┐
│ /                    → requireManager  (Funcionários)             │
│ /clients             → requireManager  (Clientes)                 │
│ /suppliers           → requireManager  (Fornecedores)             │
│ /crm                 → requireManager  (CRM)                      │
│ /budgets/*           → requireManager  (Orçamentos)               │
│ /portfolio           → requireManager  (Portfólio)                │
│ /projects/*          → requireManager  (Projetos)                 │
│ /pricing             → requireAdmin    (MANTÉM - Configurações)   │
│ /settings            → requireAdmin    (MANTÉM - Configurações)   │
└────────────────────────────────────────────────────────────────────┘
```

### 3. Atualizar Navegação no Sidebar

**Arquivo:** `src/components/layout/AppSidebar.tsx`

Trocar `requiresAdmin` por `requiresManager` nos grupos e itens apropriados:

```typescript
const navigationGroups = [
  {
    label: 'Dashboard',
    items: [
      { title: 'Visão Geral', url: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestão',
    requiresManager: true,  // Era requiresAdmin
    items: [
      { title: 'Funcionários', url: '/', icon: Users, requiresManager: true },
      { title: 'Clientes', url: '/clients', icon: Building2, requiresManager: true },
      { title: 'Fornecedores', url: '/suppliers', icon: Truck, requiresManager: true },
    ],
  },
  {
    label: 'Comercial',
    requiresManager: true,  // Era requiresAdmin
    items: [
      { title: 'CRM', url: '/crm', icon: Kanban, requiresManager: true },
      { title: 'Orçamentos', url: '/budgets', icon: FileText, requiresManager: true },
    ],
  },
  {
    label: 'Operações',
    requiresManager: true,  // Era requiresAdmin
    items: [
      { title: 'Portfólio de Projetos', url: '/portfolio', icon: LayoutDashboard, requiresManager: true },
      { title: 'Projetos', url: '/projects', icon: FolderKanban, requiresManager: true },
      { title: 'Timesheets', url: '/timesheets', icon: Clock, disabled: true, requiresManager: true },
      { title: 'Analytics', url: '/analytics', icon: BarChart3, disabled: true, requiresManager: true },
    ],
  },
  {
    label: 'Configurações',
    requiresAdmin: true,  // MANTÉM requiresAdmin
    items: [
      { title: 'Tabela de Preços', url: '/pricing', icon: DollarSign, requiresAdmin: true },
      { title: 'Configurações', url: '/settings', icon: Settings, requiresAdmin: true },
    ],
  },
];
```

### 4. Atualizar Lógica de Filtragem no Sidebar

A lógica de filtragem de grupos também precisa considerar `requiresManager`:

```typescript
// Lógica atual - precisa adicionar verificação de requiresManager no nível de grupo
const shouldShowGroup = (group) => {
  if (group.requiresAdmin && !isAdmin) return false;
  if (group.requiresManager && !isManager && !isAdmin) return false;
  return true;
};
```

## Resumo de Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Trocar `requireAdmin` por `requireManager` nas rotas de Gestão, Comercial e Operações |
| `src/components/layout/AppSidebar.tsx` | Trocar `requiresAdmin` por `requiresManager` nos grupos e itens de Gestão, Comercial e Operações |

## Fluxo de Acesso Resultante

```text
┌─────────────────────────────────────────────────────────────────┐
│                    HIERARQUIA DE ACESSO                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ADMIN (isAdmin = true)                                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Acesso total a todas as funcionalidades                 │  │
│   │ + Configurações (Tabela de Preços, Settings)            │  │
│   └─────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│   GERENTE DE PROJETO (is_gerente = true)                       │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ ✓ Dashboard                                              │  │
│   │ ✓ Gestão (Funcionários, Clientes, Fornecedores)         │  │
│   │ ✓ Comercial (CRM, Orçamentos)                           │  │
│   │ ✓ Operações (Portfólio, Projetos, Timesheets, Analytics)│  │
│   │ ✗ Configurações (bloqueado)                              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│   USUÁRIO (is_gerente = false, isAdmin = false)                │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ ✓ Dashboard                                              │  │
│   │ ✗ Gestão, Comercial, Operações, Configurações           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Benefícios

1. **Gerentes autônomos** - Podem gerenciar projetos, clientes e equipe sem precisar de um admin
2. **Configurações protegidas** - Apenas admins alteram preços e configurações do sistema
3. **Consistência** - Lógica unificada entre rotas e navegação

