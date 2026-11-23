# US-0026 — O gráfico de custos mostra todos os meses do projeto

- **Status:** Em desenvolvimento
- **Tipo:** bug
- **Prontidão:** PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 2
- **Aprovada por / em:** Victor Couto, 23/11/2026
- **Relacionadas:** US-0025, US-0028, US-0030

## Descrição

**Como** GP ou admin com `financeiro:ler`,
**quero** que o gráfico "Planejado vs realizado por mês" e o "Breakdown por categoria" da
aba Despesas mostrem todos os meses do projeto, com cada custo no mês certo,
**para** enxergar a evolução real do custo e não decidir com metade dos números.

### Contexto

A aba Despesas calcula quantos meses o projeto tem contando só **meses cheios** entre o
início e o fim. Um projeto de 19/10 a 17/11 não fecha um mês cheio, então a tela acha que
ele tem 1 mês. O efeito, que vale para **todo projeto** cujas datas não caem em meses
cheios:

- horas lançadas no último mês são descartadas do gráfico;
- o planejado do último mês some;
- custos do ledger do último mês são empurrados para o mês anterior;
- o "Breakdown por categoria" herda os mesmos números.

Caso observado em 23/11/2026 no Paraíso (19/10/2026 a 17/11/2026): o gráfico mostra só
"out 2026", com MO realizada de R$ 119,04 (1h de outubro) quando o realizado de MO é
R$ 3.671,67 (28h). O planejado do gráfico dá R$ 4.655,02 contra R$ 8.602,39 no card. A
rosca mostra Mão de Obra 10% e "Fornecedores" 90%, embora todo o custo do ledger seja
Viagem.

O card "Categorias ativas" também está errado: conta cada lançamento como uma categoria
(mostra 6 no Paraíso, onde há 2: Mão de Obra e Viagem).

### Escopo

- Inclui: meses do gráfico mensal; mês de cada lançamento de horas e de cada custo do
  ledger; rosca "Breakdown por categoria" (valores e nome das categorias); card
  "Categorias ativas".
- Não inclui: quais séries o gráfico mostra (US-0028); custos da Visão Geral (US-0025).

## Critérios de aceite

**Cenário 1: todos os meses do calendário aparecem**

- **Dado** um projeto de 19/10/2026 a 17/11/2026;
- **Quando** abro a aba Despesas;
- **Então** o gráfico mensal mostra out/2026 e nov/2026.

**Cenário 2: nada é descartado nem muda de mês**

- **Dado** horas lançadas e custos do ledger em qualquer mês do projeto;
- **Quando** abro o gráfico;
- **Então** cada valor aparece no mês em que foi lançado;
- **E** a soma do realizado no gráfico é igual ao card "Custo realizado";
- **E** a soma do planejado no gráfico é igual ao card "Custo planejado".

**Cenário 3: a rosca usa as categorias reais**

- **Dado** custos do ledger do tipo Viagem;
- **Quando** abro o "Breakdown por categoria";
- **Então** eles aparecem como Viagem, não como Fornecedores;
- **E** os percentuais somam os totais dos cards.

**Cenário 4: categorias ativas conta categorias**

- **Dado** o Paraíso com mão de obra e cinco lançamentos de Viagem;
- **Quando** abro a aba Despesas;
- **Então** o card "Categorias ativas" mostra 2.

**Cenário 5: lançamento fora do período aparece num mês extra**

- **Dado** um lançamento de horas ou de custo com data antes do início ou depois do fim
  do projeto;
- **Quando** abro o gráfico mensal;
- **Então** ele aparece num mês extra, no mês da data dele, e não é empurrado para o
  primeiro ou o último mês do projeto;
- **E** ele entra nos totais dos cards.

## Decisões (Victor Couto, 23/11/2026)

- Lançamento fora do período do projeto aparece num mês extra do gráfico e entra no
  total. Novos lançamentos fora do período passam a ser recusados (US-0030); o mês extra
  continua necessário para os que já existem.

## Contexto técnico

- **Comportamento atual:** PROVADO — `ProjectCostsTab.tsx`, `durationMonths` com
  `differenceInMonths(end, start) + 1` sobre as datas exatas; em `monthlyChartData`, horas
  com `monthNumber > durationMonths` são descartadas e custos são limitados por
  `Math.min(monthNumber, durationMonths)`; custo recorrente tem o realizado lançado
  inteiro no `start_month`; o mapa separa só `material` e "extra", e a rosca rotula
  "extra" como Fornecedores; `activeCategories` soma 1 por lançamento.
- **Comportamento esperado:** meses do calendário entre o mês de início e o mês de fim.
- **Riscos para investigar:** a mesma conta de duração em outros pontos
  (`useProjectPlannedLaborCost(project, durationMonths)`, aba Financeiro, gráficos de
  tendência); projetos contínuos (hoje fixados em 12 meses).
- **Provas esperadas:** projeto com datas que não fecham mês cheio; projeto que cruza o
  ano; reconciliação gráfico × cards.
- **Fora do escopo:** quais séries o gráfico mostra (US-0028).

## Implementação

Meses de calendário em `src/lib/projectMonthlyCosts.ts` (`buildProjectMonthlyCosts`,
`countActiveCostCategories`), calculados dentro de `useProjectCostSummary`, a mesma fonte
dos cards (US-0025). Mão de obra planejada por mês de calendário vem de
`useProjectPlannedLaborCost().byCalendarMonth`; custo recorrente usa `project_cost_months`
(trazido por `useProjectCostItems`) com a regra de reconhecimento de `projectCostsService`.
A data da hora é lida com `parseISO` (sem o deslocamento de UTC). O gráfico mensal da aba
Financeiro ainda tem cálculo próprio e não faz parte desta história.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080); script descartável com 19/10–17/11/2026 gera out/2026 e nov/2026. |
| 2 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso); no script, soma do gráfico = cards (planejado 9.002,39 e realizado 5.105,28, com Viagem, fornecedor recorrente e custo fora do período) e a hora de 01/11 fica em novembro. |
| 3 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso): a rosca lê as categorias do ledger (`COST_CATEGORIES`). |
| 4 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso: 2); no script, Mão de Obra + Viagem + Fornecedor = 3. |
| 5 | Só no script: custo de 02/12/2026 num projeto que acaba em 17/11 abre dez/2026 marcado como fora do período e entra no total. O Paraíso não tem lançamento fora do período para conferir na tela. |

Testes automatizados não escritos: testes desativados no Harness por decisão do time.
