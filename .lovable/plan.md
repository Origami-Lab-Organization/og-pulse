

# Plano: Reorganizar Menu Lateral com Nova Seção Comercial

## Resumo

Reorganizar a navegação do menu lateral para:
1. Criar uma nova seção "Comercial" contendo "Orçamentos"
2. Mover "Projetos" da seção "Gestão" para a seção "Operações" (acima de Timesheets)

---

## Estrutura Atual do Menu

```text
Dashboard
  └─ Visão Geral

Gestão
  ├─ Funcionários
  ├─ Clientes
  └─ Projetos          <-- será movido

Operações
  ├─ Timesheets
  ├─ Orçamentos        <-- será movido
  └─ Analytics

Configurações
  ├─ Tabela de Preços
  └─ Configurações
```

---

## Nova Estrutura Proposta

```text
Dashboard
  └─ Visão Geral

Gestão
  ├─ Funcionários
  └─ Clientes

Comercial              <-- nova seção
  └─ Orçamentos

Operações
  ├─ Projetos          <-- movido para cá
  ├─ Timesheets
  └─ Analytics

Configurações
  ├─ Tabela de Preços
  └─ Configurações
```

---

## Alterações Necessárias

### Arquivo: `src/components/layout/AppSidebar.tsx`

Atualizar o array `navigationGroups` com a nova organização:

| Seção | Alteração |
|-------|-----------|
| Gestão | Remover "Projetos" |
| Comercial | Nova seção com "Orçamentos" |
| Operações | Adicionar "Projetos" no início, remover "Orçamentos" |

---

## Detalhes Técnicos

A estrutura do `navigationGroups` será atualizada para:

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
    requiresAdmin: true,
    items: [
      { title: 'Funcionários', url: '/', icon: Users, requiresAdmin: true },
      { title: 'Clientes', url: '/clients', icon: Building2, requiresAdmin: true },
    ],
  },
  {
    label: 'Comercial',
    requiresAdmin: true,
    items: [
      { title: 'Orçamentos', url: '/budgets', icon: FileText, requiresAdmin: true },
    ],
  },
  {
    label: 'Operações',
    requiresAdmin: true,
    items: [
      { title: 'Projetos', url: '/projects', icon: FolderKanban, requiresAdmin: true },
      { title: 'Timesheets', url: '/timesheets', icon: Clock, disabled: true, requiresAdmin: true },
      { title: 'Analytics', url: '/analytics', icon: BarChart3, disabled: true, requiresAdmin: true },
    ],
  },
  {
    label: 'Configurações',
    requiresAdmin: true,
    items: [
      { title: 'Tabela de Preços', url: '/pricing', icon: DollarSign, requiresAdmin: true },
      { title: 'Configurações', url: '/settings', icon: Settings, requiresAdmin: true },
    ],
  },
];
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/AppSidebar.tsx` | Reorganizar `navigationGroups` conforme nova estrutura |

---

## Critérios de Aceite

1. Nova seção "Comercial" aparece no menu lateral
2. "Orçamentos" está dentro da seção "Comercial"
3. "Projetos" aparece na seção "Operações" acima de "Timesheets"
4. A seção "Gestão" contém apenas "Funcionários" e "Clientes"
5. Todas as permissões de acesso (requiresAdmin) são mantidas
6. A navegação funciona corretamente para todos os itens

