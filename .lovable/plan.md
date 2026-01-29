
# Plano: Novo Sistema de Status de Funcionarios

## Resumo

Implementar um novo sistema de status para funcionarios com quatro estados e acoes especificas para cada um:

| Status | Descricao | Acoes Disponiveis |
|--------|-----------|-------------------|
| `ativo` | Funcionario ja fez o primeiro login | Editar, Bloquear |
| `aguardando_confirmacao` | Recebeu convite mas ainda nao logou | Editar, Reenviar Convite, Bloquear |
| `bloqueado` | Admin bloqueou o acesso | Editar, Desbloquear, Arquivar |
| `arquivado` | Arquivado pelo admin | (nao aparece na listagem) |

---

## Alteracoes Necessarias

### 1. Atualizar Tipos (src/types/employee.ts)

Adicionar novo tipo de status:

```typescript
export type EmployeeStatus = 'ativo' | 'aguardando_confirmacao' | 'bloqueado' | 'arquivado';

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ativo: 'Ativo',
  aguardando_confirmacao: 'Aguardando',
  bloqueado: 'Bloqueado',
  arquivado: 'Arquivado',
};
```

### 2. Atualizar Hook useEmployees.ts

Adicionar novas mutations:

- `useBlockEmployee` - Bloquear funcionario (muda status para 'bloqueado')
- `useUnblockEmployee` - Desbloquear funcionario (volta status para 'ativo' ou 'aguardando_confirmacao')
- `useArchiveEmployee` - Arquivar funcionario (muda status para 'arquivado')
- `useResendInvite` - Reenviar email de convite

Modificar query `useEmployees`:
- Filtrar funcionarios com status `arquivado` (nao exibir na listagem)

### 3. Atualizar Service (src/services/employeeService.ts)

Adicionar novos metodos:

```typescript
async block(id: string): Promise<EmployeeDB>
async unblock(id: string): Promise<EmployeeDB>
async archive(id: string): Promise<EmployeeDB>
async resendInvite(id: string, loginUrl: string): Promise<void>
```

Remover ou manter `inactivate` para compatibilidade (sera substituido por `block`).

### 4. Criar Edge Function para Reenvio de Convite

Nova funcao `supabase/functions/resend-employee-invite/index.ts`:

- Valida que o usuario e admin do tenant
- Gera nova senha temporaria
- Atualiza o employee com nova temp_password
- Envia email de convite novamente

### 5. Atualizar Tabela de Funcionarios (EmployeesTable.tsx)

#### 5.1 Atualizar Badges de Status

```typescript
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ativo':
      return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
    case 'aguardando_confirmacao':
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
          <Clock className="h-3 w-3 mr-1" />
          Aguardando
        </Badge>
      );
    case 'bloqueado':
      return (
        <Badge variant="destructive">
          <Ban className="h-3 w-3 mr-1" />
          Bloqueado
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
```

#### 5.2 Atualizar Acoes do Dropdown

```typescript
// Status: ativo
- Editar
- Bloquear (vermelho)

// Status: aguardando_confirmacao
- Editar
- Reenviar Convite (azul)
- Bloquear (vermelho)

// Status: bloqueado
- Editar
- Desbloquear (verde)
- Arquivar (cinza/vermelho)
```

### 6. Atualizar Pagina Index.tsx

#### 6.1 Adicionar Novos Estados e Handlers

```typescript
const [blockDialogOpen, setBlockDialogOpen] = useState(false);
const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
const [resendingInvite, setResendingInvite] = useState(false);
```

#### 6.2 Adicionar Novos Dialogs de Confirmacao

- `BlockConfirmDialog` - Confirmar bloqueio
- `UnblockConfirmDialog` - Confirmar desbloqueio
- `ArchiveConfirmDialog` - Confirmar arquivamento com aviso

#### 6.3 Filtrar Funcionarios Arquivados

```typescript
const activeEmployees = useMemo(() => 
  employees.filter(e => e.status !== 'arquivado'),
  [employees]
);
```

### 7. Criar Novos Dialogs de Confirmacao

Criar arquivos em `src/components/employees/`:

- `BlockEmployeeDialog.tsx`
- `UnblockEmployeeDialog.tsx`
- `ArchiveEmployeeDialog.tsx`

### 8. Atualizar AuthContext.tsx

Modificar `signIn` para verificar se funcionario esta bloqueado:

```typescript
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({...});

  if (!error && data.user) {
    // Check if employee is blocked
    const { data: empData } = await supabase
      .from('employees')
      .select('status')
      .eq('auth_id', data.user.id)
      .single();

    if (empData?.status === 'bloqueado') {
      await supabase.auth.signOut();
      return { error: new Error('Sua conta foi bloqueada. Entre em contato com o administrador.') };
    }

    await activateEmployeeOnLogin(data.user.id);
  }

  return { error: error as Error | null };
};
```

---

## Fluxo de Status

```text
[Novo Funcionario Cadastrado]
        |
        v
  aguardando_confirmacao
        |
   [Primeiro Login]
        |
        v
      ativo  <----------+
        |               |
  [Admin Bloqueia]      |
        |               |
        v               |
    bloqueado           |
        |               |
   +----+----+          |
   |         |          |
[Desbloqueia]|          |
   |         |          |
   +---------+----------+
             |
       [Arquiva]
             |
             v
        arquivado
   (nao aparece na listagem)
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/employees/BlockEmployeeDialog.tsx` | Dialog de confirmacao de bloqueio |
| `src/components/employees/UnblockEmployeeDialog.tsx` | Dialog de confirmacao de desbloqueio |
| `src/components/employees/ArchiveEmployeeDialog.tsx` | Dialog de confirmacao de arquivamento |
| `supabase/functions/resend-employee-invite/index.ts` | Edge function para reenviar convite |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/employee.ts` | Adicionar tipo EmployeeStatus e labels |
| `src/services/employeeService.ts` | Adicionar metodos block, unblock, archive, resendInvite |
| `src/hooks/useEmployees.ts` | Adicionar novas mutations e filtrar arquivados |
| `src/components/employees/EmployeesTable.tsx` | Atualizar badges e acoes do menu |
| `src/pages/Index.tsx` | Integrar novos dialogs e handlers |
| `src/contexts/AuthContext.tsx` | Bloquear login de funcionarios bloqueados |
| `supabase/config.toml` | Adicionar nova edge function |

---

## Experiencia Visual

### Badges de Status

| Status | Cor | Icone |
|--------|-----|-------|
| Ativo | Verde | - |
| Aguardando | Amarelo/Amber | Clock |
| Bloqueado | Vermelho | Ban |

### Menu de Acoes

```text
+------------------------+
| Acoes                  |
|------------------------|
| Editar                 |  (sempre visivel)
|------------------------|
| Reenviar Convite       |  (apenas aguardando_confirmacao)
|------------------------|
| Bloquear               |  (ativo ou aguardando)
| Desbloquear            |  (apenas bloqueado)
| Arquivar               |  (apenas bloqueado)
+------------------------+
```

---

## Criterios de Aceite

1. Novos funcionarios iniciam com status `aguardando_confirmacao`
2. Apos primeiro login, status muda para `ativo`
3. Admin pode bloquear funcionarios ativos ou aguardando
4. Admin pode reenviar convite para funcionarios aguardando
5. Admin pode desbloquear funcionarios bloqueados
6. Admin pode arquivar funcionarios bloqueados
7. Funcionarios arquivados nao aparecem na listagem
8. Funcionarios bloqueados nao conseguem fazer login (exibe mensagem de erro)
9. Badges de status refletem visualmente cada estado
10. Menu de acoes mostra apenas acoes validas para cada status
