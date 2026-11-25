# PRD — Pulse

Fonte de verdade do **que** o produto faz. As decisões de **como** ficam nos ADRs
(`../adr/`), as regras de negócio no glossário (`../domain-glossary.md`) e quem
acessa cada coisa na matriz de capacidades (`../capability-matrix.md`). Antes de
mudar comportamento, consulte as histórias aprovadas e os ADRs, para não passar
por cima de critério ou decisão já tomada.

Esta pasta segue o modelo do PRD do Origami Buds. O fluxo ainda não está
registrado em ADR no Pulse: vale propor um, como o ADR-0007 do Buds.

## Visão

O Pulse é a plataforma operacional da Origami: comercial, projetos, pessoas,
horas, financeiro, estratégia e análises num lugar só (`../context.md`).

## Regras do fluxo

1. Toda mudança de interação com o usuário nasce como **história pequena e
   testável** em `stories/`, no formato do `template.md`.
2. **A pasta é o status.** Cada história fica na pasta do seu status
   (`stories/README.md`); mudar o status = `git mv` + linha **Status** do
   cabeçalho, no mesmo commit.
3. Desenvolvimento só começa com a história **Pronta para desenvolver**, ou
   seja, aprovada pelo tech lead ou PO.
4. Uma história só fica **Pronto** quando todos os cenários têm prova (teste
   automatizado ou evidência registrada) e o CI está verde.
5. Mudar o comportamento de uma história pronta exige história nova, que cita
   e substitui a anterior (a antiga vai para **Arquivada**). Nunca se reescreve
   uma história pronta.

### Status (= pasta)

| Pasta | Status | Significado |
|---|---|---|
| `1-a-fazer/` | A fazer | Registrada, sem refinamento iniciado, ou adiada |
| `2-em-refinamento/` | Em refinamento | Em discussão, com decisões pendentes |
| `3-pronta-para-desenvolver/` | Pronta para desenvolver | Aprovada, ainda não iniciada |
| `4-em-desenvolvimento/` | Em desenvolvimento | Em código, ou com prova pendente |
| `5-pronto/` | Pronto | Cenários provados e CI verde; aguarda implantação |
| `9-arquivadas/` | Arquivada | Substituída ou descartada (motivo na história) |

## Perfis

Os perfis do Pulse são capacidades, não papéis (ADR-0027). As histórias citam a
capacidade que governa a ação.

- **Pessoa do comercial:** tem `prospeccao:ler` para ver e `prospeccao:editar`
  para classificar e abrir oportunidade.
- **GP ou admin:** tem `financeiro:ler` para ver custo, margem e despesas do
  projeto. O custo de mão de obra por pessoa é só do admin ou do GP do próprio
  projeto.

## Épicos e histórias

### Empresas da Receita (aberto em 2026-11-15)

A tela Comercial > Empresas deixa de listar só as contas que já estão na
Prospecção. Ela passa a consultar uma base própria, montada pelo Victor numa VPS,
com os dados abertos da Receita, a RAIS e a dívida ativa da PGFN. O time comercial
filtra essa base, avalia cada empresa e abre oportunidade para as que valem a
conversa. A oportunidade nasce em **A abordar** no Pipeline.

- **Protótipo:** `prototipos/empresas-da-receita.html` (abre direto no navegador).
  Versão publicada, privada até ser compartilhada:
  https://claude.ai/artifact/9y8hstXtxwHzkYwGx32wdw
- **Amostra do protótipo:** 70 matrizes ativas reais da base, lidas em 2026-11-15.

