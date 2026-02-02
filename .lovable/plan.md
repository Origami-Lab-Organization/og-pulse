
# Plano: CRM Kanban Board

## Visao Geral

Criar uma nova secao CRM com um Kanban board de 3 colunas para gerenciar o funil comercial de orcamentos. Os orcamentos poderao ser arrastados entre colunas, atualizando automaticamente seu status.

## Estrutura das Colunas

| Coluna | Status no DB | Cor do Badge |
|--------|--------------|--------------|
| Proposta | `proposal` | Azul |
| Negociacao | `negotiation` | Amarelo/Laranja |
| Negocio Fechado | `active` | Verde |

## Alteracoes Necessarias

### 1. Migracao do Banco de Dados

Atualizar o enum `budget_status` para incluir os novos status e remover/ajustar os antigos:

```sql
-- Adicionar novos valores ao enum
ALTER TYPE budget_status ADD VALUE IF NOT EXISTS 'proposal';
ALTER TYPE budget_status ADD VALUE IF NOT EXISTS 'negotiation';
ALTER TYPE budget_status ADD VALUE IF NOT EXISTS 'active';

-- Migrar dados existentes
UPDATE budgets SET status = 'proposal' WHERE status = 'draft';
UPDATE budgets SET status = 'proposal' WHERE status = 'sent';
UPDATE budgets SET status = 'active' WHERE status = 'approved';

-- O status default muda de 'draft' para 'proposal'
ALTER TABLE budgets ALTER COLUMN status SET DEFAULT 'proposal';
```

**Nota:** Os status antigos (draft, sent, approved, rejected, expired) serao mantidos no enum por compatibilidade, mas nao serao mais utilizados na interface.

### 2. Atualizar Tipos TypeScript

**Arquivo:** `src/types/budget.ts`

```typescript
// Status CRM do funil comercial
export type BudgetStatus = 'proposal' | 'negotiation' | 'active' | 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

// Colunas do Kanban CRM
export const CRM_COLUMNS = [
  { id: 'proposal', label: 'Proposta', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'negotiation', label: 'Negociação', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'active', label: 'Negócio Fechado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
] as const;

export const BUDGET_STATUS_OPTIONS = [
  { value: 'proposal', label: 'Proposta', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'negotiation', label: 'Negociação', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  // Status legados (para compatibilidade)
  { value: 'draft', label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  { value: 'sent', label: 'Enviado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'approved', label: 'Aprovado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'rejected', label: 'Rejeitado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'expired', label: 'Expirado', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
] as const;
```

### 3. Instalar Biblioteca de Drag and Drop

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

A biblioteca `@dnd-kit` e moderna, leve e bem mantida para React.

### 4. Criar Componentes do Kanban

**Novos arquivos:**

| Arquivo | Descricao |
|---------|-----------|
| `src/components/crm/KanbanBoard.tsx` | Container principal com DndContext |
| `src/components/crm/KanbanColumn.tsx` | Coluna do Kanban (droppable) |
| `src/components/crm/KanbanCard.tsx` | Card de orcamento (draggable) |

**Estrutura do KanbanBoard:**

```
+------------------+------------------+------------------+
|     PROPOSTA     |   NEGOCIACAO     | NEGOCIO FECHADO  |
|   (proposal)     |  (negotiation)   |    (active)      |
+------------------+------------------+------------------+
|  [Card ORC-001]  |  [Card ORC-003]  |  [Card ORC-005]  |
|  [Card ORC-002]  |  [Card ORC-004]  |                  |
|                  |                  |                  |
+------------------+------------------+------------------+
```

**Informacoes exibidas no Card:**
- Numero do orcamento (ex: ORC-2026-0001)
- Titulo
- Cliente/Lead
- Valor final
- Data de validade (se houver)

### 5. Criar Pagina CRM

**Arquivo:** `src/pages/CRM.tsx`

- Titulo: "CRM"
- Descricao: "Funil de vendas"
- Conteudo: KanbanBoard com os orcamentos
- Busca: Campo de busca para filtrar cards
- Acao: Botao "Novo Orcamento" que redireciona para `/budgets/new`

### 6. Atualizar Navegacao

**Arquivo:** `src/components/layout/AppSidebar.tsx`

Adicionar item CRM na secao Comercial:

```typescript
{
  label: 'Comercial',
  requiresAdmin: true,
  items: [
    { title: 'CRM', url: '/crm', icon: Kanban, requiresAdmin: true },
    { title: 'Orçamentos', url: '/budgets', icon: FileText, requiresAdmin: true },
  ] as NavItem[],
},
```

### 7. Adicionar Rota

**Arquivo:** `src/App.tsx`

```tsx
<Route 
  path="/crm" 
  element={
    <RoleProtectedRoute requireAdmin>
      <CRM />
    </RoleProtectedRoute>
  } 
/>
```

### 8. Logica de Edicao Bloqueada

**Arquivos a modificar:**
- `src/pages/BudgetDetail.tsx` - Esconder botao Editar se status = 'active'
- `src/pages/BudgetForm.tsx` - Redirecionar se tentar editar orcamento ativo

```tsx
// BudgetDetail.tsx
{budget.status !== 'active' && (
  <Button onClick={() => navigate(`/budgets/${id}/edit`)}>
    <Edit className="mr-2 h-4 w-4" />
    Editar
  </Button>
)}

// Se ativo, mostrar aviso
{budget.status === 'active' && (
  <Badge variant="secondary" className="text-sm">
    Orçamento fechado - não pode ser editado
  </Badge>
)}
```

### 9. Atualizar Servico de Orcamentos

**Arquivo:** `src/services/budgetService.ts`

O metodo `create` ja usa status default do banco, que sera atualizado para 'proposal'.

## Fluxo do Usuario

```
1. Usuario clica em "Novo Orcamento"
2. Cria o orcamento (status = 'proposal')
3. Card aparece na coluna "Proposta"
4. Usuario arrasta para "Negociacao" -> status atualiza
5. Usuario arrasta para "Negocio Fechado" -> status = 'active'
6. Orcamento ativo nao pode mais ser editado
```

## Arquivos a Criar

| Arquivo | Tipo |
|---------|------|
| `src/pages/CRM.tsx` | Pagina |
| `src/components/crm/KanbanBoard.tsx` | Componente |
| `src/components/crm/KanbanColumn.tsx` | Componente |
| `src/components/crm/KanbanCard.tsx` | Componente |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/budget.ts` | Adicionar novos status e CRM_COLUMNS |
| `src/components/layout/AppSidebar.tsx` | Adicionar item CRM |
| `src/App.tsx` | Adicionar rota /crm |
| `src/pages/BudgetDetail.tsx` | Bloquear edicao se ativo |
| `src/pages/BudgetForm.tsx` | Redirecionar se tentar editar ativo |

## Migracao de Banco de Dados

Uma migracao SQL sera necessaria para:
1. Adicionar novos valores ao enum `budget_status`
2. Migrar orcamentos existentes para os novos status
3. Atualizar o default de 'draft' para 'proposal'

## Resultado Esperado

- Nova pagina CRM acessivel via sidebar
- Kanban com 3 colunas e drag-and-drop funcional
- Orcamentos criados com status "Proposta"
- Mudanca de status ao arrastar entre colunas
- Orcamentos ativos (Negocio Fechado) nao podem ser editados
