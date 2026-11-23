# US-0003 — Filtrar as empresas pelo que importa para a Origami

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** Victor Couto, 2026-11-17
- **Relacionadas:** US-0001, US-0002, US-0004, US-0006, US-0015

## Descrição

**Como** pessoa do comercial,
**quero** filtrar a base por atividade, tamanho, idade, local e saúde fiscal,
**para** chegar às empresas com o perfil que a Origami atende.

### Contexto

A base tem mais de 3 milhões de matrizes ativas. Sem filtro, a lista não serve para
decidir nada. Os filtros saem do que as tabelas da base informam.

A medição de 17/11/2026 mostrou que a base também guarda o que não é cliente possível:
66 mil órgãos públicos, 335 mil condomínios, 137 mil diretórios de partido, 95 mil
igrejas e 21 mil candidatos. Esses saem do recorte nesta história.

### Escopo

- Inclui o recorte novo: a carga deixa de fora administração pública (natureza 1xxx),
  condomínio edilício, organização religiosa, órgãos e comitês de partido político e
  candidato a cargo eletivo. Associações, fundações e produtor rural ficam, e o filtro de
  natureza permite tirá-los.
- Inclui os filtros abaixo, sem contagem por opção:
  - **Setor:** as 21 seções da CNAE do IBGE (Agropecuária, Indústrias extrativas, Indústria
    de transformação, Construção, Comércio, Informação e comunicação, Saúde e as demais);
  - **Ramo:** as divisões da CNAE dos setores marcados (ex.: Química, Alimentos). Sem setor
    marcado, o filtro de ramo fica vazio e explica que depende do setor;
  - **CNAE:** campo que aceita código, inteiro ou parcial (ex.: "2062"), ou palavra da
    descrição (ex.: "fertilizante"), e soma os CNAEs escolhidos;
  - **Incluir atividade secundária:** caixa que estende setor, ramo e CNAE aos CNAEs
    secundários; desmarcada por padrão;
  - **Idade da empresa:** até 3 anos, 3 a 10, 10 a 20, 20 a 40, mais de 40;
  - **Estado;**
  - **Funcionários (RAIS):** até 19, 20 a 49, 50 a 99, 100 a 249, 250 a 499, 500 ou mais,
    e "Sem informação na RAIS";
  - **Capital social mínimo:** qualquer, R$ 1 mi, R$ 10 mi, R$ 50 mi, R$ 100 mi;
  - **Natureza jurídica:** Limitada, S.A. fechada, S.A. aberta, Outras empresas,
    Associações e fundações, Pessoa física (produtor rural e outras);
  - **Dívida ativa:** escolha única entre qualquer, sem dívida, sem dívida ajuizada, com
    dívida;
  - **Contato público:** tem e-mail; tem telefone.
- Inclui: "Limpar" zera todos os filtros; o botão "Filtros" mostra quantos estão ativos.
- Não inclui: filtro de faturamento (entra na US-0006) e de distância de Formiga (entra na
  US-0015); salvar filtro (US-0013); filtrar por sócio ou filial.

## Critérios de aceite

**Cenário 1: combinar filtros**

- **Dado** que marco o setor Indústria de transformação e "50 a 99" funcionários;
- **Então** a lista mostra só as empresas que atendem aos dois;
- **E** dentro de um mesmo filtro, marcar duas opções soma as empresas das duas;
- **E** em "Contato público", marcar e-mail e telefone pede os dois.

**Cenário 2: setor, ramo e CNAE**

- **Dado** que marco o setor Indústria de transformação;
- **Então** o filtro de ramo mostra só as divisões desse setor;
- **Quando** marco o ramo Química;
- **Então** a lista mostra só as empresas de Química;
- **Quando** desmarco o setor;
- **Então** o ramo Química também sai do filtro.

**Cenário 3: atividade secundária**

- **Dado** o setor Indústria de transformação marcado;
- **Quando** marco "Incluir atividade secundária";
- **Então** a lista passa a trazer também quem tem a indústria só como atividade secundária;
- **E** essas empresas mostram "atividade secundária" junto do ramo.

**Cenário 4: sem informação na RAIS**

- **Dado** que marco "50 a 99" e "Sem informação na RAIS";
- **Então** a lista traz quem tem de 50 a 99 funcionários e quem não aparece na RAIS.

**Cenário 5: total da lista**

