# ADR 0035: Faturável é atributo do projeto, e o custo do projeto interno vai para centro próprio

- Status: proposto
- Data: 2026-09-17
- Decisores: Italo Castro (produto)

## Contexto

Provocação do Italo em 17/09, olhando o campo "Tipo de Serviço" de uma oportunidade:

> O serviço é que vou falar se ele é cobrável ou não? Como vou controlar projetos com horas
> não pagas pelo cliente? Exemplo, o próprio Pulse é um projeto interno, onde as horas são
> não faturáveis.

O ADR-0031 fechou o modelo em "ou é serviço, ou é atividade interna": serviço **cobra hora**
(trabalho vendido), atividade interna **desconta hora** (custo da empresa). O ADR-0046 (PUL-246)
somou a isso que a hora de projeto herda o centro do serviço que o projeto vende.

**O Pulse não cabe em nenhum dos dois.** É um projeto de verdade — tem time alocado, horas,
prazo e entrega — mas ninguém paga por ele. Tratá-lo como atividade interna perderia alocação,
margem e GPO; tratá-lo como projeto de cliente conta receita que não existe.

### O que existe hoje, e por que não resolve

`services.project_type` aceita `non_revenue` ("Projeto interno sem geração de receita") e
`calculateCloseBusinessTotal` devolve 0 para esse valor. **O eixo está no serviço**, e é aí que
quebra: serviço é o que a casa vende, do catálogo comercial.

- Marcar "Product Studio" como `non_revenue` zera os **7 projetos de cliente** que usam esse
  serviço (contagem do ADR-0031).
- Criar um "Product Studio Interno" só para o Pulse põe no catálogo comercial um item que
  ninguém vende — e ele aparece no seletor de Tipo de Serviço do Pipeline, oferecido como se
  fosse vendável.

O mesmo tipo de trabalho serve a FacilitaMinas e constrói o Pulse. **Ser vendido é do contrato,
não do tipo de trabalho.**

### Três sintomas concretos, verificados no código em 17/09

1. `useFinancialReport` calcula `billableCost = custosSemInterno`: tudo que não é atividade
   interna conta como billable. A hora do Pulse entraria como **billable**, o oposto do que é.
2. Pela regra de PUL-246, a hora do Pulse herdaria o centro do serviço — SL02 Studio de Produto.
   O custo do produto próprio se mistura ao trabalho vendido e **a margem do estúdio fica
   errada**, com custo sem receita correspondente.
3. `projects.client_id` é `NOT NULL`. Hoje, cadastrar o Pulse exige inventar um cliente
   "Origami Lab", que depois aparece na carteira e no breakdown por cliente.

## Decisão

### 1. Faturável é atributo do PROJETO

`projects.is_billable`. O serviço continua dizendo **que trabalho é**; o projeto diz **se
alguém paga por ele**. `services.project_type = 'non_revenue'` fica como está — legado, junto
de `billing_type` (ADR-0031) — e deixa de ser o caminho para marcar trabalho interno.

### 2. Projeto não faturável tem centro de custo próprio, obrigatório

O custo das horas de um projeto interno **não** entra no centro do serviço. O projeto aponta
para um centro seu, e o padrão do produto é um centro chamado **"Projeto Interno"**.

É a mesma forma da regra que o Italo firmou para pessoas no mesmo dia (PUL-218): quem não
lança hora tem centro vinculado. Aqui: **projeto que não fatura tem centro vinculado**. Em
ambos os casos o vínculo só existe no caso que precisa dele, e a exclusividade se defende no
dado:

| Projeto | Centro da hora | `cost_center_id` no projeto |
|---|---|---|
| faturável | o do serviço que vende | não se aplica |
| não faturável | o do projeto | **obrigatório** |

Garantido por `CHECK`, não por tela: `is_billable = false` exige `cost_center_id`.

### 3. A leitura de billable passa a olhar o projeto

`billableCost` deixa de ser "tudo que não é atividade interna". Hora de projeto não faturável
conta como custo interno, junto com a atividade. Sem isso o indicador continua dizendo que a
casa fatura o que ela investe em si mesma.

### Alternativa descartada

**Marcar não faturável no serviço e ratear.** Manteria o eixo onde ele está hoje e pouparia
campo novo, mas exige que toda leitura de margem saiba separar, dentro do mesmo centro, o que
é vendido do que não é. Decisão do Italo: centro próprio, porque assim a leitura de quanto a
casa investe no próprio produto sai de graça — é uma linha na tela de custo por centro, não
uma conta que alguém precisa lembrar de fazer.

## Consequencias

- **Benefícios:** a margem do estúdio para de carregar custo sem receita; "quanto investimos no
  nosso produto" vira número visível; o catálogo comercial não ganha item fantasma; o mesmo
  serviço serve cliente e uso interno sem conflito.
- **Custos:** um campo e um centro novos; a tela de projeto ganha a marcação e o seletor de
  centro; `projects.client_id` continua `NOT NULL`, então o projeto interno ainda precisa de um
  cliente — tratado como pendência abaixo, não resolvido aqui.
- **Riscos:** projeto existente marcado como não faturável por engano tira receita da leitura.
  Mitigado pelo default `true`: nenhum projeto de hoje muda de comportamento.
- **Como reverter:** o campo é aditivo. Remover a coluna, o `CHECK` e o ramo do trigger devolve
  o comportamento atual, com o custo do projeto interno voltando para o centro do serviço.

## Pendencias

- **`projects.client_id` NOT NULL.** O projeto interno precisa apontar para algum cliente.
  Enquanto a coluna for obrigatória, a saída é um cliente da própria casa, que suja carteira e
  breakdown. Tornar a coluna anulável é migration de contract com impacto em várias leituras —
  fica para issue própria, com o número de projetos internos na mão.
- **Receita zero e leitura de margem.** Um projeto sem receita tem margem -100% por construção.
  As telas de portfólio e saúde precisam tratá-lo como "sem margem", não como "margem péssima",
  senão ele vira alarme falso permanente.

## Evidencias

- Provocação e decisão: conversa de 17/09/2026 com o Italo.
- Estado atual verificado no código: `services.project_type` com `non_revenue`
  (`src/types/project.ts`), `calculateCloseBusinessTotal` devolvendo 0
  (`src/test/close-business-financials.test.ts`), `billableCost = custosSemInterno`
  (`src/hooks/useFinancialReport.ts`), `projects.client_id` NOT NULL (tipos gerados).
- Relacionados: ADR-0031 (centro de custo como âncora; "ou é serviço, ou é atividade"),
  PUL-246 (hora de projeto grava o centro do serviço), PUL-218 (mesma forma de regra, para
  pessoa que não lança hora), ADR-0003 (catálogo hierárquico).