| ID | História | Persona | Status | Prontidão |
|---|---|---|---|---|
| [US-0001](stories/5-pronto/US-0001-tecnica-pulse-le-a-base-da-receita.md) | O Pulse lê a base da Receita com segurança e rapidez | Técnica | Pronto | Pronta com ressalvas |
| [US-0002](stories/5-pronto/US-0002-comercial-ver-empresas-da-base-da-receita.md) | Ver as empresas da base da Receita na tela Empresas | Pessoa do comercial | Pronto | Pronta |
| [US-0003](stories/5-pronto/US-0003-comercial-filtrar-empresas.md) | Filtrar as empresas pelo que importa para a Origami | Pessoa do comercial | Pronto | Pronta |
| [US-0004](stories/5-pronto/US-0004-comercial-recolher-os-filtros.md) | Recolher os filtros para ver mais da lista | Pessoa do comercial | Pronto | Pronta |
| [US-0005](stories/5-pronto/US-0005-comercial-buscar-empresa.md) | Buscar empresa por nome, CNPJ ou cidade | Pessoa do comercial | Pronto | Pronta |
| [US-0006](stories/5-pronto/US-0006-comercial-faturamento-estimado.md) | Ver o faturamento estimado de cada empresa | Pessoa do comercial | Pronto | Pronta |
| [US-0007](stories/5-pronto/US-0007-comercial-ficha-da-empresa.md) | Avaliar a empresa pela ficha antes de decidir | Pessoa do comercial | Pronto | Pronta |
| [US-0008](stories/5-pronto/US-0008-comercial-colocar-para-abordar.md) | Mover empresas para abordar | Pessoa do comercial | Pronto | Pronta |
| [US-0009](stories/9-arquivadas/US-0009-comercial-abrir-oportunidades-em-lote.md) | Abrir oportunidades em lote | Pessoa do comercial | Arquivada (na US-0008) | — |
| [US-0010](stories/5-pronto/US-0010-comercial-nao-agora-e-descartar.md) | Descartar a empresa ou marcar "Não agora" | Pessoa do comercial | Pronto | Pronta com ressalvas |
| [US-0011](stories/9-arquivadas/US-0011-comercial-abas-da-classificacao.md) | Acompanhar a classificação pelas abas e desfazer | Pessoa do comercial | Arquivada (tela sem abas) | — |
| [US-0012](stories/2-em-refinamento/US-0012-comercial-classificar-pelo-teclado.md) | Classificar pelo teclado | Pessoa do comercial | Em refinamento | Pronta |
| [US-0013](stories/1-a-fazer/US-0013-comercial-salvar-filtro-para-o-time.md) | Salvar um filtro para o time | Pessoa do comercial | A fazer | Não pronta |
| [US-0014](stories/5-pronto/US-0014-comercial-fit-com-funcionarios-e-divida.md) | Fit por serviço que separa as contas: tamanho real, dívida, distância e faturamento | Pessoa do comercial | Pronto | Pronta |
| [US-0015](stories/5-pronto/US-0015-comercial-distancia-de-formiga.md) | Filtrar e ordenar pela distância de Formiga | Pessoa do comercial | Pronto | Pronta |
| [US-0016](stories/9-arquivadas/US-0016-comercial-tipo-de-conta.md) | Classificar a conta como Âncora, Ponte ou Satélite | Pessoa do comercial | Arquivada (na US-0008) | — |
| [US-0017](stories/5-pronto/US-0017-comercial-anel-e-tier-saem.md) | Anel e Tier saem da Prospecção | Pessoa do comercial | Pronto | Pronta |
| [US-0018](stories/5-pronto/US-0018-comercial-refinar-faturamento-estimado.md) | Refinar o faturamento estimado | Pessoa do comercial | Pronto | Pronta com ressalvas |
| [US-0019](stories/5-pronto/US-0019-comercial-marca-de-relacionamento.md) | Ver a relação da Origami com cada empresa | Pessoa do comercial | Pronto | Pronta com ressalvas |
| [US-0020](stories/5-pronto/US-0020-comercial-estudo-da-conta.md) | Estudar a conta antes de abordar | Pessoa do comercial | Pronto | Pronta com ressalvas |
| [US-0021](stories/5-pronto/US-0021-comercial-metricas-do-novo-fluxo.md) | Ajustar as Métricas ao novo fluxo de abordagem | Pessoa do comercial | Pronto | Pronta com ressalvas |
| [US-0022](stories/5-pronto/US-0022-comercial-bant-da-oportunidade.md) | Qualificar a oportunidade pelo BANT, do começo ao fim | Pessoa do comercial | Pronto | Pronta com ressalvas |
| [US-0023](stories/5-pronto/US-0023-comercial-etapa-qualificacao.md) | Qualificar a empresa antes de abordar | Pessoa do comercial | Pronto | Pronta |
| [US-0024](stories/5-pronto/US-0024-comercial-ia-propoe-bant-pelo-mcp.md) | IA propõe evidências de BANT pela assinatura do Claude | Pessoa do comercial | Pronto | Pronta |
| [US-0044](stories/5-pronto/US-0044-comercial-studio-vira-dev-de-software.md) | "Studio de Produto" passa a se chamar "Dev. de Software" | Pessoa da Origami | Pronto | Pronta |
| [US-0038](stories/5-pronto/US-0038-comercial-bant-comprovado-para-qualificar.md) | Só o BANT comprovado qualifica a oportunidade | Pessoa do comercial | Pronto | Pronta |
| [US-0040](stories/5-pronto/US-0040-comercial-distancia-por-faixa-livre.md) | Distância de Formiga escolhida pela pessoa | Pessoa do comercial | Pronto | Pronta |
| [US-0041](stories/5-pronto/US-0041-comercial-tirar-atividades-da-lista.md) | Tirar atividades da lista (ex.: holdings) | Pessoa do comercial | Pronto | Pronta |
| [US-0042](stories/5-pronto/US-0042-comercial-filtros-em-qualificacao.md) | Filtros na aba "Em qualificação" para decidir quem analisar primeiro | Pessoa do comercial | Pronto | Pronta |

