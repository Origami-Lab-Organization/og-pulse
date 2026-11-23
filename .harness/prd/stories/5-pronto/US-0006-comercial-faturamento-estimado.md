# US-0006 — Ver o faturamento estimado de cada empresa

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** Victor Couto, 2026-11-17 (com as tabelas e o modelo dos anexos)
- **Relacionadas:** US-0002, US-0003, US-0007, US-0008, US-0016, ADR-0011, ADR-0041, ADR-0042, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** ver o faturamento estimado de cada empresa,
**para** priorizar as contas pelo tamanho e reconhecer quem deve estar no Lucro Real.

### Contexto

A Receita não informa faturamento, e o capital social não serve como substituto
(glossário, "Faturamento anual"). A base traz os funcionários da RAIS, e o IBGE publica,
por ramo, quanto as empresas faturam por pessoa ocupada. Multiplicar os dois dá uma ordem
de grandeza útil para priorizar. Empresas com faturamento acima de R$ 78 milhões são
obrigadas ao Lucro Real, que é o sinal da Lei do Bem.

A medição de 17/11/2026 mostrou o alcance da RAIS: das 2.438.184 empresas da base, só
174.863 têm funcionários nela (7%). As outras também precisam de um valor aproximado
(pedido do Victor ao validar a tela).

### Escopo

- Inclui: a carga calcula o faturamento estimado de cada empresa e grava o valor e a base
  dele, nesta ordem:
  - **pela RAIS:** funcionários × receita por pessoa da classe da CNAE e do porte da
    empresa, a mais específica que o IBGE publica (anexo); nos ramos sem pesquisa anual,
    Contas Nacionais de 2021 ajustadas;
  - **aproximado:** sem RAIS, o modelo de empresas parecidas do anexo, quando passa do piso;
  - **pelo porte:** senão, o piso de R$ 4,8 mi que a Receita garante para quem não é ME nem
    EPP.
- Inclui: coluna "Faturamento" (estimado), centralizada como os outros números, antes da dívida ativa, com um valor só ("≈ R$ 723 mi")
  e a base embaixo ("pela RAIS" ou "aproximado"); com só o piso, "acima de R$ 4,8 mi".
- Inclui: empresa que já está na Prospecção com faturamento informado mostra o valor do time
  ("R$ 350 mi", "apurado pelo time" ou "estimado pelo time"), com a estimativa da base no
  tooltip. O filtro e a ordem continuam pela estimativa, que vale para a base inteira.
- Inclui: ordenar pela coluna.
- Inclui: filtro "Faturamento estimado" no painel, pelas faixas do tipo de conta (US-0016),
  que podem ser marcadas juntas: abaixo de R$ 10 mi, R$ 10 a 100 mi (Satélite), R$ 100 a 300 mi
  (Ponte) e acima de R$ 300 mi (Âncora). O filtro e a ordem usam o valor gravado; o piso
  conta como R$ 4,8 mi.
- Inclui: selo "Lucro Real provável" quando a estimativa é pela RAIS e, mesmo 40% abaixo,
  passa de R$ 78 milhões.
- Inclui: a conta e a fonte explicadas ao passar o mouse ou focar o valor.
- Não inclui (vai para outras histórias):
  - a conta explicada na ficha da empresa (US-0007);
  - o valor gravado na empresa com a base "Calculado" ao abrir a oportunidade (US-0008);
  - a sugestão do tipo de conta (US-0016).
- Não inclui: faturamento apurado, que continua informado pelo time; mudar a nota de fit
  (US-0014).

## Critérios de aceite

**Cenário 1: pela RAIS, por classe e porte**

- **Dado** a Prumo Engenharia, de rodovias (grupo 421), com 2.669 funcionários na RAIS;
- **Então** a conta usa R$ 318 mil por pessoa, das construtoras do grupo com 500 ou mais
  pessoas, e vejo "≈ R$ 848 mi" e "pela RAIS" embaixo, truncado, nunca arredondado;
