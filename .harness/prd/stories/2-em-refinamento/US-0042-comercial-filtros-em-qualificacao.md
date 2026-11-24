# US-0042 — Filtros na aba "Em qualificação" para decidir quem analisar primeiro

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0014, US-0022, US-0023, US-0040, US-0041

## Descrição

**Como** pessoa do comercial,
**quero** filtrar e ordenar as empresas em qualificação por segmento, distância, cidade, tipo
de conta, fit e BANT,
**para** decidir quem analisar primeiro sem percorrer a lista inteira.

### Contexto

Pedido do Victor (24/11/2026). A aba "Em qualificação" (US-0023) é uma tabela ordenada pela nota
do BANT, sem filtros. Com o volume que a Base gera, o comercial precisa recortar: um segmento,
uma região, um serviço.

### Escopo

- Inclui: filtros na aba, no mesmo padrão da Base (ícone de filtros, contagem, painel):
  - **segmento:** setor e ramo da atividade (incluir e tirar, US-0041);
  - **região:** estado, cidade e distância de Formiga (US-0040);
  - **conta:** tipo de conta (Âncora, Ponte, Satélite, sem tipo) e faixa de faturamento;
  - **serviço:** fit mínimo num serviço (US-0014), ex.: "Lei do Bem 60 ou mais";
  - **BANT:** nota mínima e "com propostas da IA esperando";
  - **responsável** e **há quanto tempo** está em qualificação.
- Inclui: busca por nome, CNPJ ou cidade.
- Inclui: ordenar por qualquer coluna (BANT, fit de cada serviço, faturamento, distância, desde).
- Inclui: os filtros guardados no navegador.
- Não inclui: filtros salvos para o time (US-0013).

## Critérios de aceite

**Cenário 1: recortar por região e serviço**

- **Quando** filtro "até 200 km" e "Lei do Bem 60 ou mais";
- **Então** vejo só as empresas em qualificação que atendem aos dois, e a aba mostra quantas.

**Cenário 2: quem está parado**

- **Quando** filtro "em qualificação há mais de 15 dias" e ordeno por "desde";
- **Então** vejo primeiro as mais antigas.

**Cenário 3: limpar**

- **Quando** uso "Limpar";
- **Então** volto à lista inteira, ordenada pelo BANT.

## Pontos em aberto

### Decisões pendentes

- **Quais filtros entram primeiro** (todos os da lista, ou um recorte inicial: segmento,
  distância, cidade, tipo de conta e fit)?
- **Dados da Receita no Pulse:** segmento e cidade vêm da Receita gravada na empresa; distância
  vem do retrato da Base (US-0014). Empresa sem retrato fica fora do filtro de distância ou
  aparece como "sem distância"?

## Contexto técnico

- **Comportamento atual:** PROVADO — `EmQualificacao.tsx` e `useEmQualificacao`
  (`src/components/prospeccao/qualificacao/`), lista do tenant em memória (volume pequeno),
  ordenada pela nota do BANT (`useBantDoQuadro`).
- **Mudanças:** filtro e ordem na própria tela (sem ida ao servidor), reaproveitando os
  componentes do painel da Base; depende do retrato da Base (US-0014) para distância e fit.
- **Restrições:** tokens do tema, acessibilidade dos controles, nomes Oportunidade/Pipeline.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