- **Dado** filtros aplicados;
- **Então** a lista aparece em até 2 segundos;
- **E** a linha do total mostra quantas empresas a lista tem, assim que a contagem termina;
- **E** as opções de filtro não mostram contagem.

**Cenário 6: nada encontrado**

- **Dado** uma combinação sem empresas;
- **Então** vejo "Nenhuma empresa com esses filtros" e um botão para limpar os filtros.

**Cenário 7: limpar**

- **Quando** clico em "Limpar";
- **Então** todos os filtros voltam ao vazio e a contagem do botão "Filtros" some.

**Cenário 8: abrir com o último filtro**

- **Dado** que usei a tela antes;
- **Quando** volto a ela;
- **Então** a lista abre com os filtros que deixei da última vez;
- **E** no primeiro acesso, ou num navegador novo, ela abre com o setor "Indústria de
  transformação" marcado.

**Cenário 9: filtro ativo com o painel fechado**

- **Dado** que tenho três filtros ativos e o painel recolhido;
- **Então** o botão "Filtros" mostra 3.

**Cenário 10: fora do recorte**

- **Dado** um órgão público, condomínio, igreja, diretório de partido ou candidato;
- **Então** ele não aparece na lista, com nenhum filtro.

## Decisões (Victor Couto)

- 2026-11-16: idade da empresa é um filtro próprio, com faixas.
- 2026-11-16: situação, matriz e porte não são filtros, porque a base já vem recortada.
- 2026-11-16: as opções de filtro não mostram contagem; só o total da lista aparece.
- 2026-11-16: a tela abre com o último filtro usado pela pessoa, guardado no navegador; no
  primeiro acesso, com "Indústria de transformação".
- 2026-11-17: saem do recorte órgãos públicos, condomínios, igrejas, partidos e
  candidatos. Associações e produtor rural ficam.
- 2026-11-17: os filtros de faturamento e de distância entram nas histórias deles (US-0006
  e US-0015), e não aqui.
- 2026-11-17: funcionários tem as faixas a partir de "até 19" e a opção "Sem informação na
  RAIS".
- 2026-11-17: atividade segue a CNAE do IBGE em três níveis (setor, ramo, CNAE) e cobre
  todos os tipos de atividade, não só indústria. Os grupos "Tecnologia" e "Engenharia e
  P&D" do protótipo saem.
- 2026-11-17: atividade olha o CNAE principal; a caixa "Incluir atividade secundária"
  amplia.

## Pontos em aberto

### Hipóteses para validar

- As faixas de idade e de capital social servem para o time. Origem: protótipo e proposta
  de 2026-11-17.
- A frase do total ("só matrizes ativas, médias e grandes") continua certa depois do
  recorte novo. Origem: o porte "Demais" da Receita inclui associações e produtor rural;
  revisar o texto na implementação.

### Provocações para produto

- Idade dos sócios não entra: a base tem faixa etária, mas o ADR-0041 proíbe usá-la.
  Impacto possível: alguém pedir o filtro depois, o que exige ADR novo.
- 81% da base não tem RAIS. Quem marca uma faixa de funcionários sem "Sem informação na
  RAIS" vê só cerca de 590 mil empresas. A US-0006 estima faturamento por funcionário e
  herda o mesmo buraco.

## Contexto técnico

- **Objetivo observável:** filtros à direita da lista, sem contagem por opção, e o total
  da lista filtrada.
- **Termos do domínio:** seção da CNAE (letra, 21 seções) e divisão (dois primeiros
  dígitos). Indústria extrativa = seção B, divisões 05 a 09; indústria de transformação =
  seção C, divisões 10 a 33. Fonte: `src/lib/prospecting/industria.ts` e CONCLA/IBGE.
- **Comportamento atual:** PROVADO, medido na VPS em 17/11/2026 como `pulse_api`, com o
  limite de 5 s:
  - total de indústria de transformação pelo CNAE principal: 53.897 empresas, contadas em
    1,1 s;
  - primeira página do mesmo filtro, por fit: 38 ms;
  - indústria, MG e 50 a 99 funcionários: 353 empresas, total em 0,24 s e página em 44 ms;
  - CNAE "2062": total em 0,4 s e página por fit em 0,5 s;
  - principal **ou secundária**, calculado na hora: passou de 5 s. Por isso, a carga
    precisa gravar setor e ramo prontos.
  - Recorte atual: 1,32 mi de naturezas 2xxx e 5xxx, 1,16 mi de 3xxx, 545 mil de 4xxx e
    66 mil de 1xxx. Só 591 mil empresas têm RAIS.
