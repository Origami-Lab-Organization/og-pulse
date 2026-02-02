

# Plano: Corrigir Constraint de Status de Funcionarios

## Problema Identificado

O banco de dados possui uma constraint `employees_status_check` que limita os valores de status a apenas:
- `ativo`
- `inativo` 
- `aguardando_confirmacao`

Porem, o codigo da aplicacao tenta usar os status:
- `bloqueado` (para bloquear funcionarios)
- `arquivado` (para arquivar funcionarios)

Isso causa erro ao tentar bloquear qualquer funcionario, incluindo aqueles com status "aguardando".

## Solucao

Criar uma nova migracao que atualize a constraint para incluir todos os status validos:

```sql
-- Atualizar constraint de status para incluir bloqueado e arquivado
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_status_check 
  CHECK (status IN ('ativo', 'inativo', 'aguardando_confirmacao', 'bloqueado', 'arquivado'));
```

## Impacto

| Status | Antes | Depois |
|--------|-------|--------|
| ativo | Permitido | Permitido |
| inativo | Permitido | Permitido |
| aguardando_confirmacao | Permitido | Permitido |
| bloqueado | BLOQUEADO | Permitido |
| arquivado | BLOQUEADO | Permitido |

## Arquivo a Modificar

Sera necessario criar uma nova migracao SQL para atualizar a constraint.

## Bonus: Permitir Arquivamento de Funcionarios Aguardando

Conforme solicitado anteriormente, alem de corrigir a constraint, tambem sera atualizado o `EmployeesTable.tsx` para permitir o arquivamento de funcionarios com status "aguardando_confirmacao" (linha 235):

```tsx
// Antes:
{isBlocked && (
  <DropdownMenuItem onClick={() => onArchive(employee)} ...>

// Depois:
{(isBlocked || isAwaiting) && (
  <DropdownMenuItem onClick={() => onArchive(employee)} ...>
```

## Alteracoes Necessarias

| Tipo | Arquivo/Acao | Descricao |
|------|--------------|-----------|
| Migracao SQL | Nova migracao | Atualizar constraint `employees_status_check` |
| Codigo | `src/components/employees/EmployeesTable.tsx` | Permitir arquivamento de status "aguardando" |

## Validacao

1. Bloquear funcionario com status "aguardando" - deve funcionar sem erro
2. Bloquear funcionario com status "ativo" - deve funcionar sem erro
3. Arquivar funcionario com status "bloqueado" - deve funcionar
4. Arquivar funcionario com status "aguardando" - deve funcionar (nova funcionalidade)

