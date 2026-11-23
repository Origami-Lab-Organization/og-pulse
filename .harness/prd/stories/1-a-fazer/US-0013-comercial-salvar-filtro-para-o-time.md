# US-0013 — Salvar um filtro para o time

- **Status:** A fazer
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** depois
- **Aprovada por / em:** —
- **Relacionadas:** US-0003

## Descrição

**Como** pessoa do comercial,
**quero** salvar uma combinação de filtros com um nome,
**para** que o time volte à mesma lista sem refazer os filtros.

### Escopo

- Inclui: botão "Salvar" no painel de filtros; filtros salvos no topo da tela.
- Não inclui: alertas de empresas novas que entram num filtro salvo.

## Critérios de aceite

**Cenário 1: salvar e usar**

- **Quando** salvo os filtros com um nome;
- **Então** o filtro aparece para o time e, ao escolhê-lo, a lista aplica os mesmos filtros.

## Pontos em aberto

### Decisões pendentes

- **O filtro salvo é do time ou de quem salvou?**
- **Quem pode renomear ou apagar** um filtro salvo por outra pessoa?

## Contexto técnico

- **Comportamento atual:** NÃO LOCALIZADO — não existe filtro salvo no Pulse.
- **Restrições e padrões aplicáveis:** dado novo com RLS por tenant — fonte:
  `../../../boundaries.md`.
- **Fora do escopo:** alertas.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
