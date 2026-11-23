# US-0011 — Acompanhar a classificação pelas abas e desfazer

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 4
- **Aprovada por / em:** —
- **Relacionadas:** US-0008, US-0010

## Descrição

**Como** pessoa do comercial,
**quero** ver as empresas separadas pela decisão que o time tomou,
**para** focar no que falta avaliar e revisar o que já foi decidido.

### Escopo

- Inclui: abas "A classificar", "Oportunidades abertas", "Não agora", "Descartadas" e
  "Na Prospecção"; Desfazer nas abas de decisão; a aba "Na Prospecção" lista as
  contas da Prospecção, com os filtros da tela atual (US-0002).
- Não inclui: relatório de produtividade da triagem.

## Critérios de aceite

**Cenário 1: abas com contagem**

- **Dado** filtros ativos;
- **Então** "Oportunidades abertas", "Não agora", "Descartadas" e "Na Prospecção"
  mostram quantas empresas daquele filtro estão nelas;
- **E** "A classificar" não mostra contagem, porque o total já aparece acima da tabela.

**Cenário 2: conta na Prospecção**

- **Dado** uma empresa com oportunidade em andamento aberta por qualquer caminho;
- **Então** ela aparece em "Na Prospecção", com a etapa e o responsável;
- **E** não aparece em "A classificar".

**Cenário 3: conta conhecida volta à triagem**

- **Dado** uma conta da Prospecção sem oportunidade em andamento;
- **Então** ela aparece em "A classificar", marcada como já conhecida;
- **E** não aparece se a última perda dela foi "Pediu para parar".

**Cenário 4: aba sem empresas**

- **Dado** uma aba vazia;
- **Então** vejo que as empresas classificadas aparecem ali.

## Decisões (Victor Couto, 2026-11-16)

- Conta da Prospecção sem oportunidade em andamento aparece em "A classificar",
  marcada como já conhecida, menos quando a última perda foi "Pediu para parar".
- Todas as abas mostram contagem, menos "A classificar".

## Pontos em aberto

### Decisões pendentes

- O Victor indicou em 18/11/2026 (refino da US-0015) que a aba "Na Prospecção" vai sair: a
  tela fica com "A classificar" e depois "A abordar". Rever as abas, os cenários 1 a 3 e a
  relação com o Pipeline no refinamento desta história.


### Hipóteses para validar

- "Oportunidades abertas" mostra as abertas por esta tela; as abertas por outros
  caminhos ficam só em "Na Prospecção". Origem: protótipo.



## Contexto técnico

- **Comportamento atual:** PROVADO — a regra atual de "posso abordar?" mora em
  `companyProspectStatus` (`src/lib/prospecting/companyStatus.ts`).
- **Provas esperadas:** contagem por aba com filtros; empresa do Pipeline fora de
  "A classificar".
- **Fora do escopo:** métricas da triagem.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
