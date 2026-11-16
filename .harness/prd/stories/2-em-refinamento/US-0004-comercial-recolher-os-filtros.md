# US-0004 — Recolher os filtros para ver mais da lista

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** —
- **Relacionadas:** US-0003

## Descrição

**Como** pessoa do comercial,
**quero** recolher o painel de filtros depois de defini-los,
**para** ver mais colunas e mais empresas de uma vez.

### Contexto

Pedido do Victor em 2026-11-16: o título e os filtros tomavam boa parte da tela antes
de aparecer a primeira empresa.

### Escopo

- Inclui: painel de filtros à direita; botão "Filtros" na barra da lista e botão de
  recolher no próprio painel; a tela lembra a escolha; no celular o painel abre por
  cima da lista.
- Não inclui: mudar a casca do Pulse.

## Critérios de aceite

**Cenário 1: recolher**

- **Dado** que o painel está aberto;
- **Quando** clico no botão de recolher do painel ou em "Filtros";
- **Então** o painel some e a lista ocupa toda a largura;
- **E** os filtros continuam aplicados.

**Cenário 2: reabrir**

- **Quando** clico em "Filtros";
- **Então** o painel volta com os filtros como estavam.

**Cenário 3: lembrar**

- **Dado** que recolhi o painel;
- **Quando** volto à tela outro dia, no mesmo navegador;
- **Então** o painel continua recolhido.

**Cenário 4: celular**

- **Dado** uma tela estreita;
- **Então** o painel começa fechado e abre por cima da lista;
- **E** fecha com Esc ou com o botão de recolher.

## Decisões (Victor Couto, 2026-11-16)

- Filtros à direita e recolhíveis.

## Contexto técnico

- **Objetivo observável:** painel recolhível com estado lembrado por pessoa e navegador.
- **Restrições e padrões aplicáveis:** foco visível e Esc para fechar; botão com
  `aria-expanded` — fonte: `../../../patterns/design-system.md`.
- **Provas esperadas:** teste de abrir, recolher e lembrar; foco volta ao botão
  "Filtros" ao recolher.
- **Fora do escopo:** guardar a escolha no servidor.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
