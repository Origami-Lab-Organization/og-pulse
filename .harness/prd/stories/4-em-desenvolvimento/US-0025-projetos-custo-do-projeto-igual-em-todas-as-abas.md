# US-0025 — O custo do projeto é o mesmo em todas as abas

- **Status:** Em desenvolvimento
- **Tipo:** bug
- **Prontidão:** PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 1
- **Aprovada por / em:** Victor Couto, 23/11/2026
- **Relacionadas:** US-0026, US-0027, ADR-0004, ADR-0006, TD-0014

## Descrição

**Como** GP ou admin com `financeiro:ler`,
**quero** que o custo planejado, o custo realizado e a margem do projeto sejam os mesmos
na Visão Geral, na aba Despesas e na aba Financeiro,
**para** decidir sobre o projeto sem precisar descobrir qual das telas está certa.

### Contexto

Hoje cada aba calcula o custo à sua maneira, e os números não batem. A Visão Geral soma
só mão de obra, Fornecedor e Material: custos de Viagem, Assinatura, Aluguel de
equipamento e Outros, lançados no ledger da aba Despesas, ficam de fora do planejado, do
realizado e da margem. O defeito vale para **todo projeto** que tenha custo dessas
categorias, não só para o caso em que foi achado.

Caso observado em 23/11/2026 no projeto Projeto Fator S | UFLA (Paraíso):

| Número | Visão Geral (hoje) | Correto (= KPI da aba Despesas) |
|---|---|---|
| Custo planejado | R$ 7.518,79 (só mão de obra) | R$ 8.602,39 (MO 7.518,79 + Viagem 1.083,60) |
| Custo realizado | R$ 3.671,67 (só mão de obra) | R$ 4.755,27 (MO 3.671,67 + Viagem 1.083,60) |
| Margem planejada | 26% | ~15,5% (contrato R$ 10.179,00) |

Como a margem planejada sai maior do que é, quem lê a Visão Geral acha que o projeto está
mais saudável do que está.

### Escopo

- Inclui: custo planejado e realizado de mão de obra e de **todas** as categorias do
  ledger (Fornecedor, Assinatura, Aluguel de equipamento, Material, Viagem, Outros);
  margem planejada e realizada da Visão Geral; KPIs da aba Despesas; números de custo da
  aba Financeiro.
- Não inclui: o gráfico mensal da aba Despesas (US-0026); a seção Mão de Obra por pessoa
  (US-0027); relatórios e análises fora da tela do projeto (ver Pontos em aberto).

## Critérios de aceite

**Cenário 1: Visão Geral conta todas as categorias de custo**

- **Dado** um projeto com custo de Viagem (ou Assinatura, Aluguel, Outros) no ledger;
- **Quando** abro a Visão Geral;
- **Então** o card Custos soma esse custo no planejado e no realizado;
- **E** a margem planejada e a realizada são calculadas com esse custo.

**Cenário 2: as abas reconciliam centavo a centavo**

- **Dado** qualquer projeto;
- **Quando** comparo a Visão Geral, a aba Despesas e a aba Financeiro;
- **Então** o custo planejado é o mesmo nas três;
- **E** o custo realizado é o mesmo nas três.

**Cenário 3: o caso do Paraíso**

- **Dado** o projeto Projeto Fator S | UFLA (Paraíso) com os lançamentos de 23/11/2026;
- **Quando** abro a Visão Geral;
- **Então** vejo custo realizado R$ 4.755,27, planejado R$ 8.602,39 e margem planejada
  ~15,5%.

**Cenário 4: custo apagado não conta**

- **Dado** um custo do ledger que foi removido;
- **Quando** abro qualquer uma das abas;
- **Então** ele não entra em nenhum total.

## Pontos em aberto

### Hipóteses para validar

- A aba Financeiro provavelmente tem um quarto cálculo próprio; não foi conferida nesta
  análise. O cenário 2 cobre o caso em que ela também diverge.

### Provocações para produto

- Relatórios do portfólio e Análises também somam custo do projeto. Se usarem a mesma
  regra quebrada, o portfólio mostra margem maior do que a real. Vale conferir no
  preflight e abrir história separada se for o caso.

## Contexto técnico

- **Objetivo observável:** um número de custo do projeto, igual em todas as abas.
- **Comportamento atual:** PROVADO —
  - `ProjectOverviewTab.tsx` soma no realizado `project.suppliers` (lido de
    `project_supplier_actuals`, tabela legada pós-ADR-0004) e `project.materials`;
  - `fetchProjectSuppliersRaw` e `fetchProjectMaterialsRaw` em
    `src/services/projectCostsService.ts` filtram só `category = 'supplier'` e
    `'material'`;
  - o planejado vem de `useProjectPlannedMargin.ts:84`
    (`laborPlanned + supplierCostPlanned + materialCostPlanned`), com o mesmo recorte;
  - `ProjectCostsTab.tsx` soma `planned_amount_brl`/`actual_amount_brl` de todo o
    `useProjectCostItems` (correto).
- **Comportamento esperado:** uma regra única (helper/hook reutilizável, como pede
  `boundaries.md`) consumida pela Visão Geral, pela aba Despesas e pela aba Financeiro.
- **Restrições:** cálculo financeiro, área de risco (`boundaries.md`); leitura pelo
  service único de custos (ADR-0004); valores em BRL truncados, sem arredondar
  (ADR-0011).
- **Riscos para investigar:** outros consumidores de `supplierCostPlanned`/
  `materialCostPlanned` e de `project_supplier_actuals` (relatórios, analytics,
  `useProjectHealthData`).
- **Provas esperadas:** os quatro cenários, inclusive a reconciliação entre abas num
  projeto com mais de uma categoria de custo.
- **Fora do escopo:** gráfico mensal (US-0026); seção Mão de Obra (US-0027).

## Implementação

Regra única do custo do projeto: `src/lib/projectCostSummary.ts` (funções puras) e
`src/hooks/useProjectCostSummary.ts`. Passaram a ler dela: Visão Geral e simulador de
alocação (via `useProjectPlannedMargin`), cards da aba Despesas, totais da aba Financeiro e
Resultado Esperado (Financeiro na fase de Planejamento). Os gráficos mensais de Despesas e
Financeiro mantêm cálculo próprio até a US-0026.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080): a Visão Geral passou a contar Viagem. |
| 2 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). As quatro telas leem o mesmo hook. |
| 3 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080); as funções puras com os números do Paraíso dão planejado R$ 8.602,39, realizado R$ 4.755,27 e margem planejada 15,5%. |
| 4 | Por construção: `useProjectCostItems` só lê custos com `deleted_at` nulo. Não houve custo removido no Paraíso para conferir na tela. |

Testes automatizados não escritos: testes desativados no Harness por decisão do time.
