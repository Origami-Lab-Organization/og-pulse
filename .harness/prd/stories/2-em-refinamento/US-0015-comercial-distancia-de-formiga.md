# US-0015 — Filtrar e ordenar pela distância de Formiga

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** —
- **Relacionadas:** US-0001, US-0003, US-0017, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** ver a que distância de Formiga cada empresa está, e filtrar por isso,
**para** priorizar contas que dá para visitar.

### Contexto

A proximidade com Formiga (MG), sede da Origami, pesa na escolha de quem abordar. Hoje
isso vive no "Anel" da empresa, um texto livre preenchido à mão. A distância passa a ser
calculada para toda empresa e substitui o Anel (US-0017).

### Escopo

- Inclui: coluna "Distância" na lista da base, em km; ordenar por distância; filtro com
  faixas fixas; a distância também nas contas da aba "Na Prospecção".
- Não inclui: distância por estrada; outro ponto de partida que não Formiga.

## Critérios de aceite

**Cenário 1: distância na lista**

- **Dado** uma empresa da base;
- **Então** vejo a distância em km, em linha reta, do centro de Formiga ao centro da
  cidade da empresa.

**Cenário 2: filtrar**

- **Quando** escolho "até 100 km";
- **Então** a lista mostra só as empresas de cidades a até 100 km de Formiga.
- As faixas são: até 50 km, até 100 km, até 200 km, até 300 km e até 500 km.

**Cenário 3: ordenar**

- **Quando** ordeno por distância;
- **Então** as empresas mais próximas aparecem primeiro; um segundo clique inverte.

**Cenário 4: contas da Prospecção**

- **Dado** uma conta na aba "Na Prospecção" com cidade conhecida;
- **Então** vejo a distância dela também, inclusive se ela não estiver na base.

**Cenário 5: sem cidade**

- **Dado** uma empresa sem cidade reconhecida;
- **Então** a distância aparece como "—" e a empresa não entra em nenhuma faixa do filtro.

## Decisões (Victor Couto, 2026-11-16)

- Distância em linha reta, por cidade, com as coordenadas oficiais do IBGE.
- Filtro com faixas fixas de 50, 100, 200, 300 e 500 km; a distância também é coluna
  e ordenação.
- A distância de Formiga substitui o Anel.

## Pontos em aberto

### Hipóteses para validar

- "Em linha reta" basta para decidir visita. Origem: decisão de 2026-11-16; por estrada,
  a distância costuma ser de 20% a 40% maior.

## Contexto técnico

- **Objetivo observável:** coluna, filtro e ordem por distância de Formiga.
- **Comportamento atual:** PROVADO — a base da VPS guarda o município pelo código da
  Receita (código TOM do Tesouro; Formiga = 4521), sem coordenadas. A tabela `municipios`
  tem 5.572 códigos.
- **Superfícies conhecidas:** carga em `scripts/receita/sincronizar-base.ts`; tabela
  `pulse.empresas` na VPS (ADR-0053); contas da Prospecção em `prospect_companies.receita` (endereço com
  município e UF).
- **Riscos para investigar:** fonte pública que liga o código TOM ao código do IBGE e às
  coordenadas da sede do município, com a fonte citada no contrato
  (`../../../integrations/base-receita-vps.md`); municípios novos ou renomeados.
- **Provas esperadas:** distância de três cidades conferida à mão; filtro e ordem;
  empresa sem cidade; conta da Prospecção fora da base.
- **Fora do escopo:** rotas, mapa.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
