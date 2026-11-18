# US-0015 — Filtrar e ordenar pela distância de Formiga

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** Victor Couto, 2026-11-18
- **Relacionadas:** US-0001, US-0003, US-0011, US-0017, ADR-0053

## Descrição

**Como** pessoa do comercial,
**quero** ver a que distância de Formiga cada empresa está, e filtrar por isso,
**para** priorizar contas que dá para visitar.

### Contexto

A proximidade com Formiga (MG), sede da Origami, pesa na escolha de quem abordar. Hoje
isso vive no "Anel" da empresa, um texto livre preenchido à mão. A distância passa a ser
calculada para toda empresa da base e substitui o Anel (US-0017).

### Escopo

- Inclui: coluna "Distância" na lista da base, em km, logo depois da empresa, centralizada
  como os outros números.
- Inclui: ordenar pela coluna; o primeiro clique traz as mais próximas.
- Inclui: filtro "Distância de Formiga" no painel, de escolha única: qualquer, até 50 km,
  até 100 km, até 200 km, até 300 km e até 500 km.
- Inclui: a carga calcula e grava a distância de cada empresa, em linha reta, entre a sede
  do município de Formiga e a sede do município da empresa, com as coordenadas do IBGE.
- Não inclui: distância por estrada; outro ponto de partida que não Formiga; distância nas
  contas da aba "Na Prospecção", que vai sair da tela (US-0011).

## Critérios de aceite

**Cenário 1: distância na lista**

- **Dado** uma empresa da base;
- **Então** vejo a distância em km, em linha reta, da sede de Formiga à sede do município
  da empresa, truncada em km inteiros;
- **E** empresas de Formiga mostram "0 km"; de Belo Horizonte, 167 km; de São Paulo, 363 km.

**Cenário 2: filtrar**

- **Quando** escolho "até 100 km";
- **Então** a lista mostra só as empresas de municípios a até 100 km de Formiga;
- **E** o total e o botão "Filtros" contam o filtro como os demais;
- **E** o grupo recolhido mostra "até 100 km" no título.

**Cenário 3: ordenar**

- **Quando** clico em "Distância" no cabeçalho;
- **Então** as empresas mais próximas aparecem primeiro;
- **E** um segundo clique inverte.

**Cenário 4: município renomeado**

- **Dado** uma empresa de um município que a Receita grafa com o nome antigo (ex.: "PARATI",
  hoje Paraty; "BRASOPOLIS", hoje Brazópolis);
- **Então** a distância aparece normalmente.

**Cenário 5: sem município reconhecido**

- **Dado** uma empresa cujo município não casa com o IBGE;
- **Então** a distância aparece como "—";
- **E** ela não entra em nenhuma faixa do filtro e vai para o fim da ordenação.

## Decisões (Victor Couto, 2026-11-16 e 2026-11-18)

- Distância em linha reta, por município, com as coordenadas oficiais do IBGE (16/11).
- Filtro com faixas fixas de 50, 100, 200, 300 e 500 km; a distância também é coluna
  e ordenação (16/11).
- A distância de Formiga substitui o Anel (16/11).
- Coluna própria, logo depois da empresa (18/11).
- A aba "Na Prospecção" vai sair da tela, que fica com "A classificar" e depois "A abordar";
  a distância não entra nas contas da Prospecção (18/11; ver US-0011).

## Pontos em aberto

### Hipóteses para validar

- "Em linha reta" basta para decidir visita. Origem: decisão de 2026-11-16; por estrada,
  a distância costuma ser de 20% a 40% maior.
- A sede do município representa bem onde a empresa está. Origem: a base só tem o
  município, não o endereço geocodificado; em municípios grandes a empresa pode estar a
  dezenas de km da sede.

## Contexto técnico

