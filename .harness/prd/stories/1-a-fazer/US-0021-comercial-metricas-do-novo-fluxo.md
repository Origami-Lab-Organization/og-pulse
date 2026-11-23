# US-0021 — Ajustar as Métricas ao novo fluxo de abordagem

- **Status:** A fazer
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 4
- **Aprovada por / em:** —
- **Relacionadas:** US-0008, US-0019, US-0020, ADR-0040

## Descrição

**Como** pessoa do comercial,
**quero** que as Métricas reflitam o fluxo novo (filtrar a base → mover para abordar com o
tipo de conta → estudar a conta → abordar),
**para** acompanhar a cobertura e o andamento sem depender da lista de contas que saiu.

### Contexto

Em 18/11/2026 a tela Empresas virou só o filtro da base da Receita, sem abas, e a lista de
contas cadastradas saiu (US-0008; US-0011 arquivada). As Métricas ainda falam em "contas
cadastradas nunca abordadas" e "cobertura da lista", com base nas empresas cadastradas na
Prospecção; o link "Ver contas" das duas telas foi retirado no mesmo dia, a pedido do Victor,
até esta revisão.

### Escopo (rascunho, a refinar)

- Rever "Cobertura da lista" (aba Esforço) e "contas cadastradas nunca abordadas" (Visão
  geral): o que é a "lista" agora — a base filtrada, as empresas movidas para abordar, ou
  as cadastradas.
- Métricas novas possíveis: empresas movidas para abordar no período, por tipo de conta
  (Âncora, Ponte, Satélite) e por responsável; tempo em A abordar; contas estudadas
  (US-0020).
- Para onde levam os atalhos das Métricas, sem a lista de contas.

## Pontos em aberto

### Decisões pendentes

- Quais métricas de cobertura continuam e qual a base de cada uma.
- Se o tipo de conta vira corte (filtro) das Métricas.

## Contexto técnico

- **Comportamento atual:** PROVADO — `AccountCoverage` e `nuncaAbordadas` em
  `src/lib/prospecting/metrics.ts`, exibidos em `metrics/EffortTab.tsx` e
  `metrics/OverviewTab.tsx`; o MCP também lê as Métricas (`get_prospecting_metrics`,
  TD-0022).
- **Fora do escopo:** mover para abordar (US-0008); relacionamento (US-0019); estudo da
  conta (US-0020).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
