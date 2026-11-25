# US-0046 — Catálogo 2027: linhas, serviços e formas de receita

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Catálogo e formas de receita (épico 1 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 1 do roadmap
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("1. composições 2. sim 3. ok, pode abrir o PR")
- **Relacionadas:** US-0044, US-0047, US-0048, ADR-0003, ADR-0023, ADR-0027, ADR-0031

## Descrição

**Como** admin da Origami,
**quero** cadastrar as linhas de serviço de 2027, os serviços de cada uma e as formas de receita
que cada serviço aceita,
**para** que orçamento, Oportunidade e projeto passem a herdar a mesma classificação, sem listas
paralelas.

### Contexto

Hoje o catálogo não classifica nada. Na Origami, em 25/11/2026 (consulta de leitura):

- há uma linha só, "Serviços Gerais", com 7 serviços: Consultoria Estratégica, Dev. de Software,
  Financiamento da Inovação, Lei do Bem, Programa de Inovação, Sprint 0 e Ventures;
- a forma de receita existe em quatro listas que não batem: a do serviço, a do orçamento, a do
  Ganho e a lista fixa de linhas usada no fit e em projetos antigos;
- nenhuma lista tem cobrança por hora; "recorrente" e "equity" existem mas não serão vendidos.

Decisões do refino de 24 e 25/11/2026 (Victor Couto):

- Linhas de 2027: **Projetos**, **Fomento** e **Governo**. Valem a partir da entrada em produção.
- Serviços: Projetos → Consultoria, Dev. de Software. Fomento → Lei do Bem, Acesso a Capital,
  Consultoria. Governo → Workshop Sebrae, Dev. de Software.
- Formas de receita: **escopo fixo**, **percentual**, **cobrança por hora**, **comissão por
  indicação** e **cortesia**. Recorrente e equity saem.
- O admin define as linhas, os serviços e as formas que cada serviço aceita, sozinhas ou
  combinadas.
- Linhas e serviços antigos ficam desativados, para manter o rastro. Ventures fica arquivada.

### Escopo

- Inclui:
  - a lista fechada de formas de receita;
  - as formas aceitas por serviço e como podem ser combinadas;
  - a chance padrão de realização dos serviços com percentual (receita ponderada);
  - desativar linha e serviço, sem apagar;
  - catálogo editado só pelo admin.
- Não inclui:
  - escolher o serviço na Oportunidade (épico 4) e no orçamento (épico 3);
  - os valores de cada forma no orçamento: parcelas, percentual, tarifa, teto e piso (épico 3);
  - trocar o serviço dos projetos ativos (de-para, épico 5);
  - o fit por serviço (US-0047) e os filtros (US-0048).

## Critérios de aceite

**Cenário 1: formas de receita**

- **Dado** o catálogo;
- **Quando** o admin escolhe as formas de receita de um serviço;
- **Então** as opções são: Escopo fixo, Percentual, Cobrança por hora, Comissão por indicação e
  Cortesia;
- **E** Recorrente e Equity não aparecem para serviço novo.

**Cenário 2: composições permitidas por serviço**

- **Dado** um serviço;
- **Quando** o admin define as formas de receita dele;
- **Então** cadastra as composições permitidas, cada uma com uma ou mais formas. Exemplo: Acesso
  a Capital aceita "Escopo fixo", "Percentual" ou "Escopo fixo + Percentual";
- **E** o orçamento poderá escolher só uma das composições do serviço (épico 3);
- **E** a mesma composição não se repete no serviço;
- **E** um serviço sem nenhuma composição não pode ser usado em orçamento.

**Cenário 3: cortesia é sozinha**

- **Dado** uma composição com Cortesia;
- **Então** ela não leva nenhuma outra forma, porque não gera receita.

**Cenário 4: chance padrão da receita ponderada**

- **Dado** um serviço com alguma composição que tenha Percentual;
- **Quando** o admin edita o serviço;
- **Então** informa a chance padrão de realização, em %, usada para calcular a receita ponderada
  no orçamento;
- **E** o orçamento poderá ajustar essa chance (épico 3).

**Cenário 5: mesmo serviço em duas linhas**

- **Dado** as linhas Projetos e Governo;
- **Quando** o admin cadastra "Dev. de Software" nas duas;
- **Então** o Pulse aceita, porque o nome é único dentro da linha, não no catálogo;
- **E** em toda lista de escolha o serviço aparece com a linha ("Governo › Dev. de Software").

**Cenário 6: desativar sem perder o rastro**

- **Dado** uma linha ou um serviço com projetos, orçamentos ou Oportunidades ligados;
- **Quando** o admin desativa;
- **Então** ele some das listas de escolha para registros novos;
- **E** continua aparecendo nos projetos, orçamentos e Oportunidades que já o usam, com a marca
  "Desativado";
- **E** pode ser reativado pelo admin.

**Cenário 7: desativar a linha desativa os serviços**

- **Dado** uma linha com serviços ativos;
- **Quando** o admin desativa a linha;
- **Então** os serviços dela também deixam de aparecer para registros novos.

**Cenário 8: só o admin edita o catálogo**

- **Dado** uma pessoa que não é admin;
- **Quando** abre Serviços;
- **Então** vê o catálogo, mas não cria, edita, desativa nem reativa linha, serviço ou forma de
  receita.

**Cenário 9: catálogo 2027 da Origami**

- **Dado** a entrega em produção;
- **Então** o catálogo da Origami fica com as linhas e serviços de 2027 ativos;
- **E** a linha "Serviços Gerais" e seus 7 serviços ficam desativados;
- **E** a linha Ventures fica desativada;
- **E** projetos, orçamentos e Oportunidades antigos continuam mostrando o serviço que tinham.

## Decisões (Victor Couto, 24 e 25/11/2026)

- Linhas Projetos, Fomento e Governo; serviços por linha como no Contexto; valem a partir da
  entrada em produção.
- Formas: escopo fixo, percentual, cobrança por hora, comissão por indicação, cortesia.
  Recorrente sai (seria para SaaS, fora de projetos); equity acompanhava Ventures e sai.
- Indicação como alavanca gera só comissão paga (custo do orçamento); comissão por indicação é
  a receita que a Origami recebe de parceiro (ex.: PIN).
- Cortesia: projeto de entrada gratuito, com custos e planejamento de projeto comum, fora dos
  indicadores de receita e margem.
- O admin define linhas, serviços e formas aceitas, exclusivas ou combinadas.
- Chance padrão da receita ponderada por serviço, definida pelo admin; o comercial ajusta no
  orçamento.
- Linhas e serviços antigos desativados, não apagados.
- **Composições permitidas** (25/11/2026): o admin lista as composições de cada serviço e o
  orçamento escolhe uma delas.
- **O perfil Gerente perde `catalogo:editar`** (25/11/2026): só o admin edita o catálogo.

## Pontos em aberto

### Decisões já tomadas no refino (registro)

- Composições permitidas, escolhidas em vez de "forma combinável" (mais clara para o comercial
  e evita combinação que ninguém vende).
- `catalogo:editar` sai do perfil Gerente.

### Hipóteses para validar

- **Carga do catálogo 2027.** O admin cadastra as 3 linhas e os 7 serviços pela própria tela,
  depois da entrega, e desativa os antigos. A entrega não grava dados do catálogo da Origami.
- **Serviços atuais não migram de linha.** "Dev. de Software" (10 projetos) e "Lei do Bem"
  continuam na linha antiga, desativados; os de 2027 são cadastros novos. Os projetos ativos
  trocam de serviço no de-para (épico 5).
- **Valor de referência.** O valor padrão que alguns serviços têm hoje (ex.: Sprint 0 a
  R$ 30.000) continua como sugestão opcional do serviço.

### Provocações para produto

- **Nome repetido nos relatórios.** Consultoria e Dev. de Software aparecem em duas linhas.
  Relatório que mostra só o serviço vai somar as duas; a US-0048 mostra linha e serviço juntos.
- **Workshop Sebrae com uma forma só.** Se o Sebrae paga sempre do mesmo jeito, o serviço aceita
  uma forma só e o orçamento já nasce com ela.

## Contexto técnico

- **Objetivo observável:** catálogo com linhas, serviços e formas aceitas pelo serviço; lista
  única de formas; desativar sem apagar; edição só do admin.
- **Termos do domínio:** linha de serviço, serviço, forma de receita (no código ainda "modelo de
  receita", `service_revenue_models`), composição, chance de realização, receita ponderada,
  cortesia, comissão por indicação.
- **Comportamento atual:**
  - PROVADO: hierarquia Linha → Serviço → Modelo (ADR-0003; `service_lines`, `services`,
    `service_revenue_models`).
  - PROVADO: `service_revenue_models.model_type` aceita `fixed`, `recurring`, `success_fee`,
    `indication`, `equity` (CHECK `service_revenue_models_model_type_check`); o tipo TS tem também
    combinados (`fixed_success_fee`, `fixed_recurring`, `recurring_success_fee`) em
    `src/types/serviceRevenueModel.ts`.
  - PROVADO: `services.billing_type` e `services.project_type` são legados (CHECK com
    `fixed_scope`, `recurring`, `success_fee`, `no_revenue`); `budgets.billing_type` usa a mesma
    lista.
  - PROVADO: nome de serviço é único por linha (índice `services_tenant_line_name_key`, ADR-0031,
    decisão 6).
  - PROVADO: `catalogo:editar` está com Admin e Gerente (`.harness/capability-matrix.md`).
  - PROVADO: telas em `src/pages/Services.tsx`, `src/pages/ServiceLineDetail.tsx`,
    `src/components/services/` (formulários de linha, serviço e modelo; assistente em 3 passos).
- **Comportamento esperado:** cenários 1 a 9.
- **Superfícies conhecidas:** Serviços e detalhe da linha; formulários de linha, serviço e forma
  de receita; assistente de cadastro; qualquer seletor de serviço (orçamento, projeto, Ganho).
- **Restrições e padrões aplicáveis:**
  - schema e permissão só por migration versionada, com horário depois da última aplicada em
    produção;
  - mudar `catalogo:editar` exige linha na `capability-matrix.md` e migration de
    `role_capabilities` (ADR-0027);
  - não apagar catálogo, só desativar (ADR-0003);
  - UI no Design System (`patterns/design-system.md`).
- **Riscos para investigar:**
  - quem lê `services.billing_type` / `project_type` e `budgets.billing_type` hoje (orçamento,
    Ganho, analytics) e continua funcionando com a lista nova;
  - registros antigos com `recurring`, `equity` ou combinados no `model_type`;
  - o tenant de demonstração (`Pulse Demo Consultoria`) tem serviços recorrentes e `no_revenue`.
- **Provas esperadas:** formas novas e antigas por serviço; composições sem repetição;
  cortesia sozinha; chance padrão só em percentual; desativado some da escolha e fica no
  histórico; não-admin não edita.
- **Fora do escopo:** orçamento, Oportunidade, de-para de projetos, fit e filtros.

## Implementação

> Preenchido ao implantar. Todo cenário aponta para a prova.

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
