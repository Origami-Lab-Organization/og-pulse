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
| [US-0001](stories/4-em-desenvolvimento/US-0001-tecnica-pulse-le-a-base-da-receita.md) | O Pulse lê a base da Receita com segurança e rapidez | Técnica | Em desenvolvimento | Pronta com ressalvas |
| [US-0002](stories/4-em-desenvolvimento/US-0002-comercial-ver-empresas-da-base-da-receita.md) | Ver as empresas da base da Receita na tela Empresas | Pessoa do comercial | Em desenvolvimento | Pronta |
| [US-0003](stories/4-em-desenvolvimento/US-0003-comercial-filtrar-empresas.md) | Filtrar as empresas pelo que importa para a Origami | Pessoa do comercial | Em desenvolvimento | Pronta |
| [US-0004](stories/4-em-desenvolvimento/US-0004-comercial-recolher-os-filtros.md) | Recolher os filtros para ver mais da lista | Pessoa do comercial | Em desenvolvimento | Pronta |
| [US-0005](stories/4-em-desenvolvimento/US-0005-comercial-buscar-empresa.md) | Buscar empresa por nome, CNPJ ou cidade | Pessoa do comercial | Em desenvolvimento | Pronta |
| [US-0006](stories/2-em-refinamento/US-0006-comercial-faturamento-estimado.md) | Ver o faturamento estimado de cada empresa | Pessoa do comercial | Em refinamento | Pronta com ressalvas |
| [US-0007](stories/2-em-refinamento/US-0007-comercial-ficha-da-empresa.md) | Avaliar a empresa pela ficha antes de decidir | Pessoa do comercial | Em refinamento | Pronta com ressalvas |
| [US-0008](stories/2-em-refinamento/US-0008-comercial-abrir-oportunidade.md) | Abrir oportunidade a partir da empresa | Pessoa do comercial | Em refinamento | Pronta com ressalvas |
| [US-0009](stories/2-em-refinamento/US-0009-comercial-abrir-oportunidades-em-lote.md) | Abrir oportunidades em lote | Pessoa do comercial | Em refinamento | Pronta com ressalvas |
| [US-0010](stories/2-em-refinamento/US-0010-comercial-nao-agora-e-descartar.md) | Marcar "Não agora" ou descartar a empresa | Pessoa do comercial | Em refinamento | Pronta |
| [US-0011](stories/2-em-refinamento/US-0011-comercial-abas-da-classificacao.md) | Acompanhar a classificação pelas abas e desfazer | Pessoa do comercial | Em refinamento | Pronta com ressalvas |
| [US-0012](stories/2-em-refinamento/US-0012-comercial-classificar-pelo-teclado.md) | Classificar pelo teclado | Pessoa do comercial | Em refinamento | Pronta |
| [US-0013](stories/1-a-fazer/US-0013-comercial-salvar-filtro-para-o-time.md) | Salvar um filtro para o time | Pessoa do comercial | A fazer | Não pronta |
| [US-0014](stories/1-a-fazer/US-0014-comercial-fit-com-funcionarios-e-divida.md) | Nota de fit considera funcionários e dívida ativa | Pessoa do comercial | A fazer | Não pronta |
| [US-0015](stories/2-em-refinamento/US-0015-comercial-distancia-de-formiga.md) | Filtrar e ordenar pela distância de Formiga | Pessoa do comercial | Em refinamento | Pronta com ressalvas |
| [US-0016](stories/2-em-refinamento/US-0016-comercial-tipo-de-conta.md) | Classificar a conta como Âncora, Ponte ou Satélite | Pessoa do comercial | Em refinamento | Pronta |
| [US-0017](stories/2-em-refinamento/US-0017-comercial-anel-e-tier-saem.md) | Anel e Tier saem da Prospecção | Pessoa do comercial | Em refinamento | Pronta com ressalvas |

#### Ordem de implementação proposta

| Ordem | Fatia | Histórias |
|---|---|---|
| 1 | Acesso à base e lista | US-0001, US-0002 |
| 2 | Encontrar empresas | US-0003, US-0004, US-0005, US-0006, US-0015 |
| 3 | Decidir e abrir oportunidade | US-0007, US-0008, US-0009, US-0016 |
| 4 | Triagem completa | US-0010, US-0011, US-0012, US-0017 |
| Depois | — | US-0013, US-0014 |

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
- Todas as abas mostram contagem, menos "A classificar".
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
5. **Tabela de conversão do Tier** em tipo de conta, a partir dos valores de produção.
   Ver US-0017.
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