- **Dado** a Padaria Santa Cruz, de panificação (classe 1091), com 122 funcionários;
- **Então** a conta usa R$ 188 mil por pessoa (panificação, R$ 263 mil, × 0,715 das
  indústrias de 100 a 249 pessoas), e vejo "≈ R$ 22 mi" — não a média de "Alimentos",
  puxada pelos frigoríficos.

**Cenário 2: ramo sem pesquisa anual**

- **Dado** um hospital (ramo 86) com 500 funcionários na RAIS;
- **Então** vejo "≈ R$ 79 mi" pela RAIS, com a receita por pessoa das Contas Nacionais.

**Cenário 3: sem RAIS**

- **Dado** uma empresa sem funcionário na RAIS, ou com zero;
- **Quando** o modelo de empresas parecidas passa de R$ 4,8 mi;
- **Então** vejo "≈ R$ X mi" e "aproximado" embaixo;
- **Quando** não passa;
- **Então** vejo "acima de R$ 4,8 mi".

**Cenário 4: sinal de Lucro Real**

- **Dado** uma estimativa pela RAIS, ou um valor informado pelo time, acima de R$ 78 mi;
- **Quando** passo o mouse ou foco o faturamento;
- **Então** o tooltip avisa "Lucro Real provável", citando a obrigatoriedade acima de R$ 78 mi
  por ano (Lei 9.718/1998, art. 14), e pede a confirmação na consulta da Receita;
- **E** a tabela não mostra selo nenhum;
- **E** estimativa aproximada ou pelo porte nunca mostra o aviso.

**Cenário 5: transparência da conta**

- **Quando** passo o mouse ou foco o valor;
- **Então** vejo de onde ele veio: a conta e a fonte, com a variação de cerca de 40% (pela
  RAIS); o modelo e o erro típico (aproximado); ou o porte da Receita (piso).

**Cenário 6: ordenar**

- **Quando** clico em "Faturamento estimado" no cabeçalho;
- **Então** a lista vem do maior para o menor; clicando de novo, do menor para o maior.

**Cenário 7: filtrar pelas faixas**

- **Quando** marco "R$ 100 a 300 mi (Ponte)" e "acima de R$ 300 mi (Âncora)";
- **Então** a lista mostra só as empresas com valor a partir de R$ 100 mi;
- **E** o total e o botão "Filtros" contam o filtro como os demais.

**Cenário 8: valor do time prevalece**

- **Dado** uma empresa na Prospecção com faturamento apurado de R$ 350 mi;
- **Então** vejo "R$ 350 mi" e "apurado pelo time", sem "≈";
- **E** o tooltip mostra a estimativa da base (≈ R$ 85 mi), para comparar;
- **E** o filtro e a ordem continuam usando a estimativa.

## Decisões (Victor Couto, 2026-11-16 e 2026-11-17)

- O faturamento estimado fica na tabela, antes da dívida ativa (16/11; posição trocada em
  18/11, depois da validação da tela).
- Na validação da tela (18/11): capital social entra como coluna antes de funcionários;
  números (capital, funcionários, idade e faturamento) centralizados; a origem do
  faturamento ("pela RAIS", "aproximado", "estimado pelo time") sai da célula e fica só no
  tooltip, que mostra a conta.
- A receita por pessoa vem do IBGE, com fonte e ano citados, e passa pela aprovação do
  Victor antes de entrar no código (16/11) — tabela no anexo.
- Esta história fica com a lista: cálculo, coluna, ordem, filtro, selo e conta no tooltip.
  A ficha (US-0007), o "Calculado" ao abrir a oportunidade (US-0008) e a sugestão do tipo
  (US-0016) ficam nas histórias delas (17/11).
