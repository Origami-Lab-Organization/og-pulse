# HACKATHON Origami Pulse — Guia de Desenvolvimento

**Software:** Pulse (gestão de empresa) · **Data:** hackathon de amanhã · **Origami Lab — Formiga/MG**
**Stack assumida:** React + TypeScript no frontend · Supabase (Postgres + RLS + Auth + Storage + Edge Functions) · Claude API (`claude-sonnet-4-6`) para tarefas de IA.
**Desenvolvimento:** integralmente assistido por IA, principalmente **Claude Code**.

> ⚠️ Se alguma premissa de stack acima estiver errada, ajuste no `CLAUDE.md` (Apêndice A) antes de começar — é o arquivo que o Claude Code lê primeiro.

---

## 1. Objetivo do dia

Entregar incrementos funcionais e **verificáveis** das jornadas prioritárias do Pulse. Cada história só conta como pronta quando passa nos seus Critérios de Aceite. Em hackathon com IA, o gargalo não é gerar código — é **garantir que o código gerado está certo**. Por isso este guia dá tanto peso aos critérios de aceite quanto às histórias em si.

---

## 2. Como usar este guia

Cada história abaixo tem:

- **Narrativa** — formato Como / quero / para que.
- **Critérios de Aceite** — em Gherkin (Dado/Quando/Então/E). É o roteiro de "pronto" **e** de teste.
- **Notas técnicas** — tabelas, rotas e arquivos envolvidos (âncoras reais para o Claude Code).
- **Prompt inicial sugerido** — ponto de partida pro Claude Code, montado sobre o template do Apêndice B.

**Fluxo de trabalho de cada história:**

1. Ler o `CLAUDE.md` do repositório (Apêndice A) — uma vez, no começo do dia.
2. Pegar a história no board.
3. Rodar o prompt inicial no Claude Code, deixando-o explorar o código existente antes de escrever.
4. Validar o resultado **contra os Critérios de Aceite** (não contra "parece funcionar").
5. Passar pelo teste e mover o card.

---

## 3. Ordem de execução e dependências

```
ONDA 0 (logo cedo, antes de tudo)
└── HU-001 Redesign do Catálogo de Serviços (migration)  ← BLOQUEIA o comercial/orçamento
        │
        ▼
ONDA 1 (em paralelo, depois da migration estar de pé)
├── HU-002 Dashboard Executivo
├── HU-003 CRUD de Benefícios   ─┐ alimentam cálculo de custo/hora
└── HU-004 CRUD de Ferramentas  ─┘ e a projeção de folha

ONDA 2
├── HU-005 Recrutamento — pré-cadastro ao aprovar
└── HU-006 Desligamento de Funcionário
```

| Dependência                                               | Por quê                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HU-001 antes de qualquer coisa de comercial/orçamento** | A migration troca a estrutura do catálogo. Rodar tarde quebra o que já estiver de pé.                                                                               |
| **HU-003 e HU-004 antes do custo/hora completo**          | Benefícios e ferramentas entram no cálculo de custo do funcionário e na projeção de folha.                                                                          |
| **HU-002 depende de dados reais**                         | Vários blocos do dashboard só fazem sentido com projetos, folha e comercial cadastrados. Onde não houver dado, usar estado vazio orientativo (não inventar número). |

**Realismo de escopo:** trate HU-001 a HU-004 como **must-have** e HU-005/HU-006 como **alvo**. Melhor 4 histórias prontas e testadas do que 6 pela metade.

---

## 4. Trabalhando com Claude Code

**Regras de ouro** (coloque também no `CLAUDE.md`):

- **Sempre filtrar por `tenant_id`** — o Pulse é multi-tenant. Toda query e toda política de RLS.
- **Segurança no banco, não só na UI** — RLS no Supabase, não apenas esconder botão.
- **Não quebrar dados ativos** — desabilitar (`is_active = false`) em vez de deletar; migrations preservam o que já existe.
- **Pedir ao Claude Code para ler o código existente antes de escrever** — a maioria das histórias é completar/ajustar, não criar do zero.
- **Validar contra os Critérios de Aceite** — peça ao Claude Code para revisar a própria entrega contra os cenários antes de dizer que terminou.