#### Ordem de implementação proposta

| Ordem | Fatia | Histórias |
|---|---|---|
| 1 | Acesso à base e lista | US-0001, US-0002 |
| 2 | Encontrar empresas | US-0003, US-0004, US-0005, US-0006, US-0015 |
| 3 | Decidir e abordar | US-0007, US-0008, US-0019, US-0020 |
| 4 | Triagem completa | US-0010, US-0012, US-0017 |
| Depois | — | US-0013, US-0014, US-0018 |

#### Decisões do Victor Couto (2026-11-15 e 2026-11-16)

- A nova tela substitui a aba Empresas do Comercial.
- Empresa classificada pelo time vira oportunidade em **A abordar**.
- O botão se chama **Abrir oportunidade**.
- O faturamento estimado fica na tabela, como coluna.
- A idade da empresa é um filtro próprio.
- Os filtros ficam à direita e podem ser recolhidos.
- O recorte da base (só matrizes ativas, médias e grandes) não é filtro: aparece
  numa frase na linha do total.
- As funções da tela atual vão para a aba "Na Prospecção" da nova tela: contas da
  Prospecção com filtro de abordagem, anel, tier e responsável, "Importar CNPJs" e o
  link do gatilho.
- "Não agora" volta para "A classificar" em 90 dias.
- O descarte vale para o time inteiro, e qualquer pessoa com `prospeccao:editar`
  pode desfazer.
- O botão rápido abre a oportunidade com quem clicou e a alavanca nova "Base da Receita".
- Conta da Prospecção sem oportunidade em andamento volta para "A classificar",
  menos quando a última perda foi "Pediu para parar".
- Motivos do descarte: Sem fit, Já é cliente ou parceiro, Concorrente, Dados
  inválidos e Outro motivo, com texto obrigatório.
- Desfazer a oportunidade aberta vale até a primeira atividade, tarefa ou contato.
- A lista aparece em até 2 segundos depois de mudar um filtro.
- Receita por funcionário de cada setor vem do IBGE, com fonte citada e aprovação do
  Victor; a faixa é de 40% para cada lado e o valor gravado é o do meio.
- O último filtro fica guardado no navegador.
- CNPJ completo na busca ignora os filtros.
- A busca procura nome, CNPJ e cidade na mesma caixa; CNPJ de filial leva à matriz; a
  busca segue a ordenação da tabela e usa índice de texto na VPS (17/11, US-0005).
- O painel de filtros começa recolhido na primeira visita e a tela lembra a escolha; no
  celular e no tablet ele abre por cima da lista, com "Ver N empresas" (17/11, US-0004).
- Faturamento estimado: um valor só ("≈ R$ 723 mi") com a base; pela RAIS × receita por
  pessoa do ramo (IBGE: pesquisas anuais 2024 e, sem pesquisa, Contas Nacionais 2021 × 1,62);
  sem RAIS, modelo de empresas parecidas quando passa do piso, senão "acima de R$ 4,8 mi";
  selo de Lucro Real só pela RAIS; a ficha, o "Calculado" e a sugestão do tipo ficam na
  US-0007, US-0008 e US-0016 (17/11).
