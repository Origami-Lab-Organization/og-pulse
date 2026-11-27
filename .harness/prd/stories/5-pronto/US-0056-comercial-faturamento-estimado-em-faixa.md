# US-0056 — Faturamento estimado em faixa

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** depois da US-0054
- **Pedida e aprovada por / em:** Victor Couto, 26/11/2026 ("gosto de mostrar uma faixa quando não temos o
  número mais aproximado inputado pela nossa equipe"; "quero buscar faixas do tamanho do econodata")
- **Depende de:** US-0054 (funcionários além da RAIS)
- **Relacionadas:** US-0006 (faturamento estimado), US-0018 (capital e histórico), US-0042 (filtros da
  Qualificação), US-0053 (cartão Porte)

## Descrição

**Como** pessoa do comercial,
**quero** ver o faturamento estimado como uma faixa quando o time não informou o valor,
**para** não tomar uma conta aproximada por um número exato ao qualificar e priorizar.

### Contexto

O Pulse estima o faturamento de toda empresa da Base: funcionários × receita por pessoa do ramo (IBGE),
com o capital social quando ele passa de R$ 10 mi, ou, sem funcionários, por empresas parecidas. A tela
mostra um número só ("R$ 311 mi"), embora o erro típico seja de 2 vezes (2,6 vezes na estimativa por
empresas parecidas). Para a Gecal, o Gemini respondeu com uma faixa de R$ 80 a 250 mi, e a faixa é o que
parece certo ali: ela mostra a incerteza que o número único esconde.

### Escopo

- Inclui:
  - faixa no lugar do número quando o faturamento é estimado (cartão Porte da página da empresa e coluna
    Faturamento da lista da Base);
  - dez faixas fixas de faturamento, como as do Econodata, encaixadas nas faixas do filtro;
  - funcionários estimados (RAIS improvável, US-0054) também em faixa, nas faixas do filtro.
- Não inclui:
  - mudar a conta do faturamento estimado;
  - mudar filtros e ordem: continuam pelo valor central, nas faixas de `FATURAMENTOS`;
  - pesquisa de faturamento por IA (fica com a busca de notícias e referências do Estudo da conta).

## Critérios de aceite

**Cenário 1: faturamento estimado**

- **Dado** uma empresa sem faturamento nem número de funcionários informado pelo time;
- **Então** o faturamento aparece como a faixa fixa em que o valor estimado cai: até R$ 4,8 mi (piso do
  porte), R$ 4,8 a 10 mi, R$ 10 a 30 mi, R$ 30 a 50 mi, R$ 50 a 100 mi, R$ 100 a 200 mi, R$ 200 a
  300 mi, R$ 300 a 500 mi, R$ 500 mi a 1 bi ou acima de R$ 1 bi;
- **E** a origem continua visível ("estimado pela base").

**Cenário 2: funcionários estimados e faixa do LinkedIn**

- **Dado** uma empresa com os funcionários estimados (RAIS improvável, US-0054);
- **Então** os funcionários aparecem na faixa do filtro em que a estimativa cai (até 19, 20 a 49, 50 a
  99, 100 a 249, 250 a 499 ou 500 ou mais), com a RAIS no detalhe;
- **E** com a faixa do LinkedIn informada pelo time, o faturamento aparece na faixa fixa em que cai a
  conta pelo ponto médio dela.

**Cenário 3: valor do time**

- **Dado** o faturamento ou o número exato de funcionários informado pelo time;
- **Então** o faturamento aparece como valor único, como hoje.

**Cenário 4: piso do porte**

- **Dado** uma empresa estimada pelo piso do porte;
- **Então** continua "acima de R$ 4,8 mi", sem faixa.

**Cenário 5: tipo de conta e filtros**

- **Dado** uma faixa de faturamento;
- **Então** Âncora, Ponte e Satélite, o filtro de Faturamento da Base e o da Qualificação usam o valor
  central, como hoje, nas faixas de `FATURAMENTOS`.

**Cenário 6: o time informa em faixa, num modal**

- **Dado** uma empresa no Pulse e alguém com `prospeccao:editar`;
- **Quando** clica em "Informar" no faturamento ou nos funcionários;
- **Então** abre um modal com o que a página mostra hoje, o valor ou a faixa (de–até; com o "até" vazio,
  vale o valor exato), a confiança numa escala só (baixa, média, alta ou apurado) e, opcional, a fonte;
- **E** nos funcionários, "Faixa do LinkedIn" preenche o de–até e, com a fonte vazia, grava "LinkedIn"
  como fonte; "Voltar à RAIS" apaga o que o time informou;
- **E** o cartão mostra a faixa informada (ex.: "R$ 700 a 900 mi · estimado pelo time · confiança
  média"; "4.000 a 5.000");
- **E** nas contas (tipo de conta, fit, filtros) entra o ponto médio; a confiança e a fonte só aparecem
  na tela.

## Decisões (Victor Couto, 26/11/2026)

1. Faixa só quando o time não informou o número; com o número do time, valor único.
2. Faixas fixas do tamanho das do Econodata, e não uma faixa em volta do valor: dez faixas de faturamento
   com cortes em R$ 10, 100 e 300 mi, os mesmos do filtro, para tela e filtro nunca discordarem. A
   primeira proposta (valor ÷ 1,4 a × 1,4) foi trocada no mesmo dia.
3. A Gecal mostrou que o erro maior está nos funcionários, não na conta do faturamento: com os 200 a 299
   funcionários do Econodata, a conta dá cerca de R$ 189 mi, dentro dos R$ 100 a 200 mi dele; com os 411
   da estimativa, R$ 311 mi. A faixa de funcionários informada pelo time (US-0054) corrige isso.

4. **Sem a correção pelo capital social, em toda a Base** (26/11/2026, já aplicado na carga com a
   US-0054). Com os funcionários da referência, a conta só com a receita por pessoa do IBGE acertou a faixa
   em 6 de 8 Âncoras da região (mediana 1,09 vez); com a correção, errava 7 vezes para cima (Thinal 15×,
   Cimento UAU 109×). O custo aceito: empresas cuja RAIS conta pouca gente sem cair na regra da US-0054
   (Arape: R$ 350 mi reais, R$ 6 mi pela conta) ficam baixas até o time informar.

5. **O time informa em faixa, num modal** (27/11/2026): faixa ou valor, estimado ou apurado, confiança
   quando estimou, fonte opcional; vale para faturamento e funcionários. A faixa do LinkedIn vira atalho
   do modal e foi migrada para as colunas novas (migration 20261127100000).
6. Nas contas entra o ponto médio da faixa informada.
7. A confiança informada só aparece; não muda contas nem filtros.
8. **Desenho do modal** (27/11/2026, revisto pelo Victor): o número vem primeiro; "estimei ou apurado" e
   a confiança viraram uma escala só (baixa, média, alta, apurado), gravada como antes (estimado com
   confiança, ou apurado sem); sai a escolha entre faixa e valor exato (o "até" vazio é o valor exato);
   rótulos e seleção no padrão dos outros modais do sistema, sem dica nos campos.

## Contexto técnico

- **Objetivo observável:** o faturamento estimado aparece em faixa; o informado, em valor único.
- **Comportamento atual:**
  - PROVADO: `estimarFaturamento` e as bases `rais`, `capital`, `modelo` e `piso` em
    `src/lib/prospecting/faturamentoEstimado.ts`; a carga `scripts/receita/sincronizar-base.ts` grava
    `faturamento_estimado` e `faturamento_base` na VPS.
  - PROVADO: erros típicos em `modeloDeFaturamento.json` (2,6) e `calibracaoCapital.json` (2,0 nos casos
    do time); `calibracaoPorSetor.json` tem só 3 casos.
  - PROVADO: na Qualificação (US-0042), `faturamentoDaLinha` em `filtrosDaQualificacao.ts` usa o valor do
    time e, sem ele, o estimado do retrato (nulo no piso); o filtro agrupa por `faixaDoFaturamento`
    (`FATURAMENTOS` em `filtrosReceita.ts`), o mesmo da Base.
- **Superfícies conhecidas:** cartão Porte (`VisaoDaEmpresa.tsx`), coluna Faturamento
  (`EmpresasReceitaTable.tsx`), `faturamentoEstimado.ts`.
- **Restrições:** sem texto explicativo na tela (a explicação da conta fica no tooltip, como hoje);
  valores ocultáveis pelo olho de ocultar valores; complexidade até 7 por função.
- **Riscos para investigar:** faixas que cruzam a fronteira de Âncora, Ponte e Satélite (o tipo segue o
  valor central).
- **Provas esperadas:** cenários 1 a 5 no localhost, pelo Victor, com a Gecal e uma empresa com
  faturamento do time.
- **Fora do escopo:** pesquisa por IA, dados comprados (Serasa, Econodata), nova calibração.