Use o **template de prompt do Apêndice B** para qualquer história que não tenha um prompt inicial pronto aqui.

---

## 5. Histórias

---

### HU-001 — Redesign do Catálogo de Serviços

**Origem:** Admin J4 (crítica).

**História de Usuário:**

- Como **administrador da empresa**, quero **organizar o portfólio em Linhas de Serviço → Serviços → Modelos de Receita**, para que **os GPs criem orçamentos sempre com as condições corretas, sem planilha paralela e sem quebrar projetos ativos**.

**Mockups / Referências Visuais:**

- [x] Referência de tela existente: catálogo atual (tabela flat de serviços).
- [ ] Sem novo wireframe — seguir o padrão visual de CRUD já usado no Admin Portal.

**Notas técnicas:**

- Migration **primeiro** (ver Admin J4 / F1): criar `service_lines`, `services`, `service_revenue_models` e migrar `services_old` para a nova hierarquia.
- Tipos de modelo de receita: `fixed`, `recurring`, `success_fee`, `indication`, `equity`.
- `services.base_value` pré-preenche orçamento do tipo Preço Fixo.
- **Coordenar a janela da migration com o time** antes de rodar — ela mexe em estrutura referenciada por `leads/opportunities`.

**Critérios de Aceite:**

**Cenário 1: Migration preserva os serviços existentes**

- **Dado** que existem serviços cadastrados na estrutura antiga (`services_old`);
- **Quando** a migration é executada;
- **Então** todos os serviços antigos passam a existir na nova tabela `services` vinculados a uma linha "Serviços Gerais";
- **E** nenhum orçamento ou projeto ativo fica órfão ou com referência quebrada.

**Cenário 2: Admin organiza o portfólio em hierarquia**

- **Dado** que a nova estrutura está ativa;
- **Quando** o admin cria uma Linha de Serviço, um Serviço dentro dela e múltiplos Modelos de Receita;
- **Então** o GP enxerga essa hierarquia no dropdown ao montar um orçamento;
- **E** linhas/serviços/modelos marcados como inativos **não** aparecem para o GP.

**Cenário 3 (validação): bloquear exclusão com vínculo ativo**

- **Dado** que uma linha de serviço possui serviços ativos vinculados;
- **Quando** o admin tenta excluí-la;
- **Então** a exclusão é bloqueada com mensagem clara;
- **E** o sistema oferece a opção de desabilitar em vez de excluir.

**Cenário 4 (escopo negativo): serviço sem modelo de receita**

- **Dado** que um serviço não tem nenhum modelo de receita ativo;
- **Quando** o GP o seleciona no orçamento;
- **Então** o sistema avisa que não há modelo disponível e não permite avançar com dropdown vazio.

**Prompt inicial sugerido (Claude Code):**

```
Contexto: estamos no repositório do Pulse (React + TS + Supabase, multi-tenant por tenant_id).
Leia primeiro a estrutura atual do catálogo de serviços (tabela de services e onde leads/opportunities
a referenciam) antes de propor qualquer mudança.

Tarefa: redesenhar o catálogo para a hierarquia Linha de Serviço → Serviço → Modelo de Receita.
1. Gere a migration SQL criando service_lines, services e service_revenue_models (campos no doc da jornada
   Admin J4 / F1), preservando os dados de services_old e sem quebrar referências ativas.
2. Implemente o CRUD das três entidades no Admin Portal seguindo o padrão de CRUD já existente no projeto.
3. Aplique RLS por tenant_id em todas as tabelas novas.

Restrições: desabilitar (is_active) em vez de deletar; não permitir excluir linha/serviço/modelo com vínculo ativo.
Ao final, revise sua entrega contra os 4 Critérios de Aceite da história HU-001 e me diga o que falta.
```

