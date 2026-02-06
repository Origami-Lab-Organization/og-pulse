
# Plano: Trava de Timesheets por Projeto (em vez de Global) - ✅ IMPLEMENTADO

## Resumo da Implementação

A trava de edição de timesheets agora opera em nível de **projeto** em vez de global por semana. Isso permite que gerentes lancem horas em semanas passadas para projetos específicos que ainda não foram submetidos, mesmo que outros projetos da mesma semana já estejam travados.

## Mudanças Realizadas

### 1. Banco de Dados
- ✅ Criada tabela `project_timesheet_submissions` com chave única `(project_id, week_start)`
- ✅ RLS policies configuradas para segurança

### 2. Tipos TypeScript
- ✅ Adicionada interface `ProjectTimesheetSubmission`
- ✅ Adicionada interface `SubmitProjectWeekInput`

### 3. Hooks
- ✅ `useProjectWeekSubmissions(weekStart, projectIds[])` - Busca status de submissão para múltiplos projetos
- ✅ `useSubmitProjectWeek()` - Submete uma semana específica de um projeto
- ✅ `useSubmitAllProjects()` - Submete todos os projetos pendentes de uma vez

### 4. Componentes Atualizados
- ✅ `TimesheetByProject.tsx` - Status individual por card com botão "Enviar" por projeto
- ✅ `TimesheetByEmployee.tsx` - Mostra badge de status por projeto
- ✅ `TimesheetWeekStatus.tsx` - Resumo "X de Y projetos enviados" com botão "Enviar Todos"
- ✅ `SubmitWeekDialog.tsx` - Novos dialogs para projeto individual e todos

### 5. Página Principal
- ✅ `Timesheets.tsx` - Usa submissões por projeto em vez de global

## Fluxo Atual

1. Gerente acessa `/timesheets` e seleciona uma semana passada
2. Projetos já enviados aparecem com badge verde "Enviado" e campos travados
3. Projetos não enviados aparecem com badge "Rascunho" e campos editáveis
4. Gerente pode lançar horas nos projetos não enviados
5. Ao clicar "Enviar" no projeto, apenas aquele projeto fica travado
6. Botão "Enviar Todos" permite submeter todos os projetos pendentes de uma vez
7. Administrador pode usar "Editar" em projetos já enviados

