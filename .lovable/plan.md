

## Plano: Corrigir drawer de desligamento (financeiro, edição, PDF, remover Imprimir)

### Problemas

1. **Dados financeiros "não carregam"** — Na verdade carregam (resposta 200), mas a tabela está vazia porque não há ajustes cadastrados. O problema é UX: não há feedback visual claro de que está funcionando. Vou manter como está (já mostra "Nenhum ajuste registrado") — o real problema pode ser que o usuário esperava ver cálculos automáticos (verbas rescisórias). Mas pela estrutura atual, os ajustes são manuais. Sem mudança aqui.

2. **Botão "Editar" não funciona** — O botão não tem `onClick`. Preciso criar um dialog de edição com os campos do desligamento (tipo, data, motivo, aviso prévio, etc.) usando o `terminationService.update` existente.

3. **Botão "Exportar PDF" não funciona** — O botão não tem `onClick`. Preciso implementar a exportação usando `html2canvas` + `jsPDF` capturando o conteúdo do drawer.

4. **Botão "Imprimir" deve ser removido**.

### Alterações

#### 1. Criar `src/components/terminations/TerminationEditDialog.tsx`
- Dialog com formulário para editar campos do desligamento: tipo de desligamento, data, data de notificação, categoria do motivo, motivo (texto), dias de aviso prévio, aviso trabalhado (switch), entrevista de saída (switch + notas)
- Usar `useUpdateTermination` para salvar
- Pré-preencher com dados atuais do `termination`

#### 2. Editar `src/components/terminations/TerminationDetailDrawer.tsx`
- Remover botão "Imprimir"
- Adicionar estado `editOpen` e handler para abrir `TerminationEditDialog`
- Adicionar `onClick` no botão "Editar" para abrir o dialog
- Adicionar `onClick` no botão "Exportar PDF" com lógica de captura do conteúdo do SheetContent via `html2canvas` + `jsPDF`
- Adicionar `id` ao container de conteúdo para captura do PDF
- Importar `TerminationEditDialog`