- **Superfícies conhecidas:**
  - carga: `scripts/receita/sincronizar-base.ts` (recorte e colunas novas);
  - schema: `scripts/receita/vps/preparar-vps.sql` (colunas e índices novos);
  - função: `supabase/functions/empresas-receita` (recebe e valida os filtros);
  - tela: `src/components/prospeccao/receita/` e `src/hooks/useEmpresasReceita.ts`.
- **Abordagem proposta:**
  - A carga grava `secao` e `divisao` do CNAE principal e as listas `secoes_sec` e
    `divisoes_sec` dos secundários, com índice GIN.
  - Setores e divisões ficam num módulo puro compartilhado pela carga e pela tela, ao
    lado de `industria.ts`.
  - A palavra do campo CNAE é resolvida em códigos contra `public.cnaes`, com cerca de
    1.300 linhas. Para isso, o `pulse_api` já tem permissão de leitura.
  - A função aceita só os filtros e valores da lista fechada, monta o SQL com parâmetros e
    responde 400 a qualquer outro valor.
  - A página e o total vêm em chamadas separadas: a lista aparece sem esperar a contagem,
    e o total mostra "contando…" até chegar.
  - O último filtro fica no `localStorage`, com versão na chave: se o formato mudar, a
    tela volta ao padrão em vez de quebrar.
- **Restrições e padrões aplicáveis:** reaproveitar `industria.ts`; regra compartilhada em
  helper; a função valida a entrada e devolve erro estruturado. Fonte:
  `../../../boundaries.md`.
- **Riscos para investigar:**
  - contagem de filtros amplos, perto de 2 milhões de linhas, depois do recorte novo;
  - ordem por fit com filtro seletivo sem índice próprio.
- **Provas esperadas:**
  - teste da montagem do filtro: E entre filtros, OU dentro de um filtro, a exceção do
    contato, ramo preso ao setor e atividade secundária;
  - rejeição de valor fora da lista;
  - estado vazio;
  - contador do botão;
  - abrir com o último filtro e com o padrão;
  - tempos medidos na VPS para os cenários 1, 3 e 5.
- **Fora do escopo:** filtro por sócio, filial, faturamento e distância.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1, 2, 3, 4 | Ensaio de 17/11/2026: a Edge Function rodou num Deno 2.1 contra um Postgres 16 com TLS e dados com um caso por filtro. Os 30 casos deram o esperado: setor, ramo preso ao setor, CNAE por prefixo, atividade secundária com o selo, "Sem informação na RAIS", idade, capital, natureza, dívida e contato (os dois exigidos juntos). |
| 5 | Medido na VPS em 17/11/2026, como `pulse_api`, depois da carga e do `VACUUM`: página entre 24 e 333 ms, total entre 46 e 392 ms, nos cenários 1 e 3, no padrão, na página 400, no CNAE e em filtros amplos e seletivos. Antes do `VACUUM`, a primeira contagem do setor levou 4,5 s; a carga agora termina com `VACUUM (ANALYZE)`. |
| 6, 7, 8, 9 | Na tela: lista vazia com "Limpar filtros", botão "Filtros" com a contagem, último filtro guardado no navegador com versão na chave e padrão "Indústria de transformação". Tela validada pelo Victor em 17/11/2026. |
| 10 | Carga de 17/11/2026: 2.438.184 empresas (eram 3.093.706). A simulação imprimiu, da tabela da Receita, o nome de cada natureza que saiu: condomínio, organização religiosa, partido (nacional, regional, local e comitê), frente plebiscitária e candidato, além da administração pública. |

- **Recusas:** setor, CNAE, capital, dívida ou estado fora da lista dão 400; CNAE com SQL
  injetado dá 400; sem `prospeccao:ler` dá 403.
- **Esquema:** `scripts/receita/vps/esquema.sql` rodou duas vezes seguidas sem erro, e a
  carga o aplica como `pulse_carga`.
- **Função publicada** em 17/11/2026, depois da carga, porque ela usa as colunas novas.
- **Commits / PR:** branch `feat/empresas-filtros`, que parte da `feat/empresas-base-receita`.