- Fluxo de abordagem (18/11): selecionar na lista → mover para abordar com o tipo de conta
  (US-0008, que absorve a US-0009 e a US-0016) → ver a relação da Origami com a empresa
  (US-0019) → estudar a conta, com pessoas, influência e desk research por IA (US-0020, ADR
  novo revisando o 0042). Alavanca é o canal de chegada: definida ao abordar.
- Qualificação e BANT (19/11): fluxo Selecionar → **Qualificação** (etapa nova da oportunidade,
  antes de A abordar, numa aba "Em qualificação" da tela Empresas; o Pipeline começa em A
  abordar; US-0023) → A abordar → … → Oportunidade qualificada → Ganho ou Perda. O
  BANT acompanha o mesmo cartão: letras em quatro estados (não sei, indício, confirmado, não
  atende), nota de 0 a 100 e meta por etapa; só a entrada em "Oportunidade qualificada" exige
  nota 75 e nenhum "Não atende" (US-0022). O desk research com IA propõe indícios, e a pessoa
  aceita.
- IA na qualificação (19/11, ADR-0054): a IA propõe evidências de BANT com fonte e a pessoa
  aceita ou recusa. Fase 1 pela assinatura do Claude, via MCP (US-0024); fase 2 dentro do
  Pulse, com chave de API, quando o volume justificar.
- Filtros da tela Empresas (18/11, revisão da US-0004): só o ícone, com selo da quantidade de
  filtros ativos, abre os filtros numa gaveta por cima da lista em qualquer tela; o painel ao
  lado da lista saiu.
- Relação com a Origami (18/11, US-0019): coluna própria com filtro; ordem Cliente ativo
  (projeto em planejamento, andamento ou pausado) → Sendo abordada → Já foi cliente →
  Abordada sem sucesso (Perda nos últimos 12 meses); "Pediu para parar" só avisa; a ficha
  mostra o histórico resumido.
- Tela Empresas sem abas (18/11): é só um filtro da base; a empresa movida para abordar vai
  direto para A abordar no Pipeline de Oportunidades, já com o tipo de conta (obrigatório).
  A lista de contas sai; a ficha completa da empresa abre de dentro da oportunidade. A US-0011
  foi arquivada. "Importar CNPJs" fica, para empresa fora da base (uso raro). O "Ver contas"
  das Métricas sai; as Métricas são revistas na US-0021.
- Distância de Formiga: coluna própria, sede do município do IBGE (Localidades 2022), linha
  reta (18/11, US-0015).
- ~~Todas as abas mostram contagem, menos "A classificar".~~ Superada em 18/11: a tela não tem abas.
- Anel e Tier saem. No lugar deles entram a distância de Formiga (em linha reta, por
  cidade, com coordenadas do IBGE, filtro de 50 a 500 km) e o tipo de conta Âncora, Ponte
  ou Satélite (sugerido pelo faturamento estimado e confirmado pela pessoa, guardado na
  empresa). O filtro de faturamento passa a usar as faixas do tipo de conta.
- A lista da base navega até as 10 mil primeiras de cada ordem; depois, os filtros
  (medido com a base real, ADR-0053).
- **A base fica na VPS; o Supabase não guarda nada dela** (plano gratuito). A tela lê
  pela Edge Function `empresas-receita`, que conecta no Postgres da VPS por SSL, com um
  usuário só de leitura (ADR-0053).
- O tipo de conta é obrigatório ao abrir a oportunidade; sem sugestão, o botão rápido
  abre a ficha para a pessoa escolher.
- O Tier atual é convertido em tipo de conta onde der.
- As opções de filtro não mostram contagem; só o total da lista aparece.
- Ao abrir a oportunidade, o faturamento calculado entra na empresa com a base nova
  "Calculado", que o time pode substituir.
- A tela abre com o último filtro usado; no primeiro acesso, com "Indústria de
  transformação".
- (17/11) Saem do recorte órgãos públicos, condomínios, igrejas, partidos e candidatos.
  Associações e produtor rural ficam e podem ser tirados pelo filtro de natureza.
- (17/11) Atividade segue a CNAE do IBGE em três níveis (setor, ramo, CNAE), para todos os
  tipos de atividade. Olha o CNAE principal, e a caixa "Incluir atividade secundária"
  amplia.
- (17/11) Funcionários vai de "até 19" a "500 ou mais", com a opção "Sem informação na
  RAIS".
