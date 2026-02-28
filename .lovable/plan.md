
# Reembolsos - Lista Completa com Detalhes e Acoes

## Resumo

Transformar a pagina de Reembolsos para mostrar todos os reembolsos relevantes ao usuario (solicitados por ele + revisados por ele para admins/managers), com busca textual, dialog de detalhes ao clicar, e botoes de aprovar/rejeitar para gerentes e admins.

## Mudancas

### 1. Novo hook `useAllMyReimbursements` em `src/hooks/useReimbursements.ts`

Criar um novo hook que busca:
- Para usuarios comuns: apenas seus proprios reembolsos (`requested_by = employee.id`)
- Para admins/managers: todos os reembolsos do tenant (a RLS ja permite isso)

Enriquecer com nomes do solicitante, projeto e cliente (similar ao `usePendingReimbursements`).

### 2. Reescrever `src/pages/Reimbursements.tsx`

- Usar o novo hook em vez de `useMyReimbursements`
- Adicionar campo de busca (Input com icone Search) que filtra em todos os campos visiveis (descricao, nome do solicitante, projeto, cliente, status label, valor)
- Manter filtro de status (Select)
- Adicionar colunas: "Solicitante" (para admins/managers), "Projeto/Interno"
- Linhas clicaveis que abrem um Dialog de detalhes
- Ordenar do mais recente para o mais antigo (ja feito no backend)

### 3. Novo componente `src/components/reimbursements/ReimbursementDetailDialog.tsx`

Dialog que mostra todos os detalhes do reembolso:
- Solicitante, data, descricao, valor, tipo (interno/projeto), cliente, projeto
- Status atual com badge
- Motivo de rejeicao (se rejeitado)
- Lista de anexos com links para download
- Botoes de acao (Aprovar / Rejeitar) visiveis apenas para admins/managers e apenas quando status = pending
- Rejeitar abre sub-dialog para informar motivo

### 4. Filtro de busca

- Um `Input` com placeholder "Buscar reembolsos..." ao lado do Select de status
- Filtra client-side em: descricao, requester_name, project_name, client_name, valor formatado

## Detalhes Tecnicos

### `src/hooks/useReimbursements.ts`

Adicionar `useAllMyReimbursements()`:
- Se admin/manager: busca todos do tenant sem filtro de status
- Se usuario comum: busca apenas `requested_by = employee.id`
- Enriquece com nomes (requester_name, project_name, client_name) usando joins manuais
- Ordena por `created_at desc`

### `src/pages/Reimbursements.tsx`

- State: `searchQuery`, `statusFilter`, `selectedReimbursement`
- Filtragem: primeiro por status, depois por texto (toLowerCase includes em campos)
- Tabela com colunas: Data, Solicitante (condicional para managers), Descricao, Tipo, Valor, Status
- `onClick` na `TableRow` abre `ReimbursementDetailDialog`

### `src/components/reimbursements/ReimbursementDetailDialog.tsx`

- Props: `reimbursement`, `open`, `onOpenChange`
- Usa `useReimbursementAttachments` para buscar anexos
- Usa `useApproveReimbursement` e `useRejectReimbursement` para acoes
- Sub-dialog de rejeicao com Textarea para motivo
- Botao de download de anexos via signed URL

### Arquivos impactados

- `src/hooks/useReimbursements.ts` -- novo hook
- `src/pages/Reimbursements.tsx` -- reescrita
- `src/components/reimbursements/ReimbursementDetailDialog.tsx` -- novo arquivo
