# US-0018 — Refinar o faturamento estimado

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 19/11/2026 ("aprovo a US-0018, pode começar", com ressalvas)
- **Relacionadas:** US-0006, US-0008, US-0020, US-0022, ADR-0011, ADR-0041, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** um faturamento estimado mais próximo do real, com a indicação de quanto posso
confiar nele,
**para** separar Âncora, Ponte e Satélite e marcar o Budget do BANT sem errar a conta.

### Contexto

A US-0006 entregou a estimativa por funcionários da RAIS × receita por pessoa da classe da
CNAE e do porte (IBGE), combinada com o capital social a partir de R$ 10 mi. Nos casos com
faturamento conhecido pelo Victor (18/11/2026), o erro mediano caiu de 4,4 para cerca de 2
vezes, mas ainda há desvios grandes para os dois lados (uma empresa sai com o dobro do real,
outra, uma trading com 1 funcionário, com um sexto).

O faturamento estimado pesa mais agora: sugere o tipo de conta ao mover para qualificação
(US-0008) e dá o indício de Budget do BANT (US-0022). Os funcionários confirmados pelo time,
um dos caminhos levantados, já entraram na US-0020.

### Escopo

- Inclui: **calibrar por setor** com os casos de faturamento conhecido que o time informa no
  próprio Pulse (faturamento "apurado" ou "estimado" pelo time na empresa). A calibração lê
  esses casos do Pulse; no repositório ficam só os pesos ajustados, nunca o faturamento de
  uma empresa. **Incremental** (ressalva de 19/11/2026): o faturamento real é difícil de obter
  (vem de pessoas próximas ou de entrevistas de CEO), então não há meta de casos para começar;
  cada ramo ou setor entra quando junta 5 casos, e o resto segue a conta geral. Meta: erro
  mediano abaixo de 1,5 vez nos setores calibrados, medido com cada caso fora do ajuste.
- Inclui: **regime tributário como limite** nas empresas que já estão no Pulse, com o regime da
  BrasilAPI: Lucro Presumido limita a estimativa a R$ 78 mi. A base da VPS segue sem regime
  (investigação de 19/11/2026, abaixo).
- Inclui: **capital social também nas empresas sem RAIS**, a partir de R$ 10 mi, fora de
  holdings, imobiliárias e SPEs, pela mesma conta calibrada.
- Inclui: **selo de confiança** ao lado do valor (alta, média, baixa), com o motivo no
  tooltip da lista e na ficha.
- Não inclui: fornecedor pago (Serasa, Econodata); mudar sozinho o tipo de conta de empresas
  já classificadas.

### Como o selo de confiança é decidido (proposta)

| Confiança | Quando |
|---|---|
| Alta | RAIS (ou funcionários do time) num setor calibrado com erro mediano até 1,5 vez |
| Média | RAIS num setor sem calibração própria, ou capital social sem RAIS |
| Baixa | modelo de empresas parecidas, ou só o piso do porte |

O faturamento apurado ou estimado pelo time leva o selo verde, com quem informou e quando
(revisão de 23/11/2026, abaixo).

## Critérios de aceite

**Cenário 1: calibração pelos casos do Pulse**

- **Dado** empresas com faturamento "apurado" ou "estimado" pelo time no Pulse;
- **Quando** a calibração roda (antes ou junto da carga da base);
- **Então** os fatores por ramo e por setor são recalculados, e o resultado diz o erro mediano
  antes e depois, por grupo e no geral, com cada caso fora do ajuste;
- **E** ramo ou setor com menos de 5 casos, ou em que o fator não melhora o erro, usa a conta
  geral.

**Cenário 2: casos que não entram**

- **Dado** uma empresa com faturamento "calculado" (o estimado pela base, gravado ao mover para
  qualificação);
- **Então** ela não entra na calibração.

**Cenário 3: limite pelo regime**

- **Dado** uma empresa já no Pulse, no Lucro Presumido pela BrasilAPI, com estimativa de R$ 120 mi;
- **Então** a estimativa fica em R$ 78 mi, e o tooltip diz que o regime limita o valor.

**Cenário 4: capital social sem RAIS**

