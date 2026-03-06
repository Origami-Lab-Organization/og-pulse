

## Plano: Adicionar checklist de documentos obrigatórios/opcionais na aba Documentos

### Problema
A aba Documentos do drawer de desligamento mostra apenas um select de tipo + área de upload, sem o checklist de documentos obrigatórios e opcionais por tipo de contrato (que existia no wizard Step 4).

### Solução
Reintroduzir o checklist de documentos (igual ao `TerminationStep4Documents`) na aba Documentos do drawer, acima da área de upload. Cada item do checklist terá um checkbox e badge "Obrigatório"/"Opcional". Documentos já enviados (matching por `document_type`) serão automaticamente marcados.

### Alterações

#### `src/components/terminations/detail/TerminationDetailDocumentsTab.tsx`
- Importar `DOCUMENT_CHECKLISTS` e `DocItem` de `TerminationStep4Documents`
- Determinar o tipo de contrato do funcionário via `termination.employees.tipo_contratacao`
- Adicionar um Card "Checklist de Documentos" no topo com checkboxes read-only que refletem se o tipo de documento já foi enviado (comparando `documents` com o checklist)
- Badge "Obrigatório" (vermelho) ou "Opcional" (cinza) ao lado de cada item
- Remover o Select de tipo de documento da área de upload — o upload passará a associar o tipo automaticamente ou manter o select simplificado
- Manter a área de upload e a lista de documentos anexados abaixo

### Lógica de marcação automática
Para cada item do checklist, verificar se existe um documento em `documents` cujo `document_type` corresponda à `key` do checklist. Se sim, checkbox marcado + indicador visual de "enviado".