- Valores das pesquisas anuais de 2024 sem correção pela inflação (17/11).
- Depois da validação da tela (17/11), substituindo a faixa de 40% e o "Sem estimativa":
  - um valor só ("≈ R$ 723 mi") e a base, com a variação no tooltip — a faixa
    "R$ 433 mi a 1 bi" era larga demais para usar;
  - ramos sem pesquisa anual usam as Contas Nacionais de 2021, ajustadas por 1,62;
  - empresas sem RAIS usam o modelo de empresas parecidas quando ele passa do piso, e o piso
    de R$ 4,8 mi quando não passa. O modelo foi mantido mesmo com o erro medido (anexo).
- Depois da segunda validação (17/11): a média do ramo errava demais (a Padaria Santa Cruz
  saía R$ 92 mi, acima da Tecno2000):
  - a receita por pessoa passa a ser da classe da CNAE e do porte da empresa;
  - o faturamento informado pelo time na Prospecção prevalece na coluna;
  - o teto do Simples e a calibração com os valores do time ficaram de fora.
- Na validação de 18/11:
  - o capital social entra na conta: com RAIS e capital a partir de R$ 10 mi (fora holdings,
    64, e imobiliárias, 68), a estimativa pela RAIS é combinada com o capital (anexo). Sem
    RAIS ou com capital menor, nada muda — não há dado para calibrar empresas menores;
  - o aviso de Lucro Real sai da tabela e fica só no tooltip, e usa o limite da lei, R$ 78
    mi (Lei 9.718/1998, art. 14, conferido em 18/11/2026), sem a margem de 40%;
  - capital social vira coluna antes de funcionários; números centralizados; nada quebra
    linha.
  - painel de filtros com grupos recolhíveis (o título mostra o que está marcado; só os
    grupos com filtro começam abertos); Setor, Ramo, Faturamento e Natureza viram listas
    com caixa, uma opção por linha; com o painel aberto, a tabela fica compacta para caber
    sem rolar de lado; o tooltip do faturamento quebra linha.
- Depois da terceira validação (17/11): os funcionários da RAIS também erravam (Tecno2000
  com 368 em vez de cerca de 400; Prumo com 2.669 em vez de mais de 5.000). A RAIS pública
  não traz CNPJ, e o cruzamento por CEP + CNAE + natureza só cruzou todas as unidades em 14%
  das empresas com mais de uma. A carga passa a cruzar também o par único por CEP + CNAE (um
  só estabelecimento na RAIS e um só ativo na Receita): 66 mil estabelecimentos e 1,46
  milhão de vínculos a mais; a Tecno2000 vai a 404. Estimar a filial não cruzada e o campo
  de funcionários informado pelo time ficaram de fora.

## Pontos em aberto

### Hipóteses para validar

- Funcionários da RAIS somam todas as unidades da empresa
  (`empresas_funcionarios_total`), então a estimativa já conta as filiais. Origem: contrato
  da integração.