- (17/11) Os filtros de faturamento e de distância entram na US-0006 e na US-0015.

#### Decisões pendentes do épico

1. **Nota de fit:** passa a considerar funcionários e dívida ativa. Ver US-0014.
2. **Preparar a VPS** (SSL, regras de acesso, porta, usuários) e publicar a função.
   Ver US-0001 e `../integrations/base-receita-vps.md`.
3. **Tabela de receita por funcionário por setor:** levantar no IBGE e aprovar.
   Ver US-0006.
4. **Limite de empresas por lote.** Ver US-0009.
5. ~~**Tabela de conversão do Tier**~~ — decidido em 23/11/2026: pelo faturamento, não pelo
   número do Tier. Ver US-0017.
6. **Tipo de conta no lote.** Ver US-0009.

#### A base mapeada (2026-11-15)

Banco PostgreSQL `cnpj`, lido por um usuário só de leitura (`pulse_leitura`) através
de túnel SSH. Não há chaves estrangeiras declaradas; tudo liga por `cnpj_basico`.

| Tabela | Linhas (estimadas) | O que traz |
|---|---|---|
| `estabelecimentos` | 16,9 milhões | CNAE principal e secundários, situação, matriz ou filial, endereço, e-mail e telefone |
| `empresas` | 14,9 milhões | razão social, natureza jurídica, capital social, porte |
| `socios` | 8,2 milhões | sócios e representantes, qualificação, entrada, faixa etária, CPF mascarado |
| `rais_estabelecimentos` | 13,5 milhões | funcionários por unidade, RAIS 2025 |
| `empresas_funcionarios_total` | 591 mil | funcionários somados por empresa |
| `pgfn_resumo` | 447 mil | dívida ativa da União por tipo, inscrições, datas |
| `cnaes`, `municipios`, `naturezas_juridicas` | — | tabelas de apoio |
| `vw_cnpj` | view | estabelecimento com os dados da empresa |

O que a base tem e não tem, e por que importa:

- **Só porte "Demais".** Nenhuma ME ou EPP: são as médias e grandes do país.
- **Sem regime tributário.** O sinal da Lei do Bem (Lucro Real) continua vindo da
  consulta da Receita que o Pulse já faz (ADR-0041).
- **Sem faturamento.** A Receita não informa; o capital social não serve como
  substituto (glossário).
- **Volume:** 3.174.425 matrizes ativas; 57.378 delas na indústria de
  transformação, 5.098 na extrativa e 27.289 em tecnologia; 9.474 indústrias têm
  50 funcionários ou mais.
- **Desempenho:** uma contagem sobre a base inteira levou de 30 a 45 segundos.
  Os índices existentes cobrem CNAE principal, UF com município e situação, e
  `cnpj_basico`; não há índice para idade, natureza jurídica isolada nem busca por
  nome.

### Custos do projeto (aberto em 2026-11-23)

A análise do projeto Projeto Fator S | UFLA (Paraíso), em 23/11/2026, mostrou que a
Visão Geral, a aba Despesas e a seção Mão de Obra calculam o custo do projeto cada
uma à sua maneira, e os números não batem. O número correto é o KPI "Custo
realizado" da aba Despesas (R$ 4.755,27 no Paraíso). As correções valem para todos
os projetos, porque o defeito está no cálculo das telas, não nos dados lançados.

