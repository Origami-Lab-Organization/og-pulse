
# Adicionar Scroll ao Dialog de Lead

## Problema

O `DialogContent` do lead nao tem altura maxima nem overflow, entao quando o conteudo e grande (formulario + secao financeira), ele ultrapassa os limites da tela.

## Solucao

Adicionar `max-h-[85vh] overflow-y-auto` ao `DialogContent` no `LeadDetailDialog.tsx` para limitar a altura a 85% da viewport e habilitar scroll vertical quando necessario.

## Alteracao

**Arquivo**: `src/components/crm/LeadDetailDialog.tsx` (linha 132)

Alterar:
```
<DialogContent className="max-w-lg [&>button:last-child]:hidden">
```

Para:
```
<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto [&>button:last-child]:hidden">
```

Nenhum outro arquivo precisa ser alterado.