- Nas divisões que juntam várias atividades da PAS (ex.: 69 a 75 usam "serviços
  técnico-profissionais"), o valor médio basta para priorizar. Origem: o IBGE não abre a
  PAS por divisão da CNAE.
- O fator de 1,62 entre as Contas Nacionais e as pesquisas anuais vale para os ramos sem
  pesquisa. Origem: mediana de 66 ramos com as duas fontes (de 1,27 a 2,12 entre o 1º e o
  3º quartil).

### Provocações para produto

- As duas amostras da calibração do capital são de empresas grandes — impacto possível:
  nas médias, o peso do capital pode estar alto; mais casos do time de empresas médias
  ajustariam.
- Trading com quase nenhum funcionário e capital alto (a Canex: 1 funcionário, R$ 74 mi de
  capital) continua cerca de 6 vezes abaixo do faturamento conhecido pelo time.

- Construtoras tocam obras em consórcio, com CNPJ próprio (natureza 2151): esses
  funcionários não somam na empresa — impacto possível: a Prumo aparece com cerca de 2.700
  funcionários em vez de mais de 5.000, e o faturamento estimado sai pela metade.

- Quem fatura muito acima da média do ramo e porte (a Tecno2000, cerca de 4 vezes a média
  de móveis por funcionário) sai bem abaixo do real
  grandes contas parecem médias até o time informar o faturamento.
- A Padaria Santa Cruz é optante do Simples na RAIS 2025, o que limitaria o faturamento a
  R$ 4,8 mi; a estimativa não usa esse sinal (decisão de 17/11) — impacto possível: empresas
  do Simples com muitos funcionários sobrestimadas.

- O modelo erra muito nas grandes sem RAIS: a Prumo Logística (S.A., capital de R$ 3,3 bi,
  sem RAIS) sai "≈ R$ 27 mi aproximado" — impacto possível: grandes contas escondidas no
  meio das pequenas; o capital social alto não basta para o modelo.
- Ramos com receita muito alta por pessoa (petróleo, R$ 17,9 mi; refino, R$ 4,1 mi) geram
  valores altos — impacto possível: o selo de Lucro Real aparece em quase todas.
- Nas Contas Nacionais, a produção de um banco não é a receita de juros — impacto possível:
  bancos e seguradoras subestimados.
- Empresa com sede administrativa pequena e produção terceirizada sai subestimada.

## Contexto técnico

- **Objetivo observável:** coluna, ordem, filtro, selo e explicação do faturamento estimado
  na lista da base da Receita, para todas as empresas.
- **Termos do domínio:** Faturamento anual com base Estimado ou Apurado
  (`prospect_companies.faturamento_anual`, `faturamento_anual_base`) — fonte: glossário;
  Sinal Lei do Bem — fonte: `src/lib/prospecting/receita.ts`; tipos de conta — US-0016.
- **Comportamento esperado:**
  - tabelas e modelo em `src/lib/prospecting/faturamentoEstimado.ts` e
    `modeloDeFaturamento.json`, usados pela carga (cálculo) e pela tela (texto, selo e
    explicação);
  - a carga grava `faturamento_estimado` e `faturamento_base` (`rais`, `modelo` ou `piso`);
  - `scripts/receita/calibrar-faturamento.ts` recalibra o modelo com a mesma função de
    características da carga;
  - Edge Function: ordem `faturamento`, em duas partes (estimadas pelo índice parcial; as de
    piso pelo CNPJ), e filtro `faturamentos` (lista fechada).
- **Superfícies conhecidas:**
  - `scripts/receita/sincronizar-base.ts`, `calibrar-faturamento.ts`, `psql.ts` e
    `vps/esquema.sql`;
  - `supabase/functions/empresas-receita/index.ts`;
  - `src/types/filtrosReceita.ts` e `src/lib/prospecting/filtrosReceita.ts`;
  - `src/components/prospeccao/receita/EmpresasReceitaTable.tsx` e `PainelDeFiltros.tsx`.
- **Restrições e padrões aplicáveis:**
  - moeda truncada, nunca arredondada — fonte: ADR-0011;
  - faturamento não entra na nota de fit — fonte: ADR-0042;
  - regra financeira exige teste ou evidência de validação manual — fonte:
    `.harness/boundaries.md`;
  - a base fica na VPS; o Supabase não guarda nada dela — fonte: ADR-0053.
- **Provas esperadas:**
  - conferência das três bases, do texto truncado e do selo no limite;
  - contagem na VPS por base e por faixa, depois da carga;
  - ensaio da Edge Function (ordem e filtro);
  - validação da tela pelo Victor.
- **Fora do escopo:** mudar a nota de fit (US-0014).

## Implementação

- **Versões anteriores (17/11/2026):** faixa de 40% e "Sem estimativa"; depois média por
  divisão com três bases. Substituídas a cada validação da tela (decisões acima).
- **Versão final (18/11/2026):** conferência de `faturamentoEstimado.ts` (vite-node),
  contagem na VPS e ensaio da Edge Function contra a base real, depois da carga de
  18/11/2026.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Padaria Santa Cruz (classe 1091, 122 funcionários): ≈ R$ 22,9 mi; Prumo (grupo 421, 500+ pessoas, capital R$ 54 mi): ≈ R$ 1,79 bi |
| 2 | Saúde decrescente: HU Brasil e São Luiz pelas Contas Nacionais; hospital de 500 funcionários sem capital alto: ≈ R$ 79 mi |
| 3 | Avante (sem RAIS): "acima de R$ 4,8 mi"; 2.114.018 empresas só com o piso, 100.884 aproximadas pelo modelo; nenhuma sem valor |
| 4 | Aviso só no tooltip, a partir de R$ 78 mi pela RAIS ou pelo time (Lei 9.718/1998, art. 14); selo fora da tabela |
| 5 | Tooltip com a origem ("Faturamento pela RAIS") e a conta; com capital, a combinação e o erro típico |
| 6 | Decrescente: Petrobras, Fiat, GM (56 ms); crescente começa em R$ 18 mil (52 ms) |
| 7 | Totais: Satélite 68.480; Ponte 10.324; Âncora 11.212; Ponte + Âncora 21.536 (98 ms); com setor C e MG, 531 |
| 8 | Valor do time lido com a sessão da pessoa (RLS), por CNPJ da página; filtro e ordem pela estimativa |
| — | Recusas: faixa fora da lista e faixa como texto, 400 |

- **Casos conhecidos pelo time (18/11/2026):** erro mediano de 4,4 vezes antes do capital
  para cerca de 2 vezes; Prumo e Tecno2000 cerca de 2 vezes acima do conhecido, Azevedo 15%
  abaixo, Canex cerca de 6 vezes abaixo (valores reais não ficam no repositório). Refinamento na US-0018.
- **Carga de 18/11/2026:** 2.438.184 empresas em 9 min 24 s; 223.282 pela RAIS (eram
  174.863 antes do cruzamento por CEP + CNAE). Duas tentativas em 17/11 caíram por queda de
  rede; a montagem dos funcionários passou de mais de 30 minutos para 43 segundos.
- **Modelo de empresas parecidas:** calibrado antes do cruzamento novo da RAIS; recalibrar na
  US-0018.
- **Edge Function:** publicada em 18/11/2026 (capital social e valor do time).
- **Tela:** validada pelo Victor em 18/11/2026.

## Anexo — capital social na estimativa

`src/lib/prospecting/calibracaoCapital.json`, de 18/11/2026. Com RAIS e capital a partir de
R$ 10 mi, fora das divisões 64 e 68:

`ln(faturamento) = 6,438 + 0,362 × ln(estimativa pela RAIS) + 0,417 × ln(capital) − 1,407 × (S.A.)`

| Amostra | Empresas | Erro mediano antes | Depois |
|---|---:|---:|---:|
| Companhias abertas (CVM, DFP 2024 individual, sem bancos e holdings) | 413 | 2,3 vezes | 1,9 vezes |
| Casos com faturamento conhecido pelo time (peso 10, cada um medido fora do ajuste) | 10 | 4,4 vezes | 2 vezes |

Os casos do time foram passados pelo Victor em 18/11 e não ficam no repositório (faturamento
de clientes). Simulado na base: Âncoras de 4,4 mil para 10,6 mil; Ponte de 7,4 mil para
9,4 mil. Incluir as empresas sem RAIS levaria as Âncoras a 34,6 mil (holdings e SPEs com
capital alto) e ficou de fora.

## Anexo — receita por classe e porte

`src/lib/prospecting/receitaPorPessoa.json`, montado pela API do SIDRA por
`scripts/receita/montar-receita-por-pessoa.ts` em 17/11/2026 (mil reais por pessoa,
truncados):

| Setor | Valor de partida | Porte | Tabelas |
|---|---|---|---|
| Indústria | classe da CNAE (260), senão grupo (104), nas empresas com 30+ pessoas | fator da faixa: até 4 → 0,42; 5 a 29 → 0,23; 30 a 49 → 0,34; 50 a 99 → 0,50; 100 a 249 → 0,72; 250 a 499 → 0,86; 500+ → 1,26 | PIA 10473 e 10452 |
| Comércio | classe (22), senão grupo (20), nas empresas com 20+ pessoas | fator da faixa, por divisão (varejo até 19 pessoas → 0,59) | PAC 10655 e 10647 |
| Construção | grupo (12) × faixa, já em mil reais por pessoa | junto | PAIC 6667 |
| Serviços | divisão, pela tabela abaixo | menos de 20 ou 20+ pessoas (TI: 0,62 e 1,14) | PAS 10758 e 10760 |
| Sem pesquisa anual | divisão, pela tabela abaixo (Contas Nacionais) | — | — |

Sem classe nem grupo com dado, vale a divisão. A tabela por divisão abaixo continua valendo
para serviços, para os ramos sem pesquisa anual e como último recurso.

## Anexo — receita por pessoa ocupada por divisão

Pesquisas anuais: receita líquida dividida pelo pessoal ocupado em 31/12/2024, Brasil,
truncada em mil reais. O código usa exatamente estes valores (mil reais × 1.000).
Consultado na API do SIDRA em 17/11/2026:

- **PIA-Empresa:** tabela 10451, receita líquida de vendas, empresas com 1 ou mais pessoas.
- **PAIC:** tabela 10463, receita líquida, empresas com 30 ou mais pessoas, porque a base
  não tem ME nem EPP.
- **PAC:** tabela 10647, receita operacional líquida.
- **PAS:** tabela 10758, receita operacional líquida. Ela agrupa por atividade, não por
  divisão: 49 junta os transportes ferroviário, rodoviário e dutoviário; 59 e 60 usam
  audiovisual; 62 e 63 usam tecnologia da informação; 69 a 75 usam serviços
  técnico-profissionais; 90, 91 e 93 usam atividades culturais, recreativas e esportivas; 95
  junta as duas reparações; 37 a 39 usam esgoto e resíduos; 66 usa serviços auxiliares
  financeiros.
- **Contas Nacionais 2021** (tabela de recursos e usos, 68 atividades, aba "VA"; baixada do
  servidor de arquivos do IBGE em 17/11/2026), para os ramos sem pesquisa anual: valor da
  produção dividido pelas ocupações, multiplicado por 1,62 — a mediana da razão entre as
  pesquisas anuais e as Contas Nacionais em 66 ramos com as duas fontes (comércio fora,
  porque nas Contas Nacionais a produção do comércio é a margem). As ocupações incluem
  informais, e por isso a razão passa de 1.

| Divisão | Ramo | R$ por pessoa ocupada | Fonte |
|---|---|---:|---|
| 05 | Carvão mineral | 625 mil | PIA-Empresa 2024 |
| 06 | Petróleo e gás | 17.885 mil | PIA-Empresa 2024 |
| 07 | Mineração (metálicos) | 2.157 mil | PIA-Empresa 2024 |
| 08 | Mineração (não metálicos) | 436 mil | PIA-Empresa 2024 |
| 09 | Apoio à extração mineral | 926 mil | PIA-Empresa 2024 |
| 10 | Alimentos | 756 mil | PIA-Empresa 2024 |
| 11 | Bebidas | 927 mil | PIA-Empresa 2024 |
| 12 | Fumo | 1.580 mil | PIA-Empresa 2024 |
| 13 | Têxtil | 311 mil | PIA-Empresa 2024 |
| 14 | Vestuário | 181 mil | PIA-Empresa 2024 |
| 15 | Couro e calçados | 175 mil | PIA-Empresa 2024 |
| 16 | Madeira | 334 mil | PIA-Empresa 2024 |
| 17 | Papel e celulose | 931 mil | PIA-Empresa 2024 |
| 18 | Gráfica | 257 mil | PIA-Empresa 2024 |
| 19 | Derivados de petróleo e biocombustíveis | 4.121 mil | PIA-Empresa 2024 |
| 20 | Química | 1.674 mil | PIA-Empresa 2024 |
| 21 | Farmacêutica | 910 mil | PIA-Empresa 2024 |
| 22 | Borracha e plástico | 491 mil | PIA-Empresa 2024 |
| 23 | Minerais não metálicos | 431 mil | PIA-Empresa 2024 |
| 24 | Metalurgia | 1.695 mil | PIA-Empresa 2024 |
| 25 | Produtos de metal | 370 mil | PIA-Empresa 2024 |
| 26 | Eletrônicos e informática | 1.271 mil | PIA-Empresa 2024 |
| 27 | Máquinas e materiais elétricos | 704 mil | PIA-Empresa 2024 |
| 28 | Máquinas e equipamentos | 705 mil | PIA-Empresa 2024 |
| 29 | Automotiva | 1.232 mil | PIA-Empresa 2024 |
| 30 | Outros equipamentos de transporte | 902 mil | PIA-Empresa 2024 |
| 31 | Móveis | 222 mil | PIA-Empresa 2024 |
| 32 | Produtos diversos | 294 mil | PIA-Empresa 2024 |
| 33 | Manutenção e instalação de máquinas | 234 mil | PIA-Empresa 2024 |
| 37 | Esgoto | 177 mil | PAS 2024 |
| 38 | Resíduos e reciclagem | 177 mil | PAS 2024 |
| 39 | Descontaminação | 177 mil | PAS 2024 |
| 41 | Construção de edifícios | 273 mil | PAIC 2024 (30+ pessoas) |
| 42 | Obras de infraestrutura | 271 mil | PAIC 2024 (30+ pessoas) |
| 43 | Serviços para construção | 171 mil | PAIC 2024 (30+ pessoas) |
| 45 | Veículos: comércio e reparação | 800 mil | PAC 2024 |
| 46 | Comércio atacadista | 1.863 mil | PAC 2024 |
| 47 | Comércio varejista | 417 mil | PAC 2024 |
| 49 | Transporte terrestre | 314 mil | PAS 2024 |
| 50 | Transporte aquaviário | 1.097 mil | PAS 2024 |
| 51 | Transporte aéreo | 1.253 mil | PAS 2024 |
| 52 | Armazenagem e apoio ao transporte | 406 mil | PAS 2024 |
| 53 | Correio e entregas | 207 mil | PAS 2024 |
| 55 | Alojamento | 153 mil | PAS 2024 |
| 56 | Alimentação | 138 mil | PAS 2024 |
| 58 | Edição | 358 mil | PAS 2024 |
| 59 | Cinema. vídeo. TV e música | 407 mil | PAS 2024 |
| 60 | Rádio e televisão | 407 mil | PAS 2024 |
| 61 | Telecomunicações | 700 mil | PAS 2024 |
| 62 | Tecnologia da informação | 447 mil | PAS 2024 |
| 63 | Serviços de informação | 447 mil | PAS 2024 |
| 66 | Auxiliares de finanças e seguros | 654 mil | PAS 2024 |
| 68 | Atividades imobiliárias | 219 mil | PAS 2024 |
| 69 | Jurídico e contabilidade | 252 mil | PAS 2024 |
| 70 | Sedes e consultoria em gestão | 252 mil | PAS 2024 |
| 71 | Arquitetura e engenharia | 252 mil | PAS 2024 |
| 72 | Pesquisa e desenvolvimento | 252 mil | PAS 2024 |
| 73 | Publicidade e pesquisa de mercado | 252 mil | PAS 2024 |
| 74 | Outros serviços técnicos | 252 mil | PAS 2024 |
| 75 | Veterinária | 252 mil | PAS 2024 |
| 77 | Aluguéis não imobiliários | 365 mil | PAS 2024 |
| 78 | Mão de obra | 57 mil | PAS 2024 |
| 79 | Agências de viagem | 261 mil | PAS 2024 |
| 80 | Vigilância e segurança | 97 mil | PAS 2024 |
| 81 | Serviços para edifícios | 69 mil | PAS 2024 |
| 82 | Apoio administrativo | 102 mil | PAS 2024 |
| 90 | Artes e espetáculos | 132 mil | PAS 2024 |
| 91 | Patrimônio cultural e ambiental | 132 mil | PAS 2024 |
| 93 | Esporte e lazer | 132 mil | PAS 2024 |
| 95 | Reparação de equipamentos e objetos | 134 mil | PAS 2024 |
| 96 | Serviços pessoais | 111 mil | PAS 2024 |
| 01 | Agricultura e pecuária | 137 mil | Contas Nacionais 2021 × 1,62 |
| 02 | Produção florestal | 109 mil | Contas Nacionais 2021 × 1,62 |
| 03 | Pesca e aquicultura | 109 mil | Contas Nacionais 2021 × 1,62 |
| 35 | Eletricidade e gás | 4.221 mil | Contas Nacionais 2021 × 1,62 |
| 36 | Água | 286 mil | Contas Nacionais 2021 × 1,62 |
| 64 | Serviços financeiros | 765 mil | Contas Nacionais 2021 × 1,62 |
| 65 | Seguros e previdência | 765 mil | Contas Nacionais 2021 × 1,62 |
| 84 | Administração pública | 343 mil | Contas Nacionais 2021 × 1,62 |
| 85 | Educação | 88 mil | Contas Nacionais 2021 × 1,62 |
| 86 | Saúde | 158 mil | Contas Nacionais 2021 × 1,62 |
| 87 | Saúde com assistência social | 158 mil | Contas Nacionais 2021 × 1,62 |
| 88 | Assistência social | 158 mil | Contas Nacionais 2021 × 1,62 |
| 92 | Jogos e apostas | 74 mil | Contas Nacionais 2021 × 1,62 |
| 94 | Organizações associativas | 69 mil | Contas Nacionais 2021 × 1,62 |
| 97 | Serviços domésticos | 18 mil | Contas Nacionais 2021 × 1,62 |
| 99 | Organismos internacionais | 69 mil | Contas Nacionais 2021 × 1,62 |

## Anexo — modelo de empresas parecidas

Sem funcionários na RAIS, o modelo prevê os funcionários pelas características da empresa e
multiplica pela receita por pessoa do ramo. Regressão ridge (λ = 1) do logaritmo dos
funcionários sobre: capital social, idade, filiais, sócios, dívida ativa, e-mail, telefone,
setor, natureza jurídica e estado. Calibrado em 17/11/2026 por
`scripts/receita/calibrar-faturamento.ts`, com as empresas que têm RAIS; 20% ficaram de fora
para medir o erro (coeficientes e medidas em `src/lib/prospecting/modeloDeFaturamento.json`).

| Funcionários reais | Empresas no teste | Erro mediano |
|---|---:|---:|
| 1 a 9 | 23.503 | 2,6 vezes |
| 10 a 49 | 14.051 | 2,1 vezes |
| 50 a 249 | 6.692 | 3,9 vezes |
| 250 ou mais | 2.512 | 8,5 vezes |
| Todas | 47.915 | 2,6 vezes (37% dentro do dobro; R² 0,39) |

O modelo achata as grandes: sem RAIS, capital social, idade, filiais e sócios dizem pouco
sobre o tamanho. Por isso vale só quando passa do piso de R$ 4,8 mi, aparece como
"aproximado" e não dá o selo de Lucro Real.