| ID | História | Persona | Status | Prontidão |
|---|---|---|---|---|
| [US-0025](stories/5-pronto/US-0025-projetos-custo-do-projeto-igual-em-todas-as-abas.md) | O custo do projeto é o mesmo em todas as abas | GP ou admin | Pronto | Pronta |
| [US-0026](stories/5-pronto/US-0026-projetos-grafico-de-custos-mostra-todos-os-meses.md) | O gráfico de custos mostra todos os meses do projeto | GP ou admin | Pronto | Pronta |
| [US-0027](stories/4-em-desenvolvimento/US-0027-projetos-mao-de-obra-mostra-horas-lancadas.md) | A seção Mão de Obra mostra as horas lançadas | GP ou admin | Em desenvolvimento | Pronta com ressalvas |
| [US-0028](stories/5-pronto/US-0028-projetos-grafico-planejado-x-realizado-so-com-totais.md) | O gráfico Planejado × Realizado mostra só os totais | GP ou admin | Pronto | Pronta com ressalvas |
| [US-0029](stories/4-em-desenvolvimento/US-0029-projetos-total-dos-custos-lancados.md) | Ver o total dos custos lançados | GP ou admin | Em desenvolvimento | Pronta |
| [US-0030](stories/4-em-desenvolvimento/US-0030-projetos-lancamento-so-dentro-do-periodo.md) | Lançar horas e custos só dentro do período do projeto | GP ou admin | Em desenvolvimento | Pronta |
| [US-0031](stories/4-em-desenvolvimento/US-0031-projetos-forecast-usa-todos-os-meses.md) | O forecast e a curva da aba Financeiro usam todos os meses do projeto | GP ou admin | Em desenvolvimento | Pronta |
| [US-0032](stories/4-em-desenvolvimento/US-0032-projetos-card-de-forecast-claro.md) | O card de forecast diz o que significa | GP ou admin | Em desenvolvimento | Pronta |
| [US-0033](stories/5-pronto/US-0033-projetos-pl-realizado.md) | Ver o P&L realizado ao lado do projetado | GP ou admin | Pronto | Pronta |

#### Ordem de implementação proposta

| Ordem | Fatia | Histórias |
|---|---|---|
| 1 | Um número só de custo | US-0025 |
| 2 | Números certos na aba Despesas | US-0026, US-0027 |
| 3 | Leitura mais clara | US-0028, US-0029 |
| 4 | Lançar só no período | US-0030 |
| 5 | Financeiro do projeto | US-0031, US-0032, US-0033 |

#### Decisões do Victor Couto (2026-11-23)

- O tooltip do gráfico mensal mantém a quebra MO / Outros sob cada total (US-0028).
- O total da lista de Custos é sempre geral, não acompanha o filtro de tipo (US-0029).
- Lançamento fora do período aparece num mês extra do gráfico e entra no total
  (US-0026).
- Não se lança em projeto concluído, e lançamentos só valem entre a data de início e a
  data de fim do projeto (US-0030). O admin pode lançar, editar e apagar em projeto
  concluído; para o custo vale a data do custo, não a de pagamento; em projeto concluído
  a regra vale também para editar e apagar; projeto sem data de fim só tem o limite do
  início.
- (aba Financeiro) Forecast acima da meta com plano abaixo: card verde, com aviso escrito
  (US-0032). No mês atual, o forecast conta o realizado até hoje mais o que ainda falta do
  planejado do mês; depois da data de fim, o que não foi lançado não conta mais (US-0031).
  No P&L realizado, a receita é a recebida, e Projetado /
  Realizado ficam num seletor como o da rosca (US-0033).

#### Decisões pendentes do épico

Nenhuma. O clique na barra (US-0028) não existia: o atalho para as seções está na rosca e continua lá.

### Portfólio de projetos (aberto em 2026-11-23)

