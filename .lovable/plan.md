

## Plano: Melhorias de UX no Wizard de Desligamento

### 1. Máscara de valores em reais (`TerminationStep3Payroll.tsx`)
- Substituir `<Input type="number">` pelo componente `<CurrencyInput>` já existente em `src/components/ui/currency-input.tsx`
- O campo de valor do ajuste manual passará a usar máscara brasileira (ex: 1.234,56)

### 2. Drag and drop no upload de documentos (`TerminationStep4Documents.tsx`)
- O drag and drop já está implementado (`onDragOver` + `onDrop`), mas falta feedback visual
- Adicionar estado `isDragging` para mudar o estilo da área quando o usuário arrasta um arquivo sobre ela (borda colorida, fundo highlight)

### 3. Data de desligamento não pode ser no futuro (`TerminationStep1Info.tsx`)
- Adicionar `disabled` no Calendar de data efetiva: `disabled={d => d > today}` (onde `today` é a data atual sem horário)
- A data de comunicação também deve ter o mesmo limite

### 4. Data de comunicação limitada a 45 dias no passado (`TerminationStep1Info.tsx`)
- Adicionar `disabled` no Calendar de comunicação: `disabled={d => d > today || d < subDays(today, 45)}`
- Exibir texto auxiliar informando o limite de 45 dias

### 5. Confirmação ao fechar o wizard (`TerminationWizardModal.tsx`)
- Interceptar o clique no X (botão de fechar do Dialog) e no botão "Cancelar"
- Se o wizard tiver dados preenchidos (step > 0 ou campos alterados), exibir um `AlertDialog` de confirmação: "Tem certeza que deseja sair? Os dados preenchidos serão perdidos."
- Usar o componente `AlertDialog` já existente no projeto
- Controlar via `onOpenChange` do Dialog - impedir fechamento direto e mostrar confirmação

### 6. Status "aguardando documentos" ao salvar sem docs obrigatórios (`TerminationWizardModal.tsx` + `TerminationStep4Documents.tsx`)
- Na função `handleSubmit`, verificar se todos os documentos obrigatórios do checklist estão marcados
- Se faltar algum obrigatório, salvar com `status: 'awaiting_documents'` ao invés de `'pending'`
- Adicionar alerta amarelo no Step 5 (Revisão) se houver docs obrigatórios não marcados, informando que o processo ficará com status "Aguardando Documentos"
- Exportar a lista de checklist do Step4 para reutilizar na validação do Modal

### Arquivos modificados
- `src/components/employees/termination-wizard/TerminationStep1Info.tsx` — limites de data
- `src/components/employees/termination-wizard/TerminationStep3Payroll.tsx` — CurrencyInput
- `src/components/employees/termination-wizard/TerminationStep4Documents.tsx` — feedback visual drag, exportar checklist
- `src/components/employees/termination-wizard/TerminationStep5Review.tsx` — alerta de docs faltantes
- `src/components/employees/TerminationWizardModal.tsx` — confirmação ao fechar, status condicional

