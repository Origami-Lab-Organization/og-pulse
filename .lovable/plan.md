

## Adicionar Botoes de Envio na Minha Timesheet

### Objetivo

Adicionar botoes de envio por projeto e envio de todos os projetos na pagina "Minha Timesheet" (`/my-timesheet`), permitindo que o funcionario submeta suas horas diretamente.

### O que sera feito

**1. Botao "Enviar" por projeto** -- dentro de cada card de projeto, ao lado do badge "Rascunho", adicionar um botao "Enviar" que abre o dialog de confirmacao para enviar apenas aquele projeto.

**2. Barra de resumo com "Enviar Todos"** -- acima dos cards, reutilizar o componente `TimesheetWeekStatus` que ja exibe o resumo da semana e o botao "Enviar Todos".

### Detalhes tecnicos

**Arquivo modificado:** `src/pages/MyTimesheet.tsx`

Alteracoes:
- Importar `useSubmitProjectWeek`, `useSubmitAllProjects` do hook existente
- Importar `SubmitProjectDialog`, `SubmitAllProjectsDialog` dos componentes existentes
- Importar `TimesheetWeekStatus` para a barra de resumo
- Adicionar estados para controlar os dialogs (`showSubmitProjectDialog`, `showSubmitAllDialog`, `selectedProject`)
- Calcular `pendingProjects` (projetos com horas > 0 e nao enviados)
- Verificar permissao de envio via `employee?.is_gerente || isAdmin` (campo `canSubmit`)
- Adicionar botao `Send` em cada card nao enviado (quando `canSubmit`)
- Renderizar `TimesheetWeekStatus` acima dos cards
- Renderizar os dois dialogs de confirmacao

Nenhuma alteracao em banco de dados ou novos componentes necessarios -- toda a infraestrutura (hooks, dialogs, componente de status) ja existe e esta pronta para uso.

