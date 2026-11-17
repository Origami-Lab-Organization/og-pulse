# Histórias por status

A pasta é o status da história. Mudar o status = mover o arquivo com `git mv` e
ajustar a linha **Status** do cabeçalho no mesmo commit.

| Pasta | Status no cabeçalho | O que entra |
|---|---|---|
| `1-a-fazer/` | A fazer | Registrada, sem refinamento iniciado, ou adiada |
| `2-em-refinamento/` | Em refinamento | Em discussão, com decisões pendentes |
| `3-pronta-para-desenvolver/` | Pronta para desenvolver | Aprovada pelo tech lead ou PO, ainda não iniciada |
| `4-em-desenvolvimento/` | Em desenvolvimento | Em código, ou com prova pendente |
| `5-pronto/` | Pronto | Todos os cenários provados e CI verde; aguarda implantação |
| `9-arquivadas/` | Arquivada | Substituída ou descartada (motivo na história) |

As histórias são citadas pelo ID (`US-0001`), que nunca muda.

Ainda não existe check automático que confira pasta e cabeçalho, como o
`npm run check:stories` do Origami Buds. Até existir, a conferência é feita no
review.
