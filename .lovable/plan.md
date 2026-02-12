
# Permitir Gerentes de Projeto Editarem Timesheets Enviados

## Resumo

Atualmente, apenas administradores podem editar timesheets de semanas ja enviadas. A mudanca consiste em estender essa permissao para gerentes de projeto (`is_gerente`), mantendo a mesma exigencia de justificativa obrigatoria.

## Mudancas

### 1. Botao de editar visivel para gerentes

**Arquivo: `src/components/timesheets/TimesheetByProject.tsx`**

Alterar a condicao do botao de edicao de `isAdmin` para uma nova prop `canEdit` (que sera `true` para admins e gerentes).

- Linha 106: trocar `{isAdmin && onAdminEditProject && (` por `{canEdit && onAdminEditProject && (`
- Adicionar prop `canEdit` na interface

### 2. Passar `canEdit` para o componente

**Arquivo: `src/pages/Timesheets.tsx`**

Passar `canEdit={canSubmit}` (que ja e `employee?.is_gerente || isAdmin`) para `TimesheetByProject`, permitindo que gerentes vejam e usem o botao de edicao.

## Arquivos Modificados

| Arquivo | Descricao |
|---------|-----------|
| `src/components/timesheets/TimesheetByProject.tsx` | Adicionar prop `canEdit`, usar no lugar de `isAdmin` para exibir botao de edicao |
| `src/pages/Timesheets.tsx` | Passar `canEdit={canSubmit}` ao componente |

## Detalhes Tecnicos

A logica de edicao (dialog, salvamento com justificativa, logs) ja esta toda implementada no `AdminWeekEditDialog` e no hook `useAdminBatchEditTimesheets`. A unica barreira e a condicao de exibicao do botao no frontend. As RLS policies do banco ja permitem que gerentes facam update em `project_timesheets` (via `is_admin_or_manager`), entao nenhuma mudanca no backend e necessaria.
