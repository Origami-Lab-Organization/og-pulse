# US-0054 — Funcionários além da RAIS: RAIS improvável e faixa do LinkedIn

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** depois da US-0053
- **Pedida e aprovada por / em:** Victor Couto, 26/11/2026 ("usar RAIS vai ser uma burrice nossa";
  "as duas, pode abrir como história nova"; decisões abaixo)
- **Depende de:** US-0053 (página da empresa, cartão Porte)
- **Relacionadas:** US-0006 (faturamento estimado), US-0014 (fit por serviço e retrato da Base),
  US-0018 (capital e histórico do faturamento), US-0020 (funcionários confirmados pelo time),
  US-0042 (filtros da Base), ADR-0053, ADR-0055

## Descrição

**Como** pessoa do comercial,
**quero** que o número de funcionários de uma empresa faça sentido para o porte dela, e poder informar a
faixa que o LinkedIn mostra,
**para** qualificar e priorizar sem ser enganado por uma RAIS que não conta quem a empresa emprega.

### Contexto

A Gecal (Pains · MG, capital de R$ 60 mi, 42 anos) aparece com 1 funcionário, e o LinkedIn dela mostra
de 201 a 500. A RAIS conta só os vínculos ligados àquele CNPJ e, como a RAIS pública não traz CNPJ, a
Base cruza os estabelecimentos por CEP, CNAE e natureza jurídica. Quando o grupo contrata por outro
CNPJ, ou o cruzamento acerta o estabelecimento errado, o número fica muito abaixo do real.

O número de funcionários pesa em três lugares: o faturamento estimado (funcionários × receita por
pessoa do IBGE, US-0006), o fit por serviço (calculado na carga da VPS, US-0014) e o filtro e a ordem
da Base. Um número errado distorce os três.

A estimativa pura (setor, capital, idade, filiais, sócios, natureza e estado) já existe para empresas
sem RAIS: o modelo foi treinado com 127 mil empresas, erra em média 2,6 vezes para mais ou para menos
e acerta dentro do dobro em 37% dos casos. Por isso a RAIS continua valendo quando é plausível, e a
estimativa entra só quando a RAIS é improvável para o porte. Estimar funcionários pelo faturamento não
serve: o faturamento estimado sai dos funcionários.

No retrato da US-0014, 254 das 1.171 empresas encontradas na Base não tinham RAIS; elas já usam a
estimativa. Esta história trata as que têm RAIS, mas baixa demais para o porte.

### Escopo

- Inclui:
  - **RAIS improvável:** quando a RAIS é baixa demais para o porte, a estimativa por empresas
    parecidas passa a ser o número principal, e a RAIS aparece como detalhe;
  - **faixa do LinkedIn:** o time informa a faixa de funcionários que o LinkedIn mostra (as mesmas
    faixas do LinkedIn), além do número exato que já existe;
  - a precedência entre as fontes, a mesma na página da empresa, no faturamento estimado e no fit;
  - a origem do número à vista no cartão Porte da página da empresa.
- Não inclui:
  - buscar a faixa no LinkedIn automaticamente (o time informa);
  - trocar a fonte do faturamento estimado (ele continua saindo dos funcionários);
  - recalibrar o modelo de empresas parecidas.

## Critérios de aceite

**Cenário 1: RAIS improvável**

- **Dado** uma empresa com RAIS abaixo de 10 funcionários, capital social a partir de R$ 10 mi, fora de
  holdings e serviços financeiros, atividades imobiliárias, incorporação e sedes de grupo, e com a
  estimativa por empresas parecidas de pelo menos 50 funcionários;
- **Quando** abro a página dela;
- **Então** o cartão Porte mostra a estimativa por empresas parecidas como número de funcionários, com
  a origem "estimado";
- **E** a RAIS aparece no detalhe, com o número dela;
- **E** o faturamento estimado usa a estimativa × a receita por pessoa do ramo, sem a correção pelo
  capital social (decisão 4).

**Cenário 2: RAIS plausível**

- **Dado** uma empresa com RAIS fora da regra do cenário 1;
- **Então** o número continua sendo o da RAIS, com a origem "RAIS", como hoje.

**Cenário 3: informar a faixa do LinkedIn**

- **Dado** uma empresa no Pulse e alguém com `prospeccao:editar`;
- **Quando** clica em "Informar" nos funcionários e escolhe uma faixa do LinkedIn (por exemplo,
  201 a 500);
- **Então** o cartão mostra a faixa, com a origem "LinkedIn, informado pelo time";
- **E** nas contas do faturamento estimado e do fit entra o ponto médio da faixa (201 a 500 vira 350);
- **E** o número exato continua possível no mesmo lugar.

**Cenário 4: precedência**

- **Dado** uma empresa com mais de uma fonte;
- **Então** vale, nesta ordem: o número exato informado pelo time, a faixa do LinkedIn, a RAIS
  plausível e a estimativa por empresas parecidas.

**Cenário 5: corrigir e voltar**

- **Dado** uma faixa ou um número informado pelo time;
- **Quando** alguém corrige, o novo valor vale a partir daí;
- **E** quando alguém apaga o que o time informou, volta a valer a RAIS ou a estimativa, pela regra do
  cenário 4.

**Cenário 6: Base de empresas**

- **Dado** a lista da Base, com o filtro e a ordem por funcionários;
- **Então** o filtro, a ordem e o fit usam o mesmo número que a página da empresa mostra, recalculados
  na carga da VPS;
- **E** o título do filtro continua só "Funcionários", sem citar a fonte (US-0042).

**Cenário 7: RAIS incompleta**