---

### HU-002 — Dashboard Executivo

**Origem:** Admin J2.

**História de Usuário:**

- Como **administrador da empresa**, quero **uma tela inicial `/dashboard` com a saúde financeira, operacional e de pessoas da empresa**, para que **eu responda em menos de 1 minuto se a empresa está saudável e onde preciso agir, sem montar relatório manual**.

**Mockups / Referências Visuais:**

- [x] Referência de tela existente: `/analytics` (NÃO SERÁ ABSORVIDA).
- [ ] Sem wireframe novo — organizar em blocos/cards.

**Notas técnicas:**

- Trocar o redirecionamento inicial do admin de `/inbox` para `/dashboard`.
- Filtro de período **global**, aplicado a todos os blocos simultaneamente.
- **Blocos núcleo (must-have):** Receita da empresa · Margem · Receita por pessoa (receita ÷ headcount) · Projetos ativos · Aniversariantes do mês · Saúde operacional (badge Saudável/Atenção/Crítico).
- **Blocos que dependem de outros módulos (entram quando houver dado; senão, estado vazio):** Pipeline comercial (quanto em negociação) · Time to close · Custo de folha + gráfico de crescimento · Alocação por ano/mês · Produção vs. administrativo (por volume e por R$).
- **Stretch (precisam de definição de regra + histórico):** Cálculo de provisão · Turnover. Deixar o card com rótulo "em breve" se a regra não estiver fechada — **não inventar número**.

**Critérios de Aceite:**

**Cenário 1: Dashboard vira a tela inicial do admin**

- **Dado** que um admin faz login;
- **Quando** a sessão é iniciada;
- **Então** ele é direcionado para `/dashboard` (e não mais para `/inbox`);
- **E** a página `/analytics` antiga não é mais o destino padrão.

**Cenário 2: Blocos núcleo respondem às perguntas-chave**

- **Dado** que a empresa tem projetos e funcionários cadastrados;
- **Quando** o admin abre o dashboard;
- **Então** ele vê receita, margem, receita por pessoa, projetos ativos e aniversariantes do mês;
- **E** cada projeto com alerta exibe badge de saúde (Saudável/Atenção/Crítico) clicável que leva ao projeto.

**Cenário 3: Filtro de período é global**

- **Dado** que o dashboard está carregado;
- **Quando** o admin altera o período no filtro;
- **Então** todos os blocos recalculam simultaneamente para o período selecionado.

**Cenário 4 (estado vazio): empresa sem dados**

- **Dado** que ainda não há projetos ou folha cadastrados;
- **Quando** o admin abre o dashboard;
- **Então** cada bloco sem dados exibe estado vazio orientativo (ex.: "Cadastre projetos para ver a margem");
- **E** o sistema **não** exibe valores zerados que pareçam dados reais.

**Cenário 5 (performance): carga com volume**

- **Dado** que existem 20+ projetos ativos;
- **Quando** o admin abre o dashboard;
- **Então** a página carrega em menos de 3 segundos.

**Prompt inicial sugerido (Claude Code):**

```
Contexto: repositório do Pulse (React + TS + Supabase, multi-tenant). Leia a página /analytics atual
e o redirecionamento de login do admin antes de começar.

Tarefa: criar a rota /dashboard como nova tela inicial do admin (hoje vai para /inbox).
Implemente, em cards, os blocos NÚCLEO: receita da empresa, margem, receita por pessoa (receita/headcount),
projetos ativos, aniversariantes do mês, saúde operacional. Adicione um filtro de período GLOBAL que recalcula
todos os blocos juntos. Para blocos que dependem de módulos ainda incompletos (folha, pipeline comercial,
provisão, turnover), deixe o componente pronto mas com estado vazio/"em breve" — não invente números.

Restrições: filtrar por tenant_id; nunca exibir zero como se fosse dado real (use estado vazio).
Ao final, revise contra os 5 Critérios de Aceite da HU-002.
```

