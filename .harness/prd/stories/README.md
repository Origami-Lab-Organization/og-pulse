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

## Quando a história vai para Pronto

Quando o Victor aprova a história testada na tela ("ficou bom, pode abrir o PR"), ela vai para
`5-pronto/` junto com a abertura do PR, sem esperar o merge (decisão do Victor, 27/11/2026). O
merge pelo tech lead é a implantação.

## Prioridade dentro da pasta

Nas pastas `1-a-fazer/` a `4-em-desenvolvimento/`, o nome do arquivo começa pela posição na fila:
`01-US-0052-…`, `02-US-0057-…`. O explorador mostra a pasta já na ordem de prioridade. Repriorizar
é renomear com `git mv`; o ID não muda. Em `5-pronto/` e `9-arquivadas/` o nome fica sem número.
A ordem segue o roadmap de `refino-fluxo-comercial-a-projeto.md` e o que o Victor pedir.

Histórias de Projetos que já estão no código (decisão do Victor, 27/11/2026): US-0031, US-0034 a
US-0037, US-0039 e US-0046 a US-0048 foram para `5-pronto/`. US-0027, US-0029, US-0030 e US-0032
ficam em `4-em-desenvolvimento/` até ele conferir na tela os cenários marcados como pendentes na
Implementação de cada uma. A ordem delas fica para a próxima priorização.

Ainda não existe check automático que confira pasta e cabeçalho, como o
`npm run check:stories` do Origami Buds. Até existir, a conferência é feita no
review.
