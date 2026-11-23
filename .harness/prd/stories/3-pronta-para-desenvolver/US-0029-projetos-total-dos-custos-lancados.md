# US-0029 — Ver o total dos custos lançados

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 5
- **Aprovada por / em:** Victor Couto, 23/11/2026
- **Relacionadas:** US-0025

## Descrição

**Como** GP ou admin com `financeiro:ler`,
**quero** ver no fim da lista de Custos da aba Despesas a soma do planejado e do realizado,
**para** saber quanto o projeto já gastou com fornecedores, viagens e demais custos sem
somar linha a linha.

### Contexto

A lista Custos mostra cada lançamento com Planejado e Realizado, mas nenhum total. No
Paraíso, para saber que as cinco viagens somam R$ 1.083,60 é preciso fazer a conta à mão.

### Escopo

- Inclui: linha de total ao fim da lista, com a soma do Planejado e a do Realizado.
- Não inclui: mão de obra (tem seção própria); total por mês.

## Critérios de aceite

**Cenário 1: total da lista**

- **Dado** um projeto com custos lançados;
- **Quando** abro a lista Custos;
- **Então** vejo ao fim uma linha Total com a soma do Planejado e a do Realizado;
- **E** no Paraíso essa linha mostra R$ 1.083,60 e R$ 1.083,60.

**Cenário 2: o total é sempre geral**

- **Dado** a lista filtrada por um tipo (ex.: Viagem);
- **Quando** olho a linha Total;
- **Então** ela continua somando todos os custos do projeto, de todos os tipos;
- **E** o rótulo deixa claro que é o total geral, não o total do filtro.

**Cenário 3: projeto sem custos**

- **Dado** um projeto sem custos lançados;
- **Quando** abro a lista;
- **Então** não aparece linha de total.

## Decisões (Victor Couto, 23/11/2026)

- O total é sempre geral: não acompanha o filtro de tipo.

## Pontos em aberto

### Hipóteses para validar

- Custo em moeda estrangeira entra no total pelo valor em BRL, como já acontece nos
  cards.

## Contexto técnico

- **Comportamento atual:** PROVADO — `ProjectCostsLedger.tsx` lista `projectCosts` com
  filtro por tipo e não tem rodapé.
- **Restrições:** valores em BRL (`planned_amount_brl`, `actual_amount_brl`, ADR-0003);
  truncados, sem arredondar (ADR-0011); Design System Origami; respeitar
  `useMaskedCurrency` (ocultar valores).
- **Provas esperadas:** os três cenários, inclusive com valores ocultos.
- **Fora do escopo:** mão de obra.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