---

### HU-003 — CRUD de Benefícios

**História de Usuário:**

- Como **administrador/DP**, quero **cadastrar e gerenciar os benefícios da empresa**, para que **eu possa vinculá-los aos funcionários e que entrem corretamente no cálculo de custo/hora e na projeção de folha**.

**Mockups / Referências Visuais:**

- [x] Seguir o padrão de CRUD já existente no projeto.

**Notas técnicas:**

- Campos: **nome** (obrigatório), **descrição**, **valor** (monetário, BRL).
- Tabela nova (ex.: `benefits`) com `tenant_id`, `is_active`. RLS por tenant.
- É entidade de catálogo: será referenciada pela lista de benefícios do funcionário (Pessoas J2) e pela projeção de folha (Pessoas J6).

**Critérios de Aceite:**

**Cenário 1: Criar benefício**

- **Dado** que o admin está na tela de Benefícios;
- **Quando** ele preenche nome, descrição e valor e salva;
- **Então** o benefício passa a aparecer na listagem e fica disponível para vínculo com funcionários.

**Cenário 2: Editar e desabilitar**

- **Dado** que existe um benefício cadastrado;
- **Quando** o admin edita o valor ou o desabilita;
- **Então** a alteração é refletida na listagem;
- **E** um benefício desabilitado não aparece como opção em novos vínculos, mas permanece nos vínculos já existentes.

**Cenário 3 (validação): campos obrigatórios e valor inválido**

- **Dado** que o admin tenta salvar sem nome ou com valor não-numérico/negativo;
- **Quando** ele clica em salvar;
- **Então** o sistema bloqueia o salvamento e indica o campo com erro.

**Prompt inicial sugerido (Claude Code):**

```
No repositório do Pulse (React + TS + Supabase, multi-tenant), crie um CRUD de Benefícios seguindo o
padrão de CRUD já usado no projeto (leia um CRUD existente como referência antes).
Campos: nome (obrigatório), descrição, valor (BRL). Tabela com tenant_id e is_active, RLS por tenant_id.
Desabilitar em vez de deletar. Valor deve aceitar só número >= 0.
Revise contra os 3 Critérios de Aceite da HU-003.
```

---

### HU-004 — CRUD de Ferramentas

**História de Usuário:**

- Como **administrador/DP**, quero **cadastrar e gerenciar as ferramentas da empresa**, para que **eu possa vinculá-las aos funcionários (em especial PJ) e que o custo entre corretamente no cálculo de custo/hora**.

**Mockups / Referências Visuais:**

- [x] Mesmo padrão de CRUD do HU-003.

**Notas técnicas:**

- Campos: **nome** (obrigatório), **descrição**, **valor** (monetário, BRL).
- Tabela nova (ex.: `tools`) com `tenant_id`, `is_active`. RLS por tenant.
- Idêntico em estrutura ao CRUD de Benefícios — pode reaproveitar o componente.

**Critérios de Aceite:**

**Cenário 1: Criar ferramenta**

- **Dado** que o admin está na tela de Ferramentas;
- **Quando** ele preenche nome, descrição e valor e salva;
- **Então** a ferramenta aparece na listagem e fica disponível para vínculo.

**Cenário 2: Editar e desabilitar**

- **Dado** que existe uma ferramenta cadastrada;
- **Quando** o admin edita ou desabilita;
- **Então** a alteração é refletida e a ferramenta desabilitada some das opções de novos vínculos, mantendo os existentes.

**Cenário 3 (validação): campos obrigatórios e valor inválido**

- **Dado** que o admin tenta salvar sem nome ou com valor inválido;
- **Quando** clica em salvar;
- **Então** o sistema bloqueia e indica o erro.

**Prompt inicial sugerido (Claude Code):**

