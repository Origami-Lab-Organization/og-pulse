# US-0028 — O gráfico Planejado × Realizado mostra só os totais

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Custos do projeto
- **Prioridade:** 4
- **Aprovada por / em:** Victor Couto, 23/11/2026
- **Relacionadas:** US-0026

## Descrição

**Como** GP ou admin com `financeiro:ler`,
**quero** ver no gráfico mensal da aba Despesas só o custo planejado total e o custo
realizado total de cada mês,
**para** ler o desvio de cada mês de relance.

### Contexto

Hoje o gráfico "Planejado vs realizado por mês" tem quatro séries empilhadas: Planejado ·
MO, Planejado · Outros, Realizado · MO e Realizado · Outros. A divisão por categoria já
existe no "Breakdown por categoria" ao lado. No gráfico mensal ela polui a leitura do que
importa: quanto se planejou e quanto se gastou no mês.

### Escopo

- Inclui: o gráfico mensal com duas séries (Planejado e Realizado), legenda e tooltip.
- Não inclui: os valores e os meses do gráfico (US-0026); a rosca de categorias.

## Critérios de aceite

**Cenário 1: duas séries**

- **Dado** um projeto com mão de obra e custos do ledger;
- **Quando** abro o gráfico mensal;
- **Então** cada mês tem uma barra de Planejado e uma de Realizado, cada uma com o total
  do mês;
- **E** a legenda mostra só Planejado e Realizado.

**Cenário 2: o total bate com os cards**

- **Dado** qualquer projeto;
- **Quando** somo as barras de todos os meses;
- **Então** o Planejado é igual ao card "Custo planejado" e o Realizado ao card "Custo
  realizado".

**Cenário 3: o tooltip explica o total**

- **Dado** o gráfico mensal;
- **Quando** passo o mouse sobre um mês;
- **Então** o tooltip mostra o Planejado e o Realizado do mês;
- **E** sob cada um, a quebra entre Mão de Obra e Outros.

## Decisões (Victor Couto, 23/11/2026)

- O tooltip mantém a quebra MO / Outros sob cada total.

## Pontos em aberto

### Decisões pendentes

- ~~Clicar numa barra hoje rola até a seção da categoria.~~ Resolvido na implementação: as
  barras nunca tiveram clique; o atalho está na rosca e continua lá (ver Implementação).

## Contexto técnico

- **Comportamento atual:** PROVADO — `ProjectMonthlyCostChart.tsx` recebe `planned`,
  `realized` e `breakdown` por mês de `ProjectCostsTab.tsx`, e expõe `onCategoryClick`
  para rolar até a seção.
- **Restrições:** Design System Origami (`patterns/design-system.md`), sem hex avulso;
  regras de gráfico do skill de dataviz.
- **Provas esperadas:** os três cenários.
- **Fora do escopo:** correção dos meses e valores (US-0026).

## Implementação

O gráfico mensal (`ProjectMonthlyCostChart`) passa a ter duas séries, Planejado e Realizado,
com o total do mês (mão de obra + ledger). O tooltip mantém a quebra MO / Outros sob cada
total.

Sobre o clique na barra (ponto que estava em aberto): na implementação atual as barras não
têm clique; o atalho para a seção de Mão de Obra ou para a lista de Custos está só na rosca e
na legenda dela, e continua lá. Nada muda nesse comportamento.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Pendente: conferir na tela (duas barras por mês e legenda só com Planejado e Realizado). |
| 2 | Por construção: cada barra é o total do mês da US-0026, cuja soma é igual aos cards. Falta conferir na tela. |
| 3 | Pendente: conferir o tooltip na tela. |

Testes automatizados não escritos: testes desativados no Harness por decisão do time.