- **Dado** uma empresa sem funcionários na RAIS, com capital social de R$ 50 mi, fora de
  holding, imobiliária e SPE;
- **Então** a estimativa usa o capital, com o selo de confiança média.

**Cenário 5: selo de confiança**

- **Dado** uma empresa estimada pela RAIS num setor calibrado com erro até 1,5 vez;
- **Então** a lista e a ficha mostram "≈ R$ X · confiança alta", e o tooltip diz o porquê;
- **Dado** uma empresa só com o piso do porte;
- **Então** o selo é "confiança baixa".

**Cenário 6: o que muda nas empresas já classificadas**

- **Dado** uma empresa já em qualificação, com tipo de conta escolhido;
- **Quando** a estimativa dela muda depois da calibração;
- **Então** o tipo de conta não muda sozinho; a nova sugestão aparece só ao mover outra vez.

## Revisão (Victor Couto, 2026-11-23)

- Na lista, o selo fica só no hover, não abaixo do valor.
- No hover e na ficha, o ponto do selo é vermelho na confiança baixa, amarelo na média e verde
  na alta.
- Faturamento colocado pela equipe (apurado ou estimado): selo verde, com quem colocou e a
  data e hora; a ficha mostra o histórico das mudanças. O "calculado" (estimativa da base
  gravada ao mover) leva o selo da estimativa, com quem moveu e quando.

## Decisões (Victor Couto, 2026-11-19)

- Os casos para calibrar vêm do próprio Pulse (faturamento informado pelo time); nada de
  faturamento de empresa no repositório.
- Entram: calibrar por setor, regime como limite e capital social sem RAIS.
- A tela mostra um selo de confiança ao lado do valor único.

- Ressalva (19/11/2026): os 30 casos vão demorar; o faturamento real vem de pessoas próximas ou
  de entrevistas de CEO. A calibração é incremental, sem meta de casos para começar.

## Investigação do regime (19/11/2026)

- A Receita publica, segundo fontes de mercado, a relação de empresas por forma de tributação
  (Lucro Real, Presumido, Arbitrado, imunes e isentas) a partir da ECF, por ano-calendário, com
  o ano-base 2024 como o mais recente (cerca de dois anos de atraso; Simples e MEI não entram).
  Não foi possível confirmar no portal oficial o link, as colunas nem a cobertura: os caminhos
  antigos em arquivos.receitafederal.gov.br dão 404, e a página do dados.gov.br só abre no
  navegador.
- O Pulse já recebe o regime pela BrasilAPI (que lê esses mesmos dados) nas empresas que
  entram nele: 1.184 com regime, 234 no Presumido (19/11/2026).
- Decisão (recomendação aceita): o limite vale nas empresas já no Pulse; levar o regime para a
  base inteira da VPS fica para quando o arquivo for confirmado (história futura).

## Pontos em aberto

### Hipóteses para validar

- Lucro Real não é piso (empresa abaixo de R$ 78 mi pode optar por ele): só entra como sinal
  no tooltip. Origem: Lei 9.718/1998, arts. 13 e 14.
- Capital sem RAIS pela mesma conta calibrada: numa limitada, o capital pesa muito (uma
  limitada da indústria com R$ 50 mi de capital sai em cerca de R$ 315 mi). Validar com
  empresas conhecidas; por isso o selo é médio.

### Provocações para produto

- Hoje o Pulse tem 4 empresas com faturamento do time, nenhum setor com 5. A calibração só
  começa a valer quando o time informar o faturamento das empresas que conhece (no bloco Porte
  do estudo da conta ou no cartão da empresa) — impacto possível: até lá, ninguém tem selo
  "confiança alta".
- O indício de Budget do BANT e a sugestão de tipo de conta mudam com a nova estimativa —
  impacto possível: o mesmo cartão pode passar a mostrar B como indício (ou deixar de mostrar)
  depois da calibração.

## Contexto técnico

- **Objetivo observável:** estimativa recalibrada por setor, com limite de regime e capital sem
  RAIS; selo de confiança na lista e na ficha.