```
No repositório do Pulse, crie um CRUD de Ferramentas idêntico em estrutura ao CRUD de Benefícios (HU-003) —
reaproveite o componente/padrão se possível. Campos: nome (obrigatório), descrição, valor (BRL).
Tabela tools com tenant_id e is_active, RLS por tenant_id, desabilitar em vez de deletar.
Revise contra os 3 Critérios de Aceite da HU-004.
```

---

### HU-005 — Recrutamento: pré-cadastro ao aprovar candidato

**Origem:** Pessoas J1.

**História de Usuário:**

- Como **DP**, quero **que ao mover um candidato para a coluna "Aprovado" no kanban ele seja criado como funcionário com status "pré-cadastrado" e dados já preenchidos**, para que **eu não precise redigitar nome, telefone e e-mail que já foram coletados na vaga**.

**Mockups / Referências Visuais:**

- [x] Referência de tela existente: kanban de recrutamento e formulário de cadastro de funcionário.

**Notas técnicas:**

- Gatilho: card movido para a coluna **Aprovado**.
- Cria registro de funcionário com `status: 'pre_cadastrado'`, pré-preenchendo **nome, telefone, e-mail** (já vindos do formulário da vaga).
- DP completa depois os campos de contrato (salário, cargo, tipo de contratação, data de admissão).
- **Zero redigitação** dos dados básicos.

**Critérios de Aceite:**

**Cenário 1: Aprovar gera pré-cadastro sem redigitar**

- **Dado** que um candidato tem nome, telefone e e-mail no formulário da vaga;
- **Quando** o DP move o card para a coluna "Aprovado";
- **Então** é criado um funcionário com status "pré-cadastrado" e nome, telefone e e-mail já preenchidos;
- **E** o DP só precisa completar os campos de contrato.

**Cenário 2: Não duplicar funcionário**

- **Dado** que um candidato já foi aprovado e gerou um pré-cadastro;
- **Quando** o card é movido para fora e de volta para "Aprovado";
- **Então** o sistema não cria um segundo funcionário para o mesmo candidato.

**Cenário 3 (validação): dado obrigatório ausente na vaga**

- **Dado** que o candidato está sem e-mail no formulário da vaga;
- **Quando** o DP move o card para "Aprovado";
- **Então** o pré-cadastro é criado mas sinaliza claramente os campos faltantes a completar.

**Prompt inicial sugerido (Claude Code):**

```
No repositório do Pulse, leia o kanban de recrutamento e o cadastro de funcionário existentes.
Tarefa: ao mover um candidato para a coluna "Aprovado", criar automaticamente um funcionário com
status 'pre_cadastrado', pré-preenchendo nome, telefone e e-mail vindos do formulário da vaga.
Evite duplicar funcionário se o card voltar para Aprovado. Filtre por tenant_id.
Revise contra os 3 Critérios de Aceite da HU-005.
```

---

### HU-006 — Desligamento de Funcionário

**Origem:** Pessoas J4.

**História de Usuário:**

- Como **DP**, quero **conduzir o desligamento de um funcionário com cálculo correto por tipo de contratação e desalocação automática dos projetos**, para que **eu não corra risco de erro legal nem deixe o ex-funcionário alocado ou com acesso indevido**.

**Mockups / Referências Visuais:**

- [x] Referência de tela existente: módulo de desligamento atual (já calcula CLT).

**Notas técnicas:**

- Validar primeiro os cálculos CLT existentes contra uma calculadora rescisória externa (pedido de demissão, sem justa causa, com justa causa).
- Desalocação: ao iniciar, status → `em_desligamento`; na data efetiva, remover alocações futuras em `project_member_months`, notificar GPs e bloquear novos lançamentos de timesheet.
- PJ: pagamento proporcional, sem FGTS/INSS patronal. Sócio: sem cálculo automático — exibir aviso para tratar via contrato social, só registrar saída e bloquear acesso.

**Critérios de Aceite:**

**Cenário 1: Desligamento CLT com cálculo conferido**

- **Dado** um funcionário CLT em processo de desligamento;
- **Quando** o DP conclui o processo (pedido de demissão e sem justa causa);
- **Então** as verbas rescisórias são calculadas e batem com uma calculadora externa de referência.

