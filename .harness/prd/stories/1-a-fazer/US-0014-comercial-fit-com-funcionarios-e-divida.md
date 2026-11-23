# US-0014 — Nota de fit considera funcionários e dívida ativa

- **Status:** A fazer
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** depois
- **Aprovada por / em:** —
- **Relacionadas:** US-0007, ADR-0042

## Descrição

**Como** pessoa do comercial,
**quero** que a nota de fit use o número de funcionários e a dívida ativa,
**para** que a ordem da lista separe de verdade as melhores contas.

### Contexto

A base só tem médias e grandes empresas, e não traz regime tributário nem lê o site.
Com as regras atuais, quase toda indústria com mais de 5 anos tira a mesma nota. A
ordenação pelo fit, que é a ordem padrão da tela, perde o sentido.

### Escopo

- Inclui: novos pontos na nota de fit, cada um com o motivo, como as regras atuais.
- Não inclui: IA na nota (ADR-0042).

## Critérios de aceite

> A escrever quando os pesos forem decididos.

## Pontos em aberto

### Decisões pendentes

- **Funcionários e dívida ativa entram na nota?** Muda a regra do ADR-0042 e pede ADR
  novo, porque a nota também vale para as empresas que já estão na Prospecção.
- **Pesos por frente.** Exemplo a validar: dívida ajuizada tira pontos de
  Financiamento de inovação; mais funcionários somam em Consultoria.

## Contexto técnico

- **Comportamento atual:** PROVADO — regras em `src/lib/prospecting/fit.ts`; o
  faturamento não entra na nota (glossário).
- **Restrições e padrões aplicáveis:** regra explícita, sem IA, cada ponto com motivo —
  fonte: ADR-0042; o MCP da Prospecção importa os mesmos módulos.
- **Fora do escopo:** faturamento estimado na nota.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
