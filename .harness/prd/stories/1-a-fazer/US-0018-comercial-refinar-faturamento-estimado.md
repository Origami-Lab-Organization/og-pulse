# US-0018 — Refinar o faturamento estimado

- **Status:** A fazer
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0006, US-0016, ADR-0041, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** um faturamento estimado mais próximo do real,
**para** separar Âncora, Ponte e Satélite sem errar o tipo da conta.

### Contexto

A US-0006 entregou a estimativa por funcionários da RAIS × receita por pessoa da classe da
CNAE e do porte (IBGE), combinada com o capital social a partir de R$ 10 mi. Nos 10 casos
com faturamento conhecido pelo Victor (18/11/2026), o erro mediano caiu de 4,4 para cerca de
2 vezes, mas ainda há desvios grandes para os dois lados: a Prumo sai com o dobro do real e
a Canex (trading com 1 funcionário) com um sexto. O Victor pediu para avançar e refinar
depois (18/11/2026).

### Escopo

A definir no refinamento. Caminhos levantados em 18/11/2026, em ordem de ganho esperado:

1. **Mais casos para calibrar:** de 30 a 50 empresas com faturamento conhecido pelo time,
   de setores e portes variados (de R$ 10 mi a R$ 1 bi), para pesos por setor. Hoje são 10,
   todos de empresas grandes; as companhias abertas da CVM (413) são S.A. e não têm o perfil
   da Origami.
2. **Regime tributário como limite:** Simples (até R$ 4,8 mi) já está na RAIS
   (`optante_simples_rais`) e não é usado; Lucro Presumido limitaria a estimativa a R$ 78
   mi. A Receita chegou a publicar o regime por CNPJ nos dados abertos — confirmar se o
   arquivo ainda existe (o servidor novo da Receita só abre no navegador).
3. **Funcionários informados pelo time:** a RAIS pública não traz CNPJ, e consórcios de
   obra ficam em outro CNPJ (a Prumo aparece com cerca de 2.700 funcionários em vez de mais
   de 5.000).
4. **Capital social em empresas sem RAIS:** ficou de fora porque levaria as Âncoras de 10
   mil para 35 mil (holdings e SPEs com capital alto); com mais casos, dá para separar.

Descartados: lista de exportadoras e importadoras por CNPJ (o MDIC não divulga, decisão CMRI
473/2024). Fornecedores pagos (Serasa, Econodata) também estimam; vale testá-los contra os
casos conhecidos antes de contratar.

## Critérios de aceite

A definir no refinamento. Proposta de meta: erro mediano abaixo de 1,5 vez nos casos
conhecidos pelo time, medido com cada caso fora do ajuste.

## Pontos em aberto

### Decisões pendentes

- Quais caminhos entram e em que ordem.
- Onde o time informa os casos (Prospecção, como faturamento apurado, ou lista à parte),
  sem guardar faturamento de cliente no repositório.

## Contexto técnico

- **Comportamento atual:** `src/lib/prospecting/faturamentoEstimado.ts`,
  `receitaPorPessoa.ts`, `calibracaoCapital.json` e `modeloDeFaturamento.json` (anexos da
  US-0006).
- **Fora do escopo:** faturamento apurado pelo time, que já prevalece na coluna (US-0006).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
