# US-0021 — Ajustar as Métricas ao novo fluxo de abordagem

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 23/11/2026 ("aprovo a US-0021, pode começar")
- **Relacionadas:** US-0008, US-0010, US-0019, US-0020, US-0022, US-0023, ADR-0040, TD-0022

## Descrição

**Como** pessoa do comercial,
**quero** que as Métricas reflitam o fluxo novo — triar a base, qualificar, abordar e
qualificar pelo BANT —,
**para** acompanhar a cobertura, a conversão e o que precisa de ação sem depender da lista de
contas que saiu da tela.

### Contexto

O fluxo comercial mudou entre 18 e 23/11/2026: a tela Empresas filtra a base da Receita e tem
a aba "Em qualificação" (US-0023); a empresa é descartada ou marcada "Não agora" na própria
base (US-0010); a oportunidade tem tipo de conta (US-0008) e BANT (US-0022). As Métricas
ainda contam o fluxo antigo:

- o funil começa em "Contas abertas" (as oportunidades criadas, que hoje nascem em
  Qualificação) e vai direto para o 1º toque, sem enxergar a Qualificação;
- "Cobertura da lista" (aba Esforço) e "contas nunca abordadas" (Visão geral) contam as
  empresas cadastradas na Prospecção, uma lista que saiu da tela (o link "Ver contas" foi
  retirado em 18/11);
- não há tipo de conta como corte, nem leitura do BANT.

### Escopo

- Inclui: **Qualificação no funil.** O funil passa a ser: Movidas para qualificação →
  Saíram para A abordar → Ativados (1º toque) → Responderam → Agendaram reunião → Fizeram
  reunião → Oportunidade qualificada. Na aba Conversão, as **saídas da Qualificação** sem ir
  para A abordar (Perda por motivo e "Não agora") e o **tempo médio em Qualificação**.
- Inclui: **Triagem da base** no lugar de "Cobertura da lista": no período, empresas movidas
  para qualificação, descartadas (por motivo) e marcadas "Não agora", e quantas estão em
  "Retomar" agora, com link para a Base filtrada.
- Inclui: "contas nunca abordadas" vira **"Em A abordar sem 1º toque há mais de 14 dias"**,
  com link para o Pipeline.
- Inclui: **tipo de conta** como recorte da aba Canais (ao lado de Alavanca e Responsável) e
  como filtro da barra das Métricas, que vale para todas as abas.
- Inclui: **saúde do BANT**: oportunidades em andamento abaixo da meta de BANT da etapa (com
  link para o Pipeline), nota média por etapa e quantas chegaram a 75 no período; as abaixo da
  meta entram no "o que precisa de ação" da Visão geral.
- Inclui: o MCP (`get_prospecting_metrics`) segue o mesmo cálculo da tela (TD-0022): funil
  novo, triagem, recorte e filtro por tipo de conta e saúde do BANT.
- Não inclui: métricas por distância de Formiga; meta de volume por pessoa; custo por
  oportunidade.

## Critérios de aceite

**Cenário 1: funil com a Qualificação**

- **Dado** um período com empresas movidas para qualificação;
- **Quando** abro a Visão geral;
- **Então** o funil começa em "Movidas para qualificação", passa por "Saíram para A abordar"
  e segue até "Oportunidade qualificada", com a taxa entre cada etapa e o gargalo;
- **E** a aba Conversão mostra a taxa Qualificação → A abordar e o tempo médio em
  Qualificação.

**Cenário 2: saídas da Qualificação**

- **Dado** oportunidades que saíram da Qualificação por Perda ou "Não agora" no período;
- **Quando** abro a aba Conversão;
- **Então** vejo quantas saíram por cada motivo (os motivos de Perda e o "Não agora").

**Cenário 3: triagem da base**

- **Dado** empresas movidas, descartadas e marcadas "Não agora" no período;
- **Quando** abro a aba Esforço;
- **Então** "Triagem da base" mostra as três contagens (o descarte quebrado por motivo) e
  quantas estão em "Retomar" agora;
- **E** "Retomar" leva à Base de empresas com esse filtro.

**Cenário 4: A abordar parado**

- **Dado** oportunidades em A abordar sem 1º toque há mais de 14 dias;
- **Quando** abro a Visão geral;
- **Então** vejo quantas são, com link para o Pipeline, no lugar de "contas nunca abordadas".

**Cenário 5: tipo de conta**

- **Quando** filtro as Métricas por "Âncora";
- **Então** todas as abas contam só as oportunidades de empresas Âncora;
- **E** na aba Canais, o recorte "Tipo de conta" quebra o funil por Âncora, Ponte, Satélite e
  Sem tipo.

**Cenário 6: saúde do BANT**

- **Dado** oportunidades em andamento com BANT abaixo da meta da etapa;
- **Então** a leitura "Saúde do BANT" mostra quantas são, a nota média por etapa e quantas
  chegaram a 75 no período;
- **E** as abaixo da meta aparecem no "o que precisa de ação" da Visão geral, com link.

**Cenário 7: pelo chat**

- **Quando** peço ao Claude as métricas do período, filtradas por Âncora;
- **Então** ele traz os mesmos números da tela, com o funil novo, a triagem e o BANT.

## Revisão da tela (Victor Couto, 2026-11-23)

- A jornada do período vira um funil: cada etapa é uma faixa com a largura proporcional ao
  número, com o número dentro, que se estreita até a etapa seguinte — o desvio aparece no
  formato; a etapa do gargalo fica em amarelo.
