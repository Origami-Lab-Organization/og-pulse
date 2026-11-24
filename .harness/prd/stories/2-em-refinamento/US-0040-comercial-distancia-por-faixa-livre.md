# US-0040 — Distância de Formiga escolhida pela pessoa

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0003, US-0015, US-0042

## Descrição

**Como** pessoa do comercial,
**quero** escolher a distância máxima de Formiga numa barra (ou digitando os km),
**para** recortar a região que faz sentido para a conta, e não só as faixas fixas.

### Contexto

Pedido do Victor (24/11/2026), validando a tela Empresas. Hoje o filtro "Distância de Formiga"
tem faixas fixas: qualquer, até 50, 100, 200, 300 ou 500 km (US-0015). A distância já está
calculada para cada empresa da Base (`distancia_km`, em linha reta até a sede do município).

### Escopo

- Inclui: no painel de filtros da Base, uma barra deslizante de distância máxima, com o valor
  em km ao lado num campo que também aceita digitar; "Qualquer" limpa o filtro.
- Inclui: o mesmo controle no filtro da aba "Em qualificação" (US-0042).
- Inclui: o filtro guardado no navegador aceita o valor escolhido; os guardados antigos (50,
  100…) continuam valendo.
- Não inclui: distância por estrada ou tempo de viagem; distância mínima (faixa de–até).

## Critérios de aceite

**Cenário 1: escolher pela barra**

- **Quando** arrasto a barra até 180 km;
- **Então** a lista mostra só empresas até 180 km de Formiga, e o campo mostra "180".

**Cenário 2: digitar**

- **Quando** digito 75 no campo;
- **Então** a barra vai para 75 e a lista filtra até 75 km.

**Cenário 3: limpar**

- **Quando** uso "Qualquer";
- **Então** o filtro de distância some.

## Pontos em aberto

### Decisões pendentes

- **Limites e passo da barra.** Proposta: de 10 a 1.000 km, de 10 em 10; o campo aceita de 1 a
  3.000 km.
- **Distância mínima também** (faixa "de 100 a 300 km")? Proposta: não agora.

## Contexto técnico

- **Comportamento atual:** PROVADO — opções fixas em `DISTANCIAS`
  (`src/lib/prospecting/filtrosReceita.ts`) e validadas na Edge Function `empresas-receita`
  (`DISTANCIAS`, conjunto fechado); condição `e.distancia_km <= $n`.
- **Mudanças:** a Edge Function aceita um inteiro dentro dos limites (continua parâmetro, nunca
  SQL montado); sem mudança no banco.
- **Restrições:** acessibilidade da barra (teclado, rótulo), tokens do tema.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
