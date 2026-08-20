# ADR 0018: Alocacao GPO com pro-rata por dias uteis no mes corrente

- Status: aceito
- Data: 2026-08-11
- Decisores: Italo Castro (tech lead)
- Relacionados: ADR-0015 (mes comercial de 30 dias), ADR-0006 (migracao para role allocations)

## Contexto

A aba Equipe do projeto mostra planejado/realizado mes a mes, mas nao respondia a
pergunta que a GPO faz toda semana: "o projeto esta consumindo as horas que
planejou?". O calculo era feito fora do sistema, a partir de print de tela, e
cada pessoa aplicava a regra de um jeito.

O ponto sensivel e o mes corrente. Comparar o realizado parcial do mes contra o
planejado cheio faz todo projeto parecer subalocado no comeco do mes — um projeto
saudavel no dia util 7 de 21 apareceria perto de 33%. Somar o mes corrente cheio
dos dois lados esconde o problema oposto.

Restricoes relevantes:

- A grade ja calculava dias uteis por mes (`countWorkingDays`, com feriados do
  tenant) e ja exibia "hoje · dia util X de Y" no cabecalho — o insumo do
  pro-rata ja existia na tela.
- O rodape "Total" soma membros ativos **e** desalocados, mesmo quando as linhas
  de desalocado estao ocultas atras de "Mostrar desalocados".
- ADR-0015 adotou mes comercial de 30 dias para calculo financeiro. Alocacao de
  horas nao e valor financeiro: horas sao apontadas em dias uteis, entao o mes
  comercial nao serve aqui.

Alternativas consideradas:

1. Pro-rata por dias corridos — rejeitado: distorce meses com muitos feriados ou
   com o dia de hoje caindo em fim de semana; nao corresponde a como as horas
   sao apontadas.
2. Mes comercial de 30 dias (ADR-0015) — rejeitado: aplicavel a receita e custo,
   nao a capacidade de trabalho.
3. Ignorar o mes corrente e comparar so meses fechados — rejeitado: joga fora o
   sinal mais acionavel, que e o mes em andamento.
4. KPI so com membros ativos — rejeitado: divergiria do rodape da propria tela,
   colocando dois numeros conflitantes lado a lado sem explicacao.

## Decisao

O percentual de alocacao GPO e calculado assim:

1. Meses fechados entram cheios, planejado e realizado.
2. Mes corrente: planejado x (dias uteis decorridos / dias uteis totais); o
   realizado entra pelo valor cheio apontado.
3. Meses futuros sao ignorados.
4. Percentual = realizado acumulado / planejado acumulado x 100; nulo quando o
   planejado acumulado e zero.

Faixa saudavel: 90–100%. Abaixo e subconsumo ou apontamento atrasado; acima e
estouro.

O calculo vive em `src/lib/gpoAllocation.ts` (`calculateGpoAllocation`) como
fonte unica, com contratos em `src/types/equipe.types.ts` e limites da faixa em
`src/lib/gpoAllocation.constants.ts`. Nenhuma tela reimplementa o pro-rata.

A base de linhas do KPI e a **mesma do rodape** da aba Equipe: membros ativos +
desalocados. A escolha e por consistencia visivel — dois numeros na mesma tela
com bases diferentes seriam lidos como bug.

## Consequencias

- Beneficios: a leitura de alocacao para de depender de calculo manual sobre
  print; o mes corrente para de acusar subconsumo falso; a regra fica auditavel
  no popover "Como e calculado", que mostra o breakdown mensal e marca qual mes
  entrou em pro-rata.
- Custos: mais um numero na aba Equipe, que ja e densa. O KPI depende dos
  feriados do tenant estarem cadastrados — feriado faltando infla os dias uteis
  totais e reduz o pro-rata.
- Riscos: o KPI herda do rodape a inclusao de desalocados ocultos, entao o
  planejado/realizado acumulado pode nao bater com a soma das linhas visiveis.
  Registrado como TD-0013; nao foi resolvido neste diff por escolha explicita de
  escopo.
- Como reverter: remover `<GpoAllocationSummary />` de `TeamAllocationTable`. O
  lib e os tipos ficam sem consumidor e podem ser removidos junto; nada de
  schema, migration ou dado persistido foi tocado.

## Evidencias

- `src/lib/gpoAllocation.ts`, `src/lib/gpoAllocation.constants.ts`
- `src/components/projects/team/GpoAllocationSummary.tsx`
- `src/components/projects/team/TeamAllocationTable.tsx` (memo `gpoAllocation`)
- Conferencia com dados reais de um projeto (jun/26 92h/80h, jul/26 114h/101h,
  ago/26 86h/14h no dia util 7 de 21): planejado acumulado 234,67h, realizado
  195h, 83,1%, faixa `under` — identico ao calculo manual feito a mao.
