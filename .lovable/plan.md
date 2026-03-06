

## Plano: Modal em vez de gaveta, coluna de ações, entrevista de saída na criação

### Alterações

#### 1. Converter Drawer (Sheet) para Dialog (Modal)
**Arquivo:** `src/components/terminations/TerminationDetailDrawer.tsx`
- Substituir `Sheet`/`SheetContent` por `Dialog`/`DialogContent` com `max-w-4xl`
- Manter todo o conteúdo interno (header, tabs, footer) igual
- Renomear componente para `TerminationDetailModal` (e atualizar import em `TerminatedEmployees.tsx`)

#### 2. Adicionar coluna de Ações na tabela
**Arquivo:** `src/components/terminations/TerminationsTable.tsx`
- Receber callbacks `onEdit` e `onDownload` via parâmetros de `createTerminationColumns`
- Adicionar coluna "Ações" com botões de ícone: Editar (abre `TerminationEditDialog`) e Download (exporta PDF)
- Usar `e.stopPropagation()` nos botões para não disparar `onRowClick`

**Arquivo:** `src/pages/TerminatedEmployees.tsx`
- Adicionar estados para controlar `TerminationEditDialog` a partir da tabela
- Passar callbacks de editar/download para `createTerminationColumns`
- Implementar handler de download PDF reutilizando lógica existente

#### 3. Entrevista de saída no wizard de criação
**Arquivo:** `src/components/employees/termination-wizard/types.ts`
- Adicionar campos `exit_interview_completed: boolean` e `exit_interview_notes: string` ao `TerminationWizardData`
- Atualizar `getDefaultWizardData()` com valores padrão

**Arquivo:** `src/components/employees/termination-wizard/TerminationStep1Info.tsx`
- Adicionar seção no final do step com Switch "Entrevista de saída realizada?" e Textarea condicional para notas

**Arquivo:** `src/components/employees/TerminationWizardModal.tsx`
- Passar `exit_interview_completed` e `exit_interview_notes` no `handleSubmit` (linha 155-156 atualmente hardcoded como `false`/`null`)

**Arquivo:** `src/components/employees/termination-wizard/TerminationStep5Review.tsx`
- Mostrar status da entrevista de saída na seção de revisão