**Cenário 2: Desalocação automática na data efetiva**

- **Dado** que o funcionário está alocado em projetos;
- **Quando** chega a data efetiva do desligamento;
- **Então** as alocações futuras são removidas de `project_member_months`;
- **E** os GPs dos projetos afetados são notificados e novos lançamentos de timesheet ficam bloqueados.

**Cenário 3: Tipos PJ e Sócio**

- **Dado** um funcionário PJ ou Sócio;
- **Quando** o DP inicia o desligamento;
- **Então** PJ recebe cálculo proporcional sem encargos CLT, e Sócio exibe aviso de tratar via contrato social, apenas registrando a saída e bloqueando o acesso.

**Cenário 4 (validação): tipo de contratação não suportado**

- **Dado** um funcionário com tipo de contratação ainda não suportado;
- **Quando** o DP tenta desligar;
- **Então** o sistema exibe mensagem orientativa clara em vez de calcular errado.

**Prompt inicial sugerido (Claude Code):**

```
No repositório do Pulse, leia o módulo de desligamento atual (já tem cálculo CLT) antes de mexer.
Tarefa: (1) validar os cálculos CLT existentes; (2) implementar desalocação automática na data efetiva
(remover alocações futuras em project_member_months, notificar GPs, bloquear timesheet após a data);
(3) tratar PJ (proporcional, sem encargos CLT) e Sócio (sem cálculo automático, aviso + registro de saída
+ bloqueio de acesso). Filtre por tenant_id.
Revise contra os 4 Critérios de Aceite da HU-006.
```

---

## 6. Definition of Done (vale para toda história)

- [ ] Todos os Critérios de Aceite passam no teste manual.
- [ ] Filtragem por `tenant_id` em toda query e política de RLS aplicada no banco.
- [ ] Nenhum dado ativo quebrado (migrations preservam; desabilita em vez de deletar).
- [ ] Estados vazios e de erro tratados (sem tela em branco, sem zero passando por dado real).
- [ ] Card movido no board; bugs e fricções registrados.

---

## Apêndice A — `CLAUDE.md` sugerido (esqueleto)

Coloque na raiz do repositório. É o primeiro arquivo que o Claude Code lê.

```markdown
# Pulse — Contexto para o Claude Code

## Stack

- Frontend: React + TypeScript
- Backend: Supabase (Postgres, RLS, Auth, Storage, Edge Functions)
- IA: Claude API, modelo claude-sonnet-4-6

## Regras inegociáveis

- Multi-tenant: TODA query e TODA política de RLS filtra por tenant_id.
- Segurança no banco (RLS), não só escondendo elementos na UI.
- Nunca deletar dado de catálogo/cadastro: usar is_active = false.
- Migrations preservam dados existentes e não quebram referências ativas.
- Antes de escrever, leia o código existente relacionado e siga os padrões do projeto.

## Padrões do projeto

- (preencha: estrutura de pastas, padrão de componente, padrão de CRUD, padrão de chamada ao Supabase)

## Como verificar

- Toda entrega deve ser revisada contra os Critérios de Aceite da história (HACKATHON.md).
```

## Apêndice B — Template de prompt para o Claude Code

Use para qualquer história sem prompt pronto:

```
Contexto: repositório do Pulse (ver CLAUDE.md). Leia o código existente relacionado a [área] antes de mudar.

História: [colar narrativa Como/quero/para que].

Tarefa:
1. [passo]
2. [passo]

Restrições: filtrar por tenant_id; RLS no banco; desabilitar em vez de deletar; tratar estados vazios e de erro.

Ao final, revise sua entrega contra estes Critérios de Aceite e me diga o que ainda falta:
[colar os cenários Gherkin da história]
```

---

_Guia gerado para o Hackathon Origami Pulse. Ajuste premissas de stack e padrões no `CLAUDE.md` antes de começar._
