# US-0003 — Filtrar as empresas pelo que importa para a Origami

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** —
- **Relacionadas:** US-0001, US-0002, US-0004, US-0006

## Descrição

**Como** pessoa do comercial,
**quero** filtrar a base por atividade, tamanho, idade, local e saúde fiscal,
**para** chegar às empresas com o perfil que a Origami atende.

### Contexto

A base tem mais de 3 milhões de matrizes ativas. Sem filtro, a lista não serve para
decidir nada. Os filtros saem do que as tabelas da base informam.

### Escopo

- Inclui os filtros abaixo, sem contagem por opção:
  - **Atividade:** Indústria de transformação, Extrativa, Tecnologia, Engenharia e
    P&D, mais um campo para CNAE ou descrição;
  - **Idade da empresa:** até 3 anos, 3 a 10, 10 a 20, 20 a 40, mais de 40;
  - **Faturamento estimado:** abaixo de R$ 10 mi, Satélite (R$ 10 a 100 mi), Ponte
    (R$ 100 a 300 mi) e Âncora (acima de R$ 300 mi) (US-0006, US-0016);
  - **Distância de Formiga:** até 50, 100, 200, 300 e 500 km (US-0015);
  - **Ramo da indústria:** divisões do CNAE;
  - **Estado;**
  - **Funcionários (RAIS):** 20 a 49, 50 a 99, 100 a 249, 250 a 499, 500 ou mais;
  - **Capital social mínimo;**
  - **Natureza jurídica:** Limitada, S.A. fechada, S.A. aberta, outras;
  - **Dívida ativa:** qualquer, sem dívida, sem dívida ajuizada, com dívida;
  - **Contato público:** tem e-mail, tem telefone.
- Inclui: "Limpar" zera todos os filtros; o botão "Filtros" mostra quantos estão ativos.
- Não inclui: salvar filtro (US-0013); filtrar por sócio.

## Critérios de aceite

**Cenário 1: combinar filtros**

- **Dado** que marco Indústria de transformação e "50 a 99" funcionários;
- **Então** a lista mostra só as empresas que atendem aos dois;
- **E** dentro de um mesmo filtro, marcar duas opções soma as empresas das duas.

**Cenário 2: total da lista**

- **Dado** filtros aplicados;
- **Então** a linha do total mostra quantas empresas a lista tem;
- **E** as opções de filtro não mostram contagem.

**Cenário 3: nada encontrado**

- **Dado** uma combinação sem empresas;
- **Então** vejo "Nenhuma empresa com esses filtros" e um botão para limpar os filtros.

**Cenário 4: limpar**

- **Quando** clico em "Limpar";
- **Então** todos os filtros voltam ao vazio e a contagem do botão "Filtros" some.

**Cenário 5: abrir com o último filtro**

- **Dado** que usei a tela antes;
- **Quando** volto a ela;
- **Então** a lista abre com os filtros que deixei da última vez;
- **E** no primeiro acesso, ou num navegador novo, ela abre com "Indústria de
  transformação" marcado.

**Cenário 6: filtro ativo com o painel fechado**

- **Dado** que tenho três filtros ativos e o painel recolhido;
- **Então** o botão "Filtros" mostra 3.

## Decisões (Victor Couto, 2026-11-16)

- Idade da empresa é um filtro próprio, com faixas.
- Situação, matriz e porte não são filtros: a base já vem recortada.
- As opções de filtro não mostram contagem; só o total da lista aparece.
- O filtro de faturamento usa as faixas do tipo de conta; entra o filtro de distância
  de Formiga.
- A tela abre com o último filtro usado pela pessoa; no primeiro acesso, com
  "Indústria de transformação". O último filtro fica guardado no navegador.

## Pontos em aberto

### Hipóteses para validar

- As faixas de funcionários e de idade servem para o time. Origem: protótipo.
- O campo de CNAE aceita código parcial (ex.: "2062") ou palavra da descrição.
  Origem: protótipo.

### Provocações para produto

- Idade dos sócios não entra: a base tem faixa etária, mas o ADR-0041 proíbe usá-la —
  impacto possível: alguém pedir o filtro depois; exige novo ADR.

## Contexto técnico

- **Objetivo observável:** filtros à direita da lista, com contagens por opção.
- **Termos do domínio:** divisão do CNAE (dois primeiros dígitos), indústria extrativa
  05–09 e de transformação 10–33 — fonte: `src/lib/prospecting/industria.ts`.
- **Comportamento atual:** NÃO LOCALIZADO — não existe filtro sobre a base hoje.
- **Restrições e padrões aplicáveis:** divisões e nomes de ramo já estão em
  `industria.ts`, reaproveitar; regras multi-etapa em helper compartilhado — fonte:
  `../../../boundaries.md`.
- **Riscos para investigar:** o total exato com filtros combinados na base inteira (US-0001).
- **Provas esperadas:** teste da combinação de filtros (E entre filtros, OU dentro
  do filtro); estado vazio; contador do botão; abrir com o último filtro.
- **Fora do escopo:** filtro por sócio, filtro por filial.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
