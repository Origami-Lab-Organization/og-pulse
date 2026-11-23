# US-0031 — O forecast e a curva da aba Financeiro usam todos os meses do projeto

- **Status:** Em refinamento
- **Tipo:** bug
- **Prontidão:** NÃO PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 7
- **Aprovada por / em:** —
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
  planejado dos meses seguintes;
- **E** a margem projetada é (contrato − comissão planejada − custo final estimado) ÷
  contrato.

**Cenário 3: lançamento fora do período entra no custo**

- **Dado** um custo lançado fora do período do projeto (antes da US-0030);
- **Quando** abro o forecast;
- **Então** ele entra no custo realizado, como na aba Despesas (US-0026).

**Cenário 4: o Paraíso**

- **Dado** o Paraíso com os lançamentos de 23/11/2026;
- **Quando** abro a aba Financeiro;
- **Então** o forecast deixa de mostrar 88% e passa a mostrar a margem da regra do cenário 2
  (valor depende da decisão pendente abaixo).

## Decisões (Victor Couto, 23/11/2026)

- No mês atual, o forecast conta o realizado até hoje mais o que ainda falta do planejado
  do mês.

## Pontos em aberto

### Decisões pendentes

- **Projeto que já passou da data de fim.** O Paraíso terminou em 17/11, e hoje é 23/11.
  Pela regra do cenário 2, o que ainda falta do planejado de novembro (≈ R$ 394,74 de horas
  planejadas e não lançadas) entra no custo final: forecast ≈ **49,4%**. Se, depois da data
  de fim, o que não foi lançado não conta mais, o custo final é o realizado: forecast ≈
  **53,3%**. Qual das duas? A resposta muda o cenário 4.

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
- **Provas esperadas:** os quatro cenários; a soma da curva igual aos cards de custo.
- **Fora do escopo:** cor e texto do card (US-0032); P&L (US-0033).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
