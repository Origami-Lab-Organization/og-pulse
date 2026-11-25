# US-0048 — Filtrar e ver projetos por linha e por serviço

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Catálogo e formas de receita (épico 1 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 3 do roadmap
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("ok, pode abrir o PR")
- **Depende de:** US-0046
- **Relacionadas:** US-0035, US-0036, US-0046

## Descrição

**Como** admin, GP ou pessoa do comercial,
**quero** filtrar e ver os projetos pela linha de serviço, pelo serviço ou pelos dois,
**para** acompanhar o portfólio e os resultados de Projetos, Fomento e Governo separadamente, sem
perder o histórico dos serviços antigos.

### Contexto

Hoje o Pulse chama de "Linha de Serviço" o que é, na verdade, o serviço:

- o filtro "Todas as linhas" do Portfólio lista os serviços ativos;
- a coluna "Linha de Serviço" da lista de projetos e a dimensão "Linha de Serviço" dos relatórios
  mostram o serviço;
- como o filtro só lista serviços ativos, desativar os serviços antigos (US-0046) faria os
  projetos encerrados sumirem do filtro.

Com o catálogo de 2027, a mesma palavra tem dois níveis: a linha (Projetos, Fomento, Governo) e o
serviço (por exemplo, Dev. de Software, que existe em Projetos e em Governo).

Decisão de 24/11/2026 (Victor Couto): o filtro pode ser por serviço sozinho ou junto com a linha.

### Escopo

- Inclui:
  - filtros de linha e de serviço no Portfólio, na lista de projetos e nos relatórios
    (Analytics);
  - mostrar "Linha › Serviço" onde hoje aparece a "Linha de Serviço";
  - serviços e linhas desativados disponíveis no filtro, separados dos ativos.
- Não inclui:
  - filtros da Prospecção (o fit tem filtro próprio, US-0047);
  - trocar o serviço dos projetos ativos (de-para, épico 5).

## Critérios de aceite

**Cenário 1: filtrar por linha**

- **Dado** o Portfólio, a lista de projetos ou os relatórios;
- **Quando** escolho a linha "Fomento";
- **Então** vejo só os projetos de serviços dessa linha;
- **E** o filtro de serviço passa a listar só os serviços de Fomento.

**Cenário 2: filtrar por serviço sozinho**

- **Dado** o filtro de serviço, sem linha escolhida;
- **Quando** escolho "Dev. de Software";
- **Então** vejo os projetos de Dev. de Software de todas as linhas (Projetos e Governo).

**Cenário 3: linha e serviço juntos**

- **Dado** a linha "Governo" escolhida;
- **Quando** escolho "Dev. de Software";
- **Então** vejo só os projetos de Governo › Dev. de Software.

**Cenário 4: serviços desativados no filtro**

- **Dado** serviços e linhas desativados com projetos ligados;
- **Então** eles aparecem no filtro num grupo "Desativados", depois dos ativos;
- **E** filtrar por eles mostra os projetos antigos.

**Cenário 5: linha e serviço no projeto**

- **Dado** a lista de projetos, o card do Portfólio, Meus projetos e a Visão Geral do projeto;
- **Então** o serviço aparece como "Linha › Serviço";
- **E** a coluna e a dimensão chamadas hoje "Linha de Serviço" passam a ter as duas opções
  "Linha" e "Serviço".

**Cenário 6: projeto sem serviço**

- **Dado** um projeto sem serviço;
- **Então** ele aparece como "Sem serviço" e pode ser filtrado por essa opção.

## Decisões (Victor Couto, 24/11/2026)

- O filtro pode ser por serviço sozinho ou com a linha.
- Linhas e serviços antigos ficam desativados, sem perder o rastro.

## Pontos em aberto

### Hipóteses para validar

- **Relatórios agrupam por linha e por serviço.** Nos gráficos e tabelas de Analytics, a dimensão
  "Linha de Serviço" vira duas: "Linha" (Projetos, Fomento, Governo e linhas antigas) e "Serviço"
  (sempre com a linha, para não somar Consultoria de Projetos com Consultoria de Fomento).
- **Filtro lembrado.** O Portfólio lembra a última linha e o último serviço escolhidos, como já
  faz com os outros filtros.

## Contexto técnico

- **Objetivo observável:** filtros de linha e serviço independentes e combináveis; "Linha ›
  Serviço" nas telas de projeto; desativados filtráveis.
- **Termos do domínio:** linha de serviço, serviço, desativado, "Sem serviço".
- **Comportamento atual:**
  - PROVADO: `projects.service_line` é texto e guarda o id do serviço (`services.id`); projetos
    antigos podem ter códigos fixos (`product_studio`, `financiamento_inovacao` etc.,
    `SERVICE_LINE_OPTIONS` em `src/types/serviceLine.ts`). No tenant da Origami, todos os
    projetos têm id de serviço ou nada (6 sem serviço), conferido em 25/11/2026.
  - PROVADO: o filtro do Portfólio lista `services.filter(s => s.isActive)` com o rótulo "Todas as
    linhas" (`src/components/portfolio/PortfolioFilters.tsx`) e filtra por igualdade em
    `service_line` (`src/hooks/usePortfolioProjects.ts`).
  - PROVADO: a lista de projetos mostra "Linha de Serviço" pelo rótulo fixo
    (`src/components/projects/ProjectsTable.tsx`); os relatórios agrupam por `service_line`
    (`src/hooks/useRevenueAnalytics.ts`, `OverviewPerformanceTable.tsx` e gráficos de
    `src/components/analytics/`).
- **Comportamento esperado:** cenários 1 a 6.
- **Superfícies conhecidas:** filtros do Portfólio; lista de projetos; Analytics (receita, custo,
  margem, PDF); Meus projetos; Visão Geral do projeto; planejador de alocação
  (`useAllocationPlannerData`).
- **Restrições e padrões aplicáveis:** UI no Design System; filtros seguem o padrão já usado no
  Portfólio; leitura do catálogo é tenant-wide por desenho (`catalogo:ler`, ADR-0023).
- **Riscos para investigar:**
  - `service_line` em texto com códigos antigos no tenant de demonstração;
  - relatórios em PDF (`AnalyticsPdfGenerator.ts`) com o rótulo antigo;
  - filtro salvo com o id de um serviço que mudou de linha.
- **Provas esperadas:** os cenários de filtro (linha, serviço, os dois); desativados filtráveis;
  "Sem serviço"; rótulo "Linha › Serviço" nas telas listadas.
- **Fora do escopo:** filtros da Prospecção e de-para.

## Implementação

> Preenchido ao implantar. Todo cenário aponta para a prova.

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
