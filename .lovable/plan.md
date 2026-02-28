
# Melhorias no Dialog de Detalhes do Reembolso

## Resumo

Melhorar a experiencia de visualizacao do dialog de detalhes do reembolso com: melhor exibicao de comprovantes (thumbnails para imagens, icones por tipo de arquivo), secao de historico/timeline, e correcao das cores dos badges de status para usar verde claro no "Aprovado" (igual ao padrao do sistema).

## Mudancas

### 1. Corrigir cores dos badges de status

Tanto em `Reimbursements.tsx` quanto em `ReimbursementDetailDialog.tsx`, o status "Aprovado" usa `variant: 'default'` (cor escura primaria). Mudar para usar `variant: 'secondary'` com classes customizadas `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`, seguindo o padrao ja usado em `EmployeesTable.tsx`, `TimesheetWeekStatus.tsx` e outros componentes do sistema.

Atualizar o `statusConfig` em ambos os arquivos:
```
approved: { label: 'Aprovado', variant: 'secondary', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
```

### 2. Melhorar visualizacao de comprovantes

No `ReimbursementDetailDialog.tsx`, substituir a lista simples de links por cards visuais:

- Para imagens (jpg, jpeg, png, webp, gif): mostrar thumbnail clicavel usando signed URL com preview inline (tag `<img>` com object-fit cover dentro de um container arredondado)
- Para outros arquivos (pdf, etc): mostrar icone de arquivo (FileText) com nome e tamanho
- Cada item clicavel abre em nova aba (comportamento atual mantido)
- Usar um grid de 2 colunas para comprovantes de imagem, lista para outros

Criar estado local para armazenar signed URLs dos attachments (carregar ao montar) para poder exibir thumbnails.

### 3. Adicionar secao de Historico (Timeline)

Adicionar uma secao "Historico" no dialog com timeline vertical estilizada usando um divider vertical e circulos:

- **Solicitado** - data de criacao + nome do solicitante (sempre presente)
- **Aprovado/Rejeitado** - data de revisao + nome do revisor (se existir `reviewed_at`)
- **Pago** - placeholder para futuro (nao exibido por enquanto, pois o campo ainda nao existe)

A timeline usa icones: Circle para solicitado, CheckCircle para aprovado, XCircle para rejeitado. Linhas conectoras entre os pontos.

## Detalhes Tecnicos

### Arquivo: `src/components/reimbursements/ReimbursementDetailDialog.tsx`

1. Atualizar `statusConfig` para incluir `className` com cores verdes
2. Adicionar `useEffect` para gerar signed URLs de todos os attachments ao carregar, armazenando em um `Map<string, string>` (attachment id -> signed url)
3. Substituir a `<ul>` de comprovantes por um grid visual com thumbnails para imagens
4. Adicionar secao de timeline apos a descricao, antes dos comprovantes
5. Importar icones adicionais: `FileText`, `Clock`, `Image` do lucide-react

### Arquivo: `src/pages/Reimbursements.tsx`

1. Atualizar `statusConfig` para incluir `className` com cores verdes
2. Aplicar className no `<Badge>` da tabela: `<Badge variant={cfg.variant} className={cfg.className}>`

### Arquivos impactados

- `src/components/reimbursements/ReimbursementDetailDialog.tsx` -- melhorias visuais
- `src/pages/Reimbursements.tsx` -- cor do badge
