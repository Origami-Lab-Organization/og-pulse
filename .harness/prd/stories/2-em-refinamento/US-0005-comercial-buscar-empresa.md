# US-0005 — Buscar empresa por nome, CNPJ ou cidade

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** —
- **Relacionadas:** US-0001, US-0003

## Descrição

**Como** pessoa do comercial,
**quero** buscar uma empresa pelo nome, pelo CNPJ ou pela cidade,
**para** achar uma conta específica que alguém me indicou.

### Escopo

- Inclui: campo de busca na barra da lista; busca por razão social, nome fantasia,
  CNPJ (com ou sem pontuação) e cidade; a busca respeita os filtros ativos.
- Não inclui: busca por nome de sócio.

## Critérios de aceite

**Cenário 1: por nome**

- **Quando** digito parte do nome fantasia ou da razão social;
- **Então** a lista mostra as empresas que contêm o texto, sem diferenciar maiúsculas
  nem acentos.

**Cenário 2: por CNPJ**

- **Quando** digito o CNPJ, com ou sem pontuação;
- **Então** a lista mostra a empresa daquele CNPJ.

**Cenário 3: nome com filtros**

- **Dado** filtros ativos;
- **Quando** busco pelo nome uma empresa que não atende aos filtros;
- **Então** vejo o estado vazio com a opção de limpar os filtros.

**Cenário 4: CNPJ completo ignora os filtros**

- **Dado** filtros ativos;
- **Quando** digito um CNPJ completo de uma empresa fora dos filtros;
- **Então** a lista mostra essa empresa;
- **E** avisa que os filtros foram ignorados nesta busca.

## Decisões (Victor Couto, 2026-11-16)

- CNPJ completo na busca ignora os filtros e avisa.

## Pontos em aberto

### Hipóteses para validar

- Ignorar acentos na busca. Origem: hábito do time ao digitar.

## Contexto técnico

- **Comportamento atual:** NÃO LOCALIZADO — a base não tem índice para busca por nome
  (mapa em `../../README.md`).
- **Riscos para investigar:** busca por parte do nome em 15 milhões de razões sociais
  precisa de índice de texto (US-0001).
- **Provas esperadas:** busca por nome, por CNPJ com e sem pontuação, e com filtro ativo.
- **Fora do escopo:** busca por sócio.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
