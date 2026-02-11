
# Melhorias na Secao de Reembolsos do Projeto

## Resumo

Adicionar coluna "Aprovado por" na tabela de reembolsos, permitir exclusao com justificativa (apenas gerentes/admins), e abrir modal de detalhes ao clicar na linha mostrando informacoes completas e anexos.

## Mudancas

### 1. Hook `useProjectApprovedReimbursements` - Enriquecer com nome do aprovador

**Arquivo: `src/hooks/useReimbursements.ts`**

Buscar tambem os nomes dos aprovadores (`reviewed_by`) alem dos solicitantes, e retornar `reviewer_name` em cada registro.

### 2. Hook `useDeleteReimbursement` - Novo hook para exclusao

**Arquivo: `src/hooks/useReimbursements.ts`**

Novo mutation que:
- Recebe `reimbursementId` e `reason` (justificativa obrigatoria)
- Deleta o registro de `reimbursement_requests` (cascade deleta attachments)
- Invalida queries relevantes (`project-reimbursements`, `my-reimbursements`, etc.)

### 3. Tabela de Reembolsos - Nova coluna + clique na linha + botao excluir

**Arquivo: `src/components/projects/detail/ProjectReimbursementsSection.tsx`**

- Adicionar coluna "Aprovado por" com o nome do aprovador
- Tornar as linhas clicaveis (`cursor-pointer`) para abrir modal de detalhes
- Adicionar coluna de acoes com botao de exclusao (visivel apenas para gerentes/admins)
- Receber `isEditable` como prop para controlar visibilidade do botao de exclusao

### 4. Modal de Detalhes do Reembolso

**Novo arquivo: `src/components/projects/detail/ReimbursementDetailDialog.tsx`**

Dialog que exibe ao clicar na linha:
- Funcionario solicitante
- Descricao
- Valor total
- Data de criacao e data de aprovacao
- Aprovado por
- Lista de anexos com links para download (usando URLs assinadas do Storage)

### 5. Dialog de Exclusao com Justificativa

**Novo arquivo: `src/components/projects/detail/DeleteReimbursementDialog.tsx`**

Dialog com:
- Mensagem de confirmacao
- Campo de justificativa (Textarea obrigatoria)
- Botoes Cancelar e Confirmar Exclusao

### 6. Integracao no ProjectCostsTab

**Arquivo: `src/components/projects/detail/ProjectCostsTab.tsx`**

Passar `isEditable` (ou `canEditActuals`) para `ProjectReimbursementsSection`.

## Arquivos Modificados/Criados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/hooks/useReimbursements.ts` | Editado | Enriquecer com reviewer_name + novo hook useDeleteReimbursement |
| `src/components/projects/detail/ProjectReimbursementsSection.tsx` | Editado | Coluna aprovador, clique na linha, botao excluir |
| `src/components/projects/detail/ReimbursementDetailDialog.tsx` | Novo | Modal de detalhes com anexos |
| `src/components/projects/detail/DeleteReimbursementDialog.tsx` | Novo | Dialog de exclusao com justificativa |
| `src/components/projects/detail/ProjectCostsTab.tsx` | Editado | Passar props de permissao |

## Detalhes Tecnicos

### Enriquecimento com nome do aprovador

```typescript
// Em useProjectApprovedReimbursements
const reviewerIds = [...new Set(requests.filter(r => r.reviewed_by).map(r => r.reviewed_by!))];
const allIds = [...new Set([...requesterIds, ...reviewerIds])];
// Busca unica de employees, monta nameMap
// Retorna reviewer_name junto com requester_name
```

### Hook useDeleteReimbursement

```typescript
export function useDeleteReimbursement() {
  return useMutation({
    mutationFn: async (params: { reimbursementId: string; reason: string }) => {
      // Deleta o reimbursement_request (cascade deleta attachments)
      await supabase
        .from('reimbursement_requests')
        .delete()
        .eq('id', params.reimbursementId);
    },
    onSuccess: () => {
      // Invalidar project-reimbursements, my-reimbursements, etc.
    },
  });
}
```

A justificativa da exclusao nao sera persistida no banco (o registro sera deletado). Caso deseje manter historico, podemos adicionar um campo `deletion_reason` mas nao foi solicitado.

### Modal de detalhes - Anexos

Reutiliza o pattern existente do `AttachmentsDialog` no `ReimbursementInbox.tsx`, usando `useReimbursementAttachments` para buscar os anexos e `supabase.storage.createSignedUrl` para gerar links de download.
