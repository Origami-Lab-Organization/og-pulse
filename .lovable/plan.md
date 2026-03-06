

## Plano: Melhorar UX do checklist de documentos no drawer de desligamento

### Problemas identificados

1. **Checkboxes desabilitados** -- o usuario nao consegue interagir com o checklist
2. **Tipos de documento incompativeis** -- o checklist usa keys como `medical_exam`, `final_report`, `contract_termination`, etc., mas o `DOCUMENT_TYPES` no select de upload so tem 7 tipos (`trct`, `termination_letter`, `homologation`, etc.). Quando o usuario faz upload de um TRCT pelo select, o checklist marca corretamente, mas keys como `medical_exam` nunca sao marcadas porque nao existem no select
3. **Fluxo desconectado** -- o usuario precisa saber qual tipo selecionar no dropdown e depois fazer upload. O checklist deveria guiar o processo

### Solucao

Transformar o checklist em ponto central da experiencia de upload:

1. **Cada item do checklist tera um botao "Anexar"** ao lado -- ao clicar, abre o file picker e faz upload ja associando o `document_type` ao `key` do checklist (ex: `medical_exam`, `trct`)
2. **Checkbox auto-marca** quando existe documento com aquele `document_type` no banco
3. **Quando marcado**, mostra o nome do arquivo anexado e acoes (ver/excluir)
4. **Expandir `DOCUMENT_TYPES`** em `src/types/termination.ts` para incluir todas as keys do checklist (`medical_exam`, `final_report`, `performance_eval`, `contract_termination`, `quitacao`, `contract_amendment`, `meeting_minutes`, `quota_transfer`, `activity_report`)
5. **Manter area de upload generico** abaixo para documentos avulsos (tipo "Outro")
6. **Remover checklist disabled** -- os checkboxes refletem automaticamente o estado real dos uploads

### Alteracoes

#### `src/types/termination.ts`
- Expandir `DOCUMENT_TYPES` e `DOCUMENT_TYPE_LABELS` para incluir todas as keys usadas nos checklists: `medical_exam`, `final_report`, `performance_eval`, `contract_termination`, `quitacao`, `contract_amendment`, `meeting_minutes`, `quota_transfer`, `activity_report`

#### `src/components/terminations/detail/TerminationDetailDocumentsTab.tsx`
- Cada item do checklist: se nao tem doc anexado, mostra botao "Anexar" que abre file picker com `docType` pre-setado para aquele `key`
- Se tem doc anexado: checkbox marcado + nome do arquivo inline + botoes ver/excluir
- Manter card "Enviar Documento" simplificado para docs avulsos
- Remover `disabled` dos checkboxes (agora sao read-only mas refletem estado real)

### Detalhes tecnicos
- O `fileRef` sera reutilizado, mas um state `activeChecklistKey` controlara qual key do checklist esta aguardando o arquivo
- No `onChange` do input file, se `activeChecklistKey` estiver setado, usa ele como `docType` no upload
- Apos upload, limpa `activeChecklistKey`

