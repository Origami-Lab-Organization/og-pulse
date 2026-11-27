# US-0031 — O forecast e a curva da aba Financeiro usam todos os meses do projeto

- **Status:** Pronto
- **Pronto em:** 27/11/2026, aprovado pelo Victor (PR #96 mesclado e testado por ele no localhost).
- **Tipo:** bug
- **Prontidão:** PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 7
- **Aprovada por / em:** Victor Couto, 23/11/2026
- **Relacionadas:** US-0026, US-0032

## Descrição

**Como** GP ou admin com `financeiro:ler`,
**quero** que o forecast e a curva de contrato da aba Financeiro considerem todos os meses do
projeto e todo o custo lançado,
**para** saber com que margem o projeto vai terminar.

### Contexto

A aba Financeiro conta a duração do projeto só em meses cheios: o mesmo defeito que a
US-0026 corrigiu na aba Despesas. Um projeto de 19/10 a 17/11 tem "1 mês"; as horas de
novembro somem e os custos de novembro vão para outubro. O defeito vale para **todo projeto**
cujas datas não fecham meses cheios.

Caso observado em 23/11/2026 no Paraíso: o card "Forecast · fim do projeto" mostra **88%**.
O forecast via só R$ 1.202,64 de custo (outubro), quando o custo já realizado é
R$ 4.755,27.

### Escopo

- Inclui: o forecast (margem e custo final estimados), a curva acumulada receita × custo e o
  aviso de margem projetada abaixo da meta da aba Financeiro.
- Não inclui: cor e texto do card de forecast (US-0032); P&L realizado (US-0033).

## Critérios de aceite

**Cenário 1: todos os meses entram**

- **Dado** um projeto de 19/10/2026 a 17/11/2026;
- **Quando** abro a aba Financeiro;
- **Então** a curva de contrato mostra out/2026 e nov/2026, com o custo de cada mês no mês
  certo.

**Cenário 2: o custo final estimado soma realizado e o que ainda falta**

- **Dado** um projeto em andamento;
- **Quando** abro o forecast;
- **Então** o custo final estimado é: o custo realizado até hoje, mais o que ainda falta do
  planejado do mês atual (planejado do mês − realizado do mês, nunca negativo), mais o
  planejado dos meses seguintes até a data de fim;
- **E** a margem projetada é (contrato − comissão planejada − custo final estimado) ÷
  contrato.

**Cenário 3: lançamento fora do período entra no custo**

- **Dado** um custo lançado fora do período do projeto (antes da US-0030);
- **Quando** abro o forecast;
- **Então** ele entra no custo realizado, como na aba Despesas (US-0026).

**Cenário 4: projeto que já passou da data de fim**

- **Dado** um projeto cuja data de fim já passou;
- **Quando** abro o forecast;
- **Então** o planejado que não foi lançado não conta mais;
- **E** o custo final estimado é igual ao custo realizado.

**Cenário 5: o Paraíso**

- **Dado** o Paraíso (fim em 17/11/2026) com os lançamentos de 23/11/2026;
- **Quando** abro a aba Financeiro;
- **Então** o forecast mostra custo final estimado R$ 4.755,27 e margem projetada ≈ 53,3%,
  no lugar de 88%.

## Decisões (Victor Couto, 23/11/2026)

- No mês atual, o forecast conta o realizado até hoje mais o que ainda falta do planejado
  do mês.
- Depois da data de fim do projeto, o planejado que não foi lançado não conta mais: o custo
  final estimado é o realizado.

## Contexto técnico

- **Comportamento atual:** PROVADO — `ProjectFinancialTab.tsx`: `projectDuration` com
  `differenceInMonths(end, start) + 1`; `monthlyChartData` limita custos com
  `Math.min(monthNumber, projectDuration)`; `forecast` soma o realizado de
  `slice(0, currentMonthIndex)` e o planejado de `slice(currentMonthIndex)`, ou seja, o mês
  atual entra só com o realizado.
- **Comportamento esperado:** usar os meses de calendário de `useProjectCostSummary().months`
  (US-0026), a mesma fonte dos cards e da aba Despesas.
- **Riscos para investigar:** receita por mês (`revenueByMonth`) tem o mesmo corte por
  `projectDuration`; projetos contínuos e sem data de fim.
- **Provas esperadas:** os cinco cenários; a soma da curva igual aos cards de custo.
- **Fora do escopo:** cor e texto do card (US-0032); P&L (US-0033).

## Implementação

Forecast e curva de contrato em `src/lib/projectForecast.ts` (`buildProjectForecast`,
`buildContractCurve`), sobre os meses de calendário de `useProjectCostSummary().months`
(US-0026). A aba Financeiro deixou de ter cálculo próprio de meses (`projectDuration` com
meses cheios, `monthlyChartData`, `revenueByMonth`).

- O que falta, mês a mês do mês atual até a data de fim, é o planejado menos o realizado do
  mês (nunca negativo). No mês atual é o resto do plano; num mês futuro, desconta o que já foi
  pago antecipadamente (evita contar duas vezes).
- Depois da data de fim, nada falta: o custo final é o realizado.
- A curva inclui os meses das parcelas (a última costuma vencer depois do fim), e o ponto
  final do custo projetado é o custo final estimado.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). Script descartável (23/11/2026): curva com Out/26 e Nov/26, mais Dez/26 da parcela. |
| 2 | Script: em 10/11, gasto R$ 4.755,27 + falta R$ 394,74 = R$ 5.150,01 (margem 49,4%). Falta conferir na tela. |
| 3 | Por construção: o realizado vem dos meses da US-0026, que incluem os meses fora do período. |
| 4 | Script: em 23/11 (depois do fim), falta R$ 0,00 e o custo final é o realizado. |
| 5 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). Script: Paraíso em 23/11 dá custo final R$ 4.755,27 e margem 53,3%. |

Testes automatizados não escritos: testes desativados no Harness por decisão do time.