- **Comportamento atual:** PROVADO —
  - estimativa em `src/lib/prospecting/faturamentoEstimado.ts` (`estimarFaturamento`,
    `estimarPorFuncionarios`), calculada na carga da VPS (`scripts/receita/sincronizar-base.ts`)
    e refeita na tela com os funcionários do time (`comFuncionariosDoTime`);
  - pesos do capital em `calibracaoCapital.json` (um conjunto geral, sem setor);
  - `scripts/receita/calibrar-faturamento.ts` calibra o modelo de parecidas pela própria base;
  - faturamento do time em `prospect_companies.faturamento_anual` com base `apurado`,
    `estimado` ou `calculado` (este último é a estimativa da base, não caso real);
  - a base da VPS não tem regime tributário.
- **Restrições e padrões aplicáveis:** moeda truncada (ADR-0011); base da Receita só na VPS e
  nada dela no Supabase (ADR-0053); faturamento do time lido com credencial que não vai ao
  repositório; só pesos e medidas agregadas versionados.
- **Riscos para investigar:** ler os casos do Supabase no script de calibração sem credencial
  no repositório; o regime por CNPJ na carga (tamanho, atualização anual); recalcular a
  estimativa da base inteira na carga com os pesos por setor dentro do tempo atual.
- **Provas esperadas:** erro mediano antes e depois, por setor, com cada caso fora; empresas
  "calculado" fora da calibração; limite do Presumido; capital sem RAIS fora de holding e SPE;
  selo nos três níveis; tipo de conta já escolhido intocado.
- **Fora do escopo:** fornecedor pago; reclassificar contas automaticamente.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 e 2 | `scripts/receita/calibrar-por-setor.ts` (lê só "apurado" e "estimado"); rodado em 23/11/2026: 3 casos cruzados com a base, todos subestimados (2, 17 e 24 vezes), nenhum setor com 5 casos, nada calibrado; testes desativados |
| 3 | conferência manual em 19/11/2026: R$ 120 mi no Presumido de 2024 → R$ 78 mi, com o motivo; tela a validar |
| 4 | conferência manual: capital de R$ 50 mi sem RAIS → base "capital", selo médio; SPE e holding ficam no modelo; carga de 23/11/2026 com o ok do Victor: 22.460 empresas pelo capital (6.216 âncora, 14.093 ponte, 2.151 satélite) |
| 5 | conferência manual: RAIS → média (sem setor calibrado), modelo e piso → baixa; tela a validar |
| 6 | o tipo de conta gravado não é recalculado; a sugestão nova só aparece ao mover |

- Estimativa: base `capital` e fator do setor em `faturamentoEstimado.ts`
  (`usaCapitalSemRais`, `estimarPorFuncionarios(..., comFatorDoSetor)`); calibração em
  `calibracaoPorSetor.json` (vazia até haver casos) lida por `fatorDoSetor.ts`.
- Selo: `confiancaDoFaturamento.ts`; tela em `SeloDeConfianca.tsx`, na lista
  (`EmpresasReceitaTable`) e na ficha (`FichaDaEmpresaReceita`).
- Regime: `limiteDoRegime.ts` (`comLimiteDoRegime`, `notaDoRegime`), aplicado na tela depois
  dos funcionários do time (`useEmpresasReceita`); a Edge Function `empresas-receita` passa a
  devolver `regime_tributario` e `regime_tributario_ano` das empresas do tenant.
- Base da VPS: `esquema.sql` aceita `capital` em `faturamento_base`; a carga passa a razão
  social (SPE). Carga aplicada em 23/11/2026 (2.438.184 empresas, 12 min); CHECK novo conferido na VPS.
- Edge Function `empresas-receita` com o regime publicada em 23/11/2026 com o ok do Victor.
- Revisão de 23/11: histórico do faturamento em `prospect_company_faturamentos` (migration
  `20261123120000`, gatilho em `prospect_companies`, só leitura por `prospeccao:ler`), aplicada
  em produção em 23/11/2026 com o ok do Victor (gatilhos, RLS e policy conferidos); a
  `empresas-receita` devolve as últimas 10 mudanças por empresa; autoria e selo do informado em
  `confiancaDoFaturamento.ts` (`autoriaDoFaturamento`, `seloDoInformado`); cores e hover em
  `SeloDeConfianca.tsx`; histórico na ficha (`HistoricoDoFaturamento`).
