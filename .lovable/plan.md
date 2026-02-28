

# Corrigir Status de Semana Enviada e Erro de FK

## Problema 1: "Rascunho" aparece mesmo apos envio
A logica atual verifica se existem entradas no banco (`memberEntries.length > 0`) e se todas estao travadas. Projetos sem horas lancadas (como "Lei do Bem") nao tem entradas, entao sempre mostram "Rascunho".

**Solucao**: Usar a tabela `project_timesheet_submissions` (ja carregada via `useProjectWeekSubmissions`) como fonte de verdade para o status. Se o submission do projeto para aquela semana tem `status === 'submitted'`, mostrar "Enviado" independentemente de ter entradas ou nao.

## Problema 2: Erro de FK ao criar entradas com 0 horas
O campo `created_by` na tabela `project_timesheets` tem FK para `employees(id)`, mas o codigo insere `user.id` (que e o `auth.uid()`, UUID do auth, nao o ID do employee). Isso causa o erro de foreign key.

**Solucao**: No hook `useSubmitAllProjects`, ao criar entradas de 0 horas para dias faltantes, nao preencher `created_by` (deixar null) ou buscar o `employee.id` correto. A opcao mais simples e remover o `created_by` do insert, ja que o campo aceita null.

## Detalhes Tecnicos

### Arquivo: `src/pages/MyTimesheet.tsx`

1. **Status por projeto (linhas 169-180)**: Usar `submissions.get(project.projectId)` para determinar o status. Se `submission?.status === 'submitted'`, mostrar badge "Enviado" e travar a linha.

2. **allProjectsLocked (linhas 80-89)**: Ajustar para considerar submissions: um projeto esta "locked" se tem submission com status `submitted` OU se todas as entradas estao locked.

3. **Botao Enviar (linha 208)**: Desabilitar quando todos os projetos ja tem submission `submitted`.

### Arquivo: `src/hooks/useTimesheetSubmissions.ts`

1. **useSubmitAllProjects**: Remover `created_by: user.id` dos inserts de entradas de 0 horas (linhas ~275-281), pois `created_by` tem FK para `employees(id)` e `user.id` e um auth UUID.