Redesenho da tela Projetos › Portfólio: indicadores com período e metas, quadro por fase com
cards compactos, sino de pendências, modo planejamento, encerramento com renovação, visão do
membro e permissões por capacidade. Protótipo: `prototipos/portfolio-de-projetos.html`
(publicado em https://claude.ai/artifact/TAaDNbHEnW1nASwtTaGPPk).

| ID | História | Persona | Status | Prontidão |
|---|---|---|---|---|
| [US-0034](stories/4-em-desenvolvimento/US-0034-projetos-indicadores-do-portfolio-com-periodo.md) | Indicadores do portfólio com o período e as metas | GP ou admin | Em desenvolvimento | Pronta |
| [US-0035](stories/4-em-desenvolvimento/US-0035-projetos-quadro-do-portfolio-por-fase.md) | Quadro do portfólio por fase, sem rolagem longa | GP ou admin | Em desenvolvimento | Pronta |
| [US-0036](stories/4-em-desenvolvimento/US-0036-projetos-metas-e-margem-do-portfolio.md) | Metas de receita e margem bruta do portfólio | Admin | Em desenvolvimento | Pronta |
| [US-0037](stories/4-em-desenvolvimento/US-0037-projetos-sino-de-pendencias-no-card.md) | Sino de pendências no card e pendências na Visão Geral | GP | Em desenvolvimento | Pronta |
| [US-0039](stories/4-em-desenvolvimento/US-0039-projetos-planejamento-guiado-por-checklist.md) | Planejar o projeto guiado por um checklist que acompanha o preenchimento | GP ou admin | Em desenvolvimento | Pronta |
| [US-0043](stories/2-em-refinamento/US-0043-projetos-encerramento-com-renovacao.md) | Encerrar o projeto decidindo a renovação e entregando os resultados | GP ou admin | Em refinamento | Pronta com ressalvas |
| [US-0045](stories/2-em-refinamento/US-0045-comercial-empresa-e-cliente-num-cadastro-so.md) | Empresa e cliente num cadastro só (pré-requisito da US-0043) | Pessoa do comercial ou GP | Em refinamento | Pronta com ressalvas |

O modo planejamento foi aprovado pelo Victor em 23/11/2026 (protótipo versão 8) e virou a
US-0039. O encerramento com renovação virou a US-0043 em 24/11/2026 e está em espera pelo
refino "Do Pipeline ao fim do projeto" (abaixo), junto com a US-0045. As telas de visão do
membro e permissões estão no protótipo e aguardam a validação do Victor para virar histórias.

### Do Pipeline ao fim do projeto (aberto em 2026-11-25)

Refino do fluxo inteiro, da qualificação da empresa ao encerramento e à renovação: catálogo de
2027 e formas de receita, empresa e cliente, orçamento composto, Ganho amarrado ao orçamento,
portfólio de Projetos e Governo, portfólio de Fomento e projetos internos. Decisões e roadmap em
[`refino-fluxo-comercial-a-projeto.md`](refino-fluxo-comercial-a-projeto.md). A US-0043 e a
US-0045 aguardam os épicos anteriores do roadmap.

**Épico 1 — Catálogo e formas de receita**

| ID | História | Persona | Status | Prontidão |
|---|---|---|---|---|
| [US-0046](stories/3-pronta-para-desenvolver/US-0046-catalogo-2027-linhas-servicos-e-formas-de-receita.md) | Catálogo 2027: linhas, serviços e formas de receita | Admin | Pronta para desenvolver | Pronta com ressalvas |
| [US-0047](stories/3-pronta-para-desenvolver/US-0047-fit-por-servico-segue-o-catalogo.md) | Fit por serviço segue o catálogo | Pessoa do comercial | Pronta para desenvolver | Pronta com ressalvas |
| [US-0048](stories/3-pronta-para-desenvolver/US-0048-filtro-por-linha-e-servico.md) | Filtrar e ver projetos por linha e por serviço | Admin, GP ou comercial | Pronta para desenvolver | Pronta com ressalvas |

### Férias lançadas pelo sistema (aberto em 2026-11-25, a refinar)

Pedido do Victor Couto (25/11/2026): férias deixam de ser lançadas à mão como atividade e passam a
ser uma funcionalidade do sistema, com custo no centro de custo **Férias**, separado de
**Ausências** (folga, licença e atestado). Ainda sem histórias: o épico entra no backlog para
refinar.

**O que já existe**
- Pedido e aprovação de férias com saldo por aniversário de admissão (ADR-0003):
  `/minhas-ferias` para a pessoa e `/rh/ferias` para quem tem `ferias:gerir`.
- A férias aprovada só tira os dias da cobrança de horas não lançadas e da auditoria de horas.
  Ela não gera lançamento nem custo em centro nenhum.
- Até a funcionalidade existir, férias são lançadas na atividade **Férias** (centro Férias). A
  antiga atividade "Folga/Férias" foi desativada em 25/11/2026 e deu lugar a **Folga** (centro
  Ausências) e **Férias**; os lançamentos antigos ficaram como estavam.

**Para refinar**
- A férias aprovada vira lançamento sozinha, dia a dia, no centro Férias? Com quantas horas por
  dia (jornada da pessoa)?
- Como fica o lançamento quando a férias é cancelada ou alterada depois de aprovada?
- O que acontece com horas já lançadas pela pessoa nos dias de férias?
- A atividade manual "Férias" continua existindo ou some quando a funcionalidade entrar?
- Os 35 lançamentos antigos de "Folga/Férias" ficam como estão ou são separados?
- O custo de férias entra no custo dos projetos em que a pessoa está alocada ou fica só no
  centro Férias?
