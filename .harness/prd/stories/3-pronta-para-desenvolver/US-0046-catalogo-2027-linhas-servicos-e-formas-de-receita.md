# US-0046 — Catálogo 2027: linhas, serviços e formas de receita

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Catálogo e formas de receita (épico 1 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 1 do roadmap
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("1. composições 2. sim 3. ok, pode abrir o PR"); revista no mesmo dia (modelo de receita, serviço ativo só com modelo e redesenho do catálogo, protótipo aprovado: "pode aplicar no código")
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

**Cenário 2: modelos de receita por serviço**

- **Dado** um serviço;
- **Quando** o admin define as formas de receita dele;
- **Então** cadastra os modelos de receita permitidos, cada um com uma ou mais formas. Exemplo: Acesso
  a Capital aceita "Escopo fixo", "Percentual" ou "Escopo fixo + Percentual";
- **E** o orçamento poderá escolher só um dos modelos de receita do serviço (épico 3);
- **E** o mesmo modelo de receita não se repete no serviço.

**Cenário 3: cortesia é sozinha**

- **Dado** um modelo de receita com Cortesia;
- **Então** ela não leva nenhuma outra forma, porque não gera receita.

**Cenário 4: chance padrão da receita ponderada**

- **Dado** um serviço com algum modelo de receita que tenha Percentual;
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

**Cenário 10: serviço só fica ativo com modelo de receita**

- **Dado** um serviço sem nenhum modelo de receita válido (as formas antigas não contam);
- **Então** ele fica inativo e não aparece para orçamentos, Oportunidades e projetos novos;
- **E** a lista e o painel do serviço mostram "Inativo · sem modelo de receita";
- **E** ao ganhar o primeiro modelo ele fica ativo sozinho, sem ninguém reativar;
- **E** ao perder o último modelo ele volta a ficar inativo;
- **E** um serviço desativado por alguém continua desativado mesmo ganhando modelo.

**Cenário 11: catálogo numa tela só**

- **Dado** Configurações › Catálogo de serviços;
- **Então** cada linha ativa é uma aba com os serviços dela, e a aba Desativados reúne o que foi
  desativado e os serviços de linha desativada;
- **E** cada serviço mostra os modelos de receita, a chance padrão (quando há Percentual), o centro
  de custo e quantos projetos o usam;
- **E** criar e editar o serviço acontece num painel lateral com dados, modelos de receita e
  chance padrão; desativar e excluir ficam no fim dele, e excluir só aparece para serviço sem
  projeto;
- **E** a linha é criada e editada num diálogo com nome e descrição;
- **E** a tela não tem texto explicativo: introdução, dica de campo ou frase de ajuda.

**Cenário 12: o projeto guarda o modelo de receita**

- **Dado** o formulário do projeto;
- **Quando** escolho o serviço;
- **Então** cada opção mostra linha, serviço e modelo de receita ("Fomento › Lei do Bem ›
  Percentual"), e o projeto guarda os dois;
- **E** um projeto antigo, ainda sem modelo, mostra o serviço que tem até o GP escolher;
- **E** o modelo precisa ser do serviço do projeto; trocar só o serviço limpa o modelo.

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
- **Modelos de receita** (25/11/2026): o admin lista os modelos de receita de cada serviço, cada
  um com uma ou mais formas, e o orçamento escolhe um deles. O termo "composição", usado no
  primeiro refino, foi trocado por "Modelo de Receita" no mesmo dia.
- **Serviço só fica ativo com modelo de receita** (25/11/2026), e o usuário vê isso na tela.
- **Redesenho do catálogo** (25/11/2026), a partir de uma crítica de design: uma tela só com abas
  por linha e painel lateral, no lugar da lista de linhas, da página de cada linha e do assistente
  de 3 passos. Protótipo aprovado: `prototipos/catalogo-de-servicos.html`.
- **Sem texto explicativo na tela** (25/11/2026): a UI e a UX têm de bastar.
- **O projeto guarda o modelo de receita** (25/11/2026), escolhido com a linha e o serviço,
  porque cada GP vai ajustar os projetos em andamento.
- **O perfil Gerente perde `catalogo:editar`** (25/11/2026): só o admin edita o catálogo.

## Pontos em aberto

### Decisões já tomadas no refino (registro)

- Modelos de receita explícitos, escolhidos em vez de "forma combinável" (mais clara para o comercial
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
  receita", `service_revenue_models`), modelo de receita, chance de realização, receita ponderada,
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
- **Provas esperadas:** formas novas e antigas por serviço; modelos de receita sem repetição;
  serviço ativo só com modelo (cenário 10);
  cortesia sozinha; chance padrão só em percentual; desativado some da escolha e fica no
  histórico; não-admin não edita.
- **Fora do escopo:** orçamento, Oportunidade, de-para de projetos, fit e filtros.

## Implementação

> Preenchido ao implantar. Todo cenário aponta para a prova.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 4, 10, 12 | Migrations `20261125100000_catalogo_composicoes_de_receita`, `20261125110000_servico_ativo_so_com_modelo` e `20261125113000_projeto_guarda_modelo_de_receita`, ensaiadas num Postgres local (ida, casos do gatilho e do índice, compatibilidade com o front anterior e rollback) e aplicadas em produção em 25/11/2026 |
| 5 a 9, 11 | Tela nova em `src/pages/Services.tsx` e `src/components/services/ServiceSheet.tsx`; teste do Victor no localhost (a registrar) |
| 8 | `catalogo:editar` fora do perfil Gerente pela tela Perfis de acesso (configuração do Victor) |
