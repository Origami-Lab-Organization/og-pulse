

# Corrigir permissao de gerentes para editar timesheets

## Problema identificado

A politica RLS da tabela `timesheet_edit_logs` esta restrita **somente a administradores**. A politica se chama "Only admins can insert edit logs" e usa `has_role(auth.uid(), p.tenant_id, 'admin')`, que exclui gerentes de projeto.

Quando um gerente tenta salvar alteracoes em timesheets (especialmente em semanas ja enviadas, via o dialog de edicao), o sistema tenta inserir um registro no log de edicao (`timesheet_edit_logs`) e essa insercao falha por falta de permissao, gerando o toast vermelho de erro.

## Solucao

Alterar a politica RLS de INSERT na tabela `timesheet_edit_logs` para permitir **administradores e gerentes**, usando a funcao `is_admin_or_manager` que ja existe no sistema.

## Detalhes tecnicos

### Migracao SQL

Dropar a politica existente e criar uma nova:

```sql
DROP POLICY "Only admins can insert edit logs" ON public.timesheet_edit_logs;

CREATE POLICY "Admins and managers can insert edit logs"
ON public.timesheet_edit_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_timesheets pt
    JOIN project_members pm ON pt.project_member_id = pm.id
    JOIN projects p ON pm.project_id = p.id
    WHERE pt.id = timesheet_edit_logs.timesheet_id
    AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);
```

### Impacto

- Gerentes poderao editar timesheets de semanas enviadas (com justificativa)
- O fluxo de edicao regular (semanas nao enviadas) nao e afetado, pois nao usa a tabela de logs
- Nenhuma alteracao de codigo frontend necessaria

| Arquivo | Descricao |
|---------|-----------|
| Nova migracao SQL | Alterar politica RLS de `timesheet_edit_logs` para incluir gerentes |

