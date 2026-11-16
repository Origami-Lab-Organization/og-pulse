# US-0017 — Anel e Tier saem da Prospecção

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 4
- **Aprovada por / em:** —
- **Relacionadas:** US-0002, US-0015, US-0016, TD-0022

## Descrição

**Como** pessoa do comercial,
**quero** que a empresa deixe de ter Anel e Tier,
**para** segmentar as contas só pela distância de Formiga e pelo tipo de conta.

### Contexto

Anel (proximidade) e Tier (porte e prioridade) são textos livres preenchidos à mão. A
distância de Formiga (US-0015) e o tipo de conta (US-0016) fazem o mesmo papel, com
regra e lista fechada.

### Escopo

- Inclui: tirar Anel e Tier da tabela e dos filtros da aba "Na Prospecção", da ficha da
  empresa, do cartão da oportunidade e do MCP da Prospecção; tirar as colunas do banco
  num deploy seguinte, depois de o frontend novo estar no ar.
- Não inclui: distância e tipo de conta em si (US-0015 e US-0016).

## Critérios de aceite

**Cenário 1: some da tela**

- **Dado** que a US-0015 e a US-0016 estão no ar;
- **Então** nenhuma tela mostra Anel ou Tier;
- **E** a aba "Na Prospecção" filtra por distância e por tipo de conta no lugar deles.

**Cenário 2: some do chat**

- **Então** o MCP da Prospecção deixa de pedir, mostrar e gravar Anel e Tier.

## Decisões (Victor Couto, 2026-11-16)

- Anel e Tier vão sumir; a segmentação passa a ser a distância de Formiga e o tipo de conta.

## Pontos em aberto

### Decisões pendentes

- **O que fazer com os valores já preenchidos.** Converter o Tier atual em tipo de conta
  onde der, guardar uma cópia antes de apagar, ou só apagar.
- **Ordem de saída.** Anel e Tier só saem depois que a distância e o tipo de conta estiverem
  no ar, para a aba "Na Prospecção" não ficar sem segmentação no meio do caminho.

## Contexto técnico

- **Comportamento atual:** PROVADO — `prospect_companies.ring` e `.tier` (glossário,
  "Anel e Tier"); colunas Anel e Tier em `CompanyTable`; facetas em `COMPANY_FACETS`;
  ficha em `CompanyDetailDialog`; o MCP da Prospecção lista "Anel e Tier da empresa são
  texto livre" e grava os dois.
- **Restrições e padrões aplicáveis:** remover coluna que o frontend lê exige dois deploys,
  expandir e depois contrair — fonte: `../../../ai-review-checklist.md`; tela e MCP mudam
  juntos — fonte: TD-0022; o seed do tenant demo também grava os campos.
- **Riscos para investigar:** o MCP instalado nas máquinas do time continua gravando Anel e
  Tier até ser atualizado.
- **Provas esperadas:** telas sem Anel e Tier; MCP sem os campos; banco sem as colunas no
  segundo deploy.
- **Fora do escopo:** —

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
