# US-0009 — Abrir oportunidades em lote

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0008

## Descrição

**Como** pessoa do comercial,
**quero** selecionar várias empresas e abrir oportunidade para todas com um responsável,
**para** montar a lista da semana de um analista sem abrir uma por uma.

### Escopo

- Inclui: caixa de seleção por linha e "selecionar todas as visíveis"; barra com a
  quantidade selecionada, o responsável e o botão "Abrir oportunidades"; Limpar seleção.
- Não inclui: descartar ou marcar "Não agora" em lote.

## Critérios de aceite

**Cenário 1: abrir em lote**

- **Dado** que selecionei três empresas;
- **Quando** escolho o responsável e clico em "Abrir oportunidades";
- **Então** as três entram em A abordar com aquele responsável;
- **E** vejo uma mensagem única com Desfazer.

**Cenário 2: quem não pode ser selecionada**

- **Dado** uma empresa já no Pipeline ou já classificada;
- **Então** a caixa de seleção dela fica desabilitada.

**Cenário 3: falha parcial**

- **Dado** que uma das empresas não pôde ser aberta;
- **Então** vejo quais abriram e quais não, e por quê.

## Decisões (Victor Couto, 2026-11-16)

- O lote usa a alavanca "Base da Receita", como o botão rápido (US-0008).

## Pontos em aberto

### Decisões pendentes

- **Limite de empresas por lote.** Cada abertura consulta o regime na Receita, e a
  reserva CNPJá aceita poucas consultas por minuto.


## Contexto técnico

- **Comportamento atual:** PROVADO — a importação em lote de CNPJs já espera e tenta de
  novo quando a CNPJá devolve 429 (`../../../integrations/brasilapi-cnpj.md`).
- **Provas esperadas:** lote com sucesso; seleção desabilitada; falha parcial.
- **Fora do escopo:** outras ações em lote.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
