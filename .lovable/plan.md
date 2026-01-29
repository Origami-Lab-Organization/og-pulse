

# Plano: Ciclo de Vida de Papeis com Status (Ativo/Inativo/Arquivado)

## Objetivo

Implementar um sistema de gerenciamento de status para papéis que:
- Remove o controle de status do formulário de criação (sempre ativo)
- Adiciona fluxo de ciclo de vida: Ativo -> Inativo -> Arquivado
- Preserva a integridade dos valores em orçamentos existentes

---

## Fluxo de Ciclo de Vida

```text
+--------+     Inativar     +----------+     Arquivar     +------------+
| ATIVO  | --------------> | INATIVO  | ---------------> | ARQUIVADO  |
+--------+                 +----------+                  +------------+
    ^                           |
    |         Reativar          |
    +---------------------------+
```

| Status | Descrição | Visível em Orçamentos | Pode Editar | Pode Excluir |
|--------|-----------|----------------------|-------------|--------------|
| Ativo | Papel disponível para uso | Sim | Sim | Sim |
| Inativo | Temporariamente indisponível | Não | Sim | Sim |
| Arquivado | Preservado para histórico | Não | Não | Não |

---

## Alterações Necessárias

### 1. Migração do Banco de Dados

Adicionar coluna `status` para substituir `is_active`:

```sql
-- Adicionar nova coluna status
ALTER TABLE role_rates 
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Migrar dados existentes
UPDATE role_rates SET status = 'active' WHERE is_active = true;
UPDATE role_rates SET status = 'inactive' WHERE is_active = false;

-- Remover coluna antiga (opcional, pode manter por compatibilidade)
-- ALTER TABLE role_rates DROP COLUMN is_active;
```

---

### 2. Atualizar Tipos (`src/types/roleRate.ts`)

```typescript
export type RoleRateStatus = 'active' | 'inactive' | 'archived';

export const ROLE_RATE_STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'archived', label: 'Arquivado' },
];

export interface RoleRateDB {
  // ... campos existentes
  status: RoleRateStatus;  // substitui is_active
}
```

---

### 3. Atualizar Formulário (`src/components/pricing/RoleRateFormDialog.tsx`)

**Remover:**
- Campo `isActive` do schema
- Switch de "Ativo" do formulário
- Props relacionadas a isActive

**Resultado:** Formulário apenas com Nome do Papel + Senioridades/Valores

---

### 4. Atualizar Tabela (`src/components/pricing/RoleRatesTable.tsx`)

**Coluna Status:**
- Badge com cores diferenciadas por status
- Verde para Ativo, Amarelo para Inativo, Cinza para Arquivado

**Menu de Ações:**
```text
Se Ativo:
  - Editar
  - Inativar
  - Excluir

Se Inativo:
  - Editar
  - Reativar
  - Arquivar
  - Excluir

Se Arquivado:
  - (nenhuma ação disponível - apenas visualização)
```

---

### 5. Atualizar Service (`src/services/roleRateService.ts`)

```typescript
// Novo método para alterar status
async setStatus(id: string, status: RoleRateStatus): Promise<RoleRateDB> {
  const { data, error } = await supabase
    .from('role_rates')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as RoleRateDB;
}

// Atualizar getActive para filtrar por status
async getActive(tenantId: string): Promise<RoleRateDB[]> {
  const { data, error } = await supabase
    .from('role_rates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')  // mudou de is_active = true
    .order('role_name', { ascending: true });
  // ...
}
```

---

### 6. Atualizar Hooks (`src/hooks/useRoleRates.ts`)

```typescript
// Renomear/substituir useToggleRoleRateActive
export function useSetRoleRateStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RoleRateStatus }) =>
      roleRateService.setStatus(id, status),
    onSuccess: (data: RoleRateDB) => {
      queryClient.invalidateQueries({ queryKey: ['role-rates'] });
      const messages = {
        active: 'Papel reativado!',
        inactive: 'Papel inativado!',
        archived: 'Papel arquivado!',
      };
      toast({ title: 'Sucesso', description: messages[data.status] });
    },
  });
}
```

---

### 7. Atualizar Página (`src/pages/Pricing.tsx`)

**Filtros:**
- Adicionar opção "Arquivados" no select de status

**Cards de Estatísticas:**
- Total de Papéis
- Ativos
- Inativos
- Arquivados

**Handlers:**
```typescript
const handleInactivate = (roleRate: RoleRateDB) => {
  setStatusMutation.mutate({ id: roleRate.id, status: 'inactive' });
};

const handleReactivate = (roleRate: RoleRateDB) => {
  setStatusMutation.mutate({ id: roleRate.id, status: 'active' });
};

const handleArchive = (roleRate: RoleRateDB) => {
  setStatusMutation.mutate({ id: roleRate.id, status: 'archived' });
};
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Adicionar coluna `status` e migrar dados |
| `src/types/roleRate.ts` | Adicionar tipo `RoleRateStatus` e constantes |
| `src/components/pricing/RoleRateFormDialog.tsx` | Remover switch de ativo |
| `src/components/pricing/RoleRatesTable.tsx` | Atualizar menu de ações por status |
| `src/services/roleRateService.ts` | Adicionar `setStatus`, atualizar queries |
| `src/hooks/useRoleRates.ts` | Substituir toggle por `useSetRoleRateStatus` |
| `src/pages/Pricing.tsx` | Atualizar filtros e estatísticas |

---

## Critérios de Aceite

1. Novo papel é criado sempre com status "Ativo"
2. Formulário de criação não exibe opção de status
3. Menu de ações exibe opções conforme status atual
4. Papel ativo pode ser inativado ou excluído
5. Papel inativo pode ser reativado, arquivado ou excluído
6. Papel arquivado não pode ser editado, reativado ou excluído
7. Filtro de status inclui opção "Arquivados"
8. Estatísticas exibem contagem por status

