
# Simplificar Secao Financeira do Dialog de Lead

## Resumo

Tres ajustes no `LeadDetailDialog.tsx`:

1. **Remover a Badge do orcamento** (linhas 280-287) e o **nome/titulo ao lado** (linha 288) -- ja existe o botao "Abrir Orcamento" que cumpre essa funcao
2. **Manter** apenas os valores financeiros (Custo Total, Preco de Venda, Desconto, Valor Final) e o botao "Abrir Orcamento"

## Detalhes tecnicos

### Arquivo: `src/components/crm/LeadDetailDialog.tsx`

- Remover o bloco das linhas 279-289 (o `div` com a Badge clicavel e o span do titulo)
- Remover imports nao mais usados: `Badge`, `FileText`
- O restante da secao financeira (grid de valores, card de valor final, botao abrir orcamento) permanece inalterado