- Os filtros saem do cabeçalho (cortavam a descrição e deixavam espaço em branco): uma barra
  acima das abas, com o período e o resumo dele à esquerda e, à direita, "Filtros" num
  popover (responsável, alavanca, tipo de conta), os ativos como etiquetas removíveis e
  "Como contamos". No celular, os filtros passam a aparecer (o cabeçalho os escondia).

## Decisões (Victor Couto, 2026-11-23)

- Qualificação entra no funil, com as saídas e o tempo médio na aba Conversão (recomendação
  aceita).
- "Cobertura da lista" vira "Triagem da base"; "contas nunca abordadas" vira "Em A abordar sem
  1º toque há mais de 14 dias" (recomendação aceita).
- Tipo de conta como recorte da aba Canais e filtro geral das Métricas (recomendação aceita).
- Saúde do BANT entra agora (recomendação aceita).

## Pontos em aberto

### Hipóteses para validar

- 14 dias como limite de "A abordar parado".
- "Movidas para qualificação" conta as oportunidades criadas no período em Qualificação (pela
  tela, pela base ou direto no Pipeline). As **devolvidas para a lista não deixam rastro**: o
  "Devolver para a lista" apaga a oportunidade, então elas saem das contagens.
- A triagem conta pela data da decisão; uma empresa descartada e depois desfeita no mesmo
  período não conta como descartada.
- O histórico de etapas (`prospect_stage_changes`) dá a saída da Qualificação e o tempo nela
  desde 19/11/2026; antes disso não havia Qualificação.

### Provocações para produto

- As métricas de antes de 19/11 não têm Qualificação — impacto possível: comparar com o
  período anterior mostra "Movidas para qualificação" saltando de zero; a variação precisa
  avisar que o histórico começa em 19/11.

## Contexto técnico

- **Comportamento atual:** PROVADO —
  - catálogo de métricas em `src/lib/prospecting/periodMetrics.ts` (`buildDataset`,
    `metricValues`, `cutSafra`, `listHealth`), funil e cortes em `metrics.ts`
    (`calculateProspectingFunnel`, `ProspectCut` = alavanca ou responsável,
    `AccountCoverage`/`nuncaAbordadas`);
  - telas em `src/components/prospeccao/metrics/` (`OverviewTab`, `EffortTab`,
    `ConversionTab`, `ChannelsTab`, `MetricsFilterBar`);
  - MCP: `get_prospecting_metrics` em `apps/mcp-prospeccao/src/index.ts`, com o mesmo cálculo;
  - dados novos: `prospect_decisoes_da_base` (US-0010), `prospect_bant_evidencias` e as regras
    de nota e meta em `src/lib/prospecting/bant.ts` (US-0022), `prospect_companies.tipo_conta`
    (US-0008), etapa `qualificacao` e `prospect_stage_changes`.
- **Mudanças no banco:** nenhuma prevista (leitura do que já existe, com a RLS da pessoa).
- **Restrições e padrões aplicáveis:** tela e MCP com o mesmo cálculo (TD-0022); nomes
  Oportunidade/Pipeline; taxas nulas sem base, nunca 0%.
- **Riscos para investigar:** ler as evidências de BANT de todas as oportunidades em andamento
  sem pesar a tela (hoje `useBantDoQuadro` lê por quadro); contar a triagem sem ler a base da
  VPS (só as decisões do tenant).
- **Provas esperadas:** funil com Qualificação; saídas e tempo em Qualificação; triagem com
  link para "Retomar"; A abordar parado; filtro e recorte por tipo de conta; saúde do BANT;
  MCP com os mesmos números.
- **Fora do escopo:** distância de Formiga nas Métricas; metas de volume.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 7 | tela validada pelo Victor em 23/11/2026 ("testei, tudo passou"), com a revisão do funil e da barra de filtros; testes desativados neste ciclo |

- Marcos: entrada e saída da Qualificação em `milestones.ts` (pelo histórico de etapas).
- Cálculo: `qualificacaoMetrics.ts` (`triagemDaBase`, `saidasDaQualificacao`,
  `abordarParadas`, `saudeDoBant`, `DIAS_PARADA_EM_ABORDAR`); em `periodMetrics.ts`, filtro por
  tipo de conta, métricas `movidas` e `para_abordar`, safra das movidas, "Tempo em
  Qualificação" no ciclo e `listHealth` com paradas, triagem e BANT; em `metricsReadings.ts`,
  a passagem "Qualificação → A abordar" (entra no gargalo); em `metrics.ts`, o recorte
  `tipo_conta` e a saída da "Cobertura da lista".
- Tela: jornada em dois grupos (Qualificação e Abordagem) e "Precisa de ação" com A abordar
  parado e BANT abaixo da meta (`OverviewTab`); "Triagem da base" com link para "Retomar"
  (`EffortTab`, `?relacao=retomar` na Base); saídas da Qualificação e saúde do BANT
  (`ConversionTab`); recorte por tipo de conta (`ChannelsTab`); filtro de tipo de conta
  (`MetricsFilterBar`); "Como contamos" atualizado (`MethodSheet`).
- Dados: decisões da Base e evidências de BANT lidas para as Métricas
  (`useProspectMetricsData`, `fetchDecisoesParaMetricas`, `fetchEvidenciasBantDoTenant`).
- MCP: `get_prospecting_metrics` com filtro `tipo_conta`, `corte: tipo_conta` e as seções de
  Qualificação, triagem, saídas e BANT (`apps/mcp-prospeccao/src/metricas.ts`, `data.ts`);
  pacote gerado sem erro.
- Em 23/11/2026, o banco de produção não tinha nenhuma entrada em Qualificação registrada nem
  decisão da Base: os números novos começam em zero até haver uso.