- **Objetivo observável:** coluna, filtro e ordem por distância de Formiga na lista da base.
- **Comportamento atual:** PROVADO (levantamento de 18/11/2026):
  - a base guarda o município pelo nome e pela UF (`pulse.empresas.municipio`, `uf`),
    sem código do IBGE nem coordenadas;
  - casando por UF + nome sem acento com a API de localidades do IBGE, 5.554 das 5.571
    cidades da base casam direto; as 17 restantes (2.347 empresas, 0,1%) são municípios
    renomeados e entram por uma tabela de nomes antigos (anexo);
  - coordenadas: sede municipal das Localidades do Brasil 2022 do IBGE
    (`BR_localidades_2022.gpkg`, subcategoria "Sede Municipal"; Brasília como "Capital
    Federal"; Fernando de Noronha como distrito estadual) — todas as cidades da base têm
    coordenada;
  - o centroide da malha municipal foi descartado: em Formiga fica 13 km da sede, e no
    país chega a 409 km.
- **Comportamento esperado:**
  - arquivo de sedes (UF + nome → latitude e longitude) montado por um script a partir do
    IBGE, com a fonte citada no contrato (`.harness/integrations/base-receita-vps.md`);
  - a carga grava `distancia_km` (inteiro, truncado; nulo sem município) em
    `pulse.empresas`, pela fórmula de haversine (raio médio da Terra, 6.371,0088 km);
  - índice para ordenar e filtrar; ordem `distancia` e filtro `distanciaMaxima` (lista
    fechada) na Edge Function; coluna, filtro e grupo no painel na tela.
- **Superfícies conhecidas:**
  - `scripts/receita/sincronizar-base.ts` e `scripts/receita/vps/esquema.sql`;
  - `supabase/functions/empresas-receita/index.ts`;
  - `src/types/filtrosReceita.ts`, `src/lib/prospecting/filtrosReceita.ts`,
    `empresasReceita.ts`;
  - `src/components/prospeccao/receita/EmpresasReceitaTable.tsx` e `PainelDeFiltros.tsx`.
- **Riscos para investigar:** a carga roda de novo (cerca de 10 minutos).
- **Provas esperadas:** distância de Formiga, Belo Horizonte e São Paulo conferida; filtro
  e ordem; município renomeado; empresa sem município.
- **Fora do escopo:** rotas, mapa, distância na Prospecção.

## Implementação

Carga de 18/11/2026 e ensaio da Edge Function contra a base real.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Formiga 0 km (890 empresas); Arcos 23; Divinópolis 63; Belo Horizonte 167; São Paulo 363; Brasília 582 |
| 2 | Até 50 km: 3.263 empresas; até 100 km: 13.899; até 500 km: mais de 100 mil; faixa fora da lista (70): 400 |
| 3 | Mais perto: Formiga (50 ms); mais longe: Mâncio Lima (AC), 3.282 km (57 ms) |
| 4 | Parati (RJ) → Paraty, 314 km; Bom Jesus de Goiás → Bom Jesus (GO), renomeado em 2022 e achado na carga, 516 km |
| 5 | Depois da carga, 0 empresas sem distância (as 103 de Bom Jesus de Goiás gravadas à parte, com o mesmo cálculo) |

- **Desempenho:** ordem combinada com filtro ou busca que pega poucas empresas fazia o banco
  percorrer a tabela (busca "belo horizonte" por distância estourou 5 s; até 100 km por
  faturamento, 3,1 s). A página conta até 20 mil e, abaixo disso, separa as filtradas antes
  de ordenar: 143 ms; as buscas de cidades grandes (mais de 20 mil empresas) ficaram em
  1,2 a 1,3 s.
- **Carga:** cerca de 25 minutos, pela rede lenta entre o Mac e a VPS; a tela fica indisponível
  durante a carga (consultas canceladas pelo prazo de 5 s).
- **Edge Function:** publicada em 18/11/2026.
- **Tela:** validada pelo Victor em 18/11/2026.

## Anexo — municípios renomeados

Grafia da Receita → nome e código do IBGE:

| UF | Receita | IBGE | Código |
|---|---|---|---|
| RS | SANTANA DO LIVRAMENTO | Sant'Ana do Livramento | 4317103 |
| SC | BALNEARIO DE PICARRAS | Balneário Piçarras | 4212809 |
| RJ | PARATI | Paraty | 3303807 |
| PA | SANTA ISABEL DO PARA | Santa Izabel do Pará | 1506500 |
| MT | SANTO ANTONIO DO LEVERGER | Santo Antônio de Leverger | 5107800 |
| MG | BRASOPOLIS | Brazópolis | 3108909 |
| PA | ELDORADO DOS CARAJAS | Eldorado do Carajás | 1502954 |
| BA | MUQUEM DE SAO FRANCISCO | Muquém do São Francisco | 2922250 |
| BA | SANTA TERESINHA | Santa Terezinha | 2928505 |
| TO | COUTO DE MAGALHAES | Couto Magalhães | 1706001 |
| RR | SAO LUIZ | São Luiz | 1400605 |
| RN | ARES | Arez | 2401206 |
| TO | SAO VALERIO DA NATIVIDADE | São Valério | 1720499 |
| RN | BOA SAUDE | Januário Cicco | 2405306 |
| TO | FORTALEZA DO TABOCAO | Tabocão | 1708254 |
| MG | AMPARO DA SERRA | Amparo do Serra | 3102506 |
| SE | AMPARO DE SAO FRANCISCO | Amparo do São Francisco | 2800100 |
| GO | BOM JESUS DE GOIAS | Bom Jesus | 5203500 |