- **Dado** uma empresa com pelo menos 3 filiais em que a RAIS achou funcionário em menos da metade dos
  estabelecimentos, e sem número do time;
- **Então** o número continua sendo o da RAIS;
- **E** o cartão Porte mostra em quantos estabelecimentos a RAIS achou gente (ex.: "RAIS em 1 de 23
  estabelecimentos"), para o time conferir e informar a faixa.

## Decisões (Victor Couto, 26/11/2026)

1. **Regra da RAIS improvável (V2, revista com a medição):** RAIS abaixo de 10, capital social a partir
   de R$ 10 mi, fora das divisões 64 e 68 e dos grupos 7020 e 4110, e estimativa de pelo menos 50.
   A regra aprovada antes (RAIS abaixo de 10 ou menor que um quinto da estimativa) mudaria 461.239 das
   559.664 empresas com RAIS (82%), porque a Base só tem porte "demais"; a V2 muda 1.448 (0,26%),
   entre elas a Gecal (RAIS 1, estimativa 411). Medido por `scripts/receita/medir-rais-improvavel.ts`.
2. **A Base usa o número ajustado** no filtro, na ordem e no fit, para a lista e a página não
   discordarem. O cálculo vai para a carga da VPS (`scripts/receita/sincronizar-base.ts`).
3. **Faixa do LinkedIn nas contas:** o ponto médio da faixa no faturamento estimado e no fit; a tela
   mostra a faixa inteira.
4. **Funcionários confiáveis sem a correção do capital** (26/11/2026, depois da primeira carga): quando
   os funcionários vêm da estimativa ou do time (número exato ou faixa), o faturamento é funcionários ×
   receita por pessoa × fator do setor, sem combinar com o capital social. A correção pelo capital
   existe para compensar a RAIS baixa; aplicada de novo, subia o faturamento 3 vezes na mediana e
   levava 517 das 1.448 empresas a Âncora (Gecal: R$ 1,3 bi com a correção, R$ 311 mi sem ela).

5. **A RAIS continua sendo a fonte geral de funcionários, com aviso** (26/11/2026). Nas 8 Âncoras da
   região com referência do Econodata ou do time, a RAIS errou 2,2 vezes na mediana e o modelo de empresas
   parecidas 5,1 vezes (Prumo: 77 contra 4.000 a 5.000). O sinal "muitas filiais sem RAIS" pegaria 15% das
   empresas de R$ 10 mi a R$ 1 bi; por isso ele vira aviso na página (cenário 7), sem mudar o número.

## Contexto técnico

- **Objetivo observável:** o número de funcionários mostrado, filtrado e usado nas contas é o mesmo, e
  segue a precedência do cenário 4.
- **Termos do domínio:** RAIS, faixa do LinkedIn, estimativa por empresas parecidas, funcionários
  confirmados pelo time, faturamento estimado, fit por serviço, Base de empresas.
- **Comportamento atual:**
  - PROVADO: `funcionarios` e `unidades_com_funcionarios` vêm da RAIS 2025 somada por empresa, cruzada
    por CEP + CNAE + natureza (`.harness/integrations/base-receita-vps.md`, linha da tabela de campos).
  - PROVADO: sem RAIS, `estimarFaturamento` usa `funcionariosPrevistos` (modelo em
    `src/lib/prospecting/modeloDeFaturamento.json`: R² 0,39, erro mediano 2,6 vezes) e o capital
    (`calibracaoCapital.json`), em `src/lib/prospecting/faturamentoEstimado.ts`.
  - PROVADO: o número exato do time fica em `prospect_companies.funcionarios_informados` (migration
    20261118200000, US-0020) e prevalece sobre a RAIS.
  - PROVADO: filtro e ordem da Base por `e.funcionarios` na Edge Function `empresas-receita`
    (faixas `ate19` a `500mais`).
  - PROVADO: o fit pesa os funcionários em faixas de 50 a 99, 100 a 249, 250 a 999 e 1.000 ou mais
    (`funcionariosPontos`, `src/lib/prospecting/fit.ts:67`); o número do time vale no lugar de
    `base_funcionarios` (`fit.ts:49-55`). A carga `scripts/receita/sincronizar-base.ts` importa
    `bestFit`, `FRENTES_DO_FIT` e `fitDaBase` desse código para gravar os `fit_*` na VPS: a faixa do
    LinkedIn pode seguir o caminho de `funcionarios_informados`, e a Base só muda a ordem por fit
    depois de uma nova carga.
- **Superfícies conhecidas:** cartão Porte (`src/components/prospeccao/empresa/VisaoDaEmpresa.tsx`),
  `faturamentoEstimado.ts`, `fitDaBase.ts`, Edge Function `empresas-receita`, carga
  `scripts/receita/sincronizar-base.ts`, `PainelDeFiltros`.
- **Restrições e padrões:** migration versionada com RLS por tenant (a faixa é dado da empresa do
  Pulse: segue `prospeccao:ler` e `prospeccao:editar`); horário de migration combinado entre as sessões;
  sem texto explicativo na tela; complexidade até 7 por função.
- **Riscos para investigar:** quantas empresas a regra da RAIS improvável muda (medir na Base antes de
  rodar a carga e mostrar ao Victor); tempo de
  recarga da Base com o fit recalculado; consistência entre a VPS e o que o Pulse guarda no retrato da
  Base (US-0014).
- **Provas esperadas:** cenários 1 a 6 no localhost, pelo Victor, com a Gecal (RAIS improvável) e uma
  empresa de RAIS plausível.
- **Fora do escopo:** busca automática no LinkedIn; recalibrar o modelo.
