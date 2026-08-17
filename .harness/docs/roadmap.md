# Roadmap por Tema — og-pulse

> Documento de **planejamento** (não é doc código-derivada; sem `sources:`/drift-check).
> Gerado em 2026-08-17. Cadência de sprint: **quinzenal**. Roadmap organizado **por tema**
> (ondas de valor), sem cravar datas de sprint — cada tema vira 1–2 sprints quando puxado.

## Como ler

- **PROVADO** = existe hoje no Jira (PUL) ou no código. **PROPOSTA** = sequência/recorte que
  sugeri e você ajusta.
- Cada tema tem **Objetivo concreto**, **Valor** (pra quem e por quê agora), **Storytelling**
  (a narrativa da sprint) e os **Épicos** que ele consome.
- Fonte da estrutura: épicos e OKRs lidos do projeto PUL em 2026-08-17.

## Princípios de sprint (modelo operacional)

1. Toda sprint tem **um objetivo concreto** e **gera valor observável** — não é "lote de tarefas".
2. Toda sprint tem **storytelling**: por que agora, pra quem muda, o que a pessoa passa a conseguir.
3. Quinzenal. Uma meta por sprint; se não couber, o tema vira duas sprints.
4. Segurança e regressão de dado sensível são pré-requisito, não "fase depois".

---

## Esqueleto: OKRs do ano (PROVADO — Jira)

| OKR | Foco | Janela |
|---|---|---|
| [PUL-120](https://origamilab-team.atlassian.net/browse/PUL-120) O1 | Produto pronto + mercado aquecido | Jan–Mai 2026 |
| [PUL-121](https://origamilab-team.atlassian.net/browse/PUL-121) O2 | Validar PMF com clientes parceiros (30–40 pagantes, NPS≥7, TTFI≤7d) | Jun–Ago 2026 |
| [PUL-122](https://origamilab-team.atlassian.net/browse/PUL-122) O3 | Lançamento oficial + escala 80–100 clientes (ARR R$1,2M, churn<2%) | Set–Dez 2026 |
| [PUL-123](https://origamilab-team.atlassian.net/browse/PUL-123) O4 | Proteger o **aha moment** (alerta de desvio orçamentário), IA PT-BR, uptime | Ano todo |

**Momento atual (17/ago):** reta final do O2 (parceiros/PMF). O motor de escala do O3 começa em setembro.
Leitura de sequência: **primeiro tornar o dado confiável e inviolável** (pré-condição pra ter parceiros
pagantes com dados reais), **depois blindar o aha moment**, **depois** afiar aquisição/escala.

## Épicos de módulo (PROVADO — Jira)

Portal do Admin (PUL-33) · Meu Espaço (PUL-34) · Login (PUL-35) · Estratégia (PUL-36) ·
Comercial (PUL-37) · Projetos (PUL-38) · RH/DP (PUL-39) · Infra (PUL-47) · Compra (PUL-64) ·
Atividades de Projeto / Kanban ágil (PUL-74) · Blindagem de RLS (PUL-161).

---

# Temas (ondas de valor)

## T1 — Confiança: Segurança & Alocações  ⟵ EM ANDAMENTO (Sprint atual)
**Épicos:** PUL-161 (Blindagem de RLS) · PUL-38 Projetos (alocações — histórias a definir).

- **Objetivo concreto:** nenhum dado sensível (salário, custo, comissão, valor, PII) depende da
  tela pra estar protegido; e a alocação que embasa margem é confiável.
- **Valor:** pré-requisito de LGPD e isolamento multi-tenant para colocar **parceiros pagantes com
  dados reais** (O2). Sem isso, escalar clientes no O3 é risco jurídico e de vazamento.
- **Storytelling:** *"Antes de convidar mais empresas pra dentro do Pulse, o dado de cada uma
  precisa ser inviolável — e o gestor precisa confiar na alocação que sustenta a margem que ele
  apresenta ao cliente."*
- **Escopo Jira (PROVADO):** RLS = [PUL-162](https://origamilab-team.atlassian.net/browse/PUL-162)…[PUL-169](https://origamilab-team.atlassian.net/browse/PUL-169) (já no Sprint 0/atual).
- **Alocações (PENDENTE):** aguardando sua lista de pontos → viram histórias sob PUL-38.
- **Definição de pronto:** críticos de RLS (PUL-162/163) mergeados com teste negativo; ADR de RLS
  aberto; pontos de alocação priorizados entregues.

## T2 — O aha moment: Alerta de desvio orçamentário
**Épicos:** PUL-38 Projetos · PUL-36 Estratégia (guardrails) · liga direto ao O4 KR4.1.
- **Objetivo concreto:** alerta de desvio ativo em ≥80% dos projetos com +15 dias de vida.
- **Valor:** é **o** aha moment do produto (O4). É o que faz o parceiro perceber valor rápido e o
  que sustenta o NPS. Proteger e ativar isso é a maior alavanca de retenção.
- **Storytelling:** *"O gestor abre o Pulse e o sistema já o avisou que o projeto vai estourar —
  antes de ele descobrir no fim do mês. Esse susto evitado é por que ele fica."*
- **Definição de pronto:** alerta disparando com base em custo real × planejado; visível no
  detalhe do projeto e no dashboard; KR4.1 mensurável.

## T3 — Time-to-first-insight ≤ 7 dias (onboarding que encanta)
**Épicos:** PUL-34 Meu Espaço · PUL-35 Login · PUL-33 Portal do Admin · liga ao O2 KR2.3.
- **Objetivo concreto:** um tenant novo chega ao primeiro insight de valor em ≤7 dias.
- **Valor:** condição do PMF (O2) e do churn baixo do O3. Onboarding travado mata trial.
- **Storytelling:** *"Da criação da conta ao primeiro 'nossa, não sabia disso do meu projeto' em
  menos de uma semana — sem precisar de call de implantação."*
- **Definição de pronto:** fluxo de primeiro acesso → dado mínimo carregado → primeiro insight,
  medível por tenant.

## T4 — Execução de projeto: Atividades / Kanban ágil
**Épicos:** PUL-74 Atividades de Projeto (já descrito: 15 histórias, board 6 colunas, DoR/DoD, WIP).
- **Objetivo concreto:** times tocam o projeto dentro do Pulse (backlog→done) sem ferramenta externa.
- **Valor:** aumenta uso diário (stickiness) e alimenta os dados que o aha moment consome.
- **Storytelling:** *"O time para de viver no Trello paralelo: planejar, mover card e fechar sprint
  acontece onde a margem também é acompanhada."*
- **Definição de pronto:** conforme escopo do épico PUL-74 (MVP em 3 sprints).

## T5 — Motor comercial para o lançamento
**Épicos:** PUL-37 Comercial (Pipeline/Oportunidades/Orçamentos).
- **Objetivo concreto:** pipeline e orçamento redondos para sustentar aquisição do O3.
- **Valor:** o O3 exige escalar de ~35 para 80–100 clientes; o comercial precisa converter sem atrito.
- **Storytelling:** *"Quando o marketing do lançamento trouxer volume, a Oportunidade entra, vira
  Orçamento e fecha sem o time perder negócio por processo manual."*
- **Nota de nomenclatura:** UI sempre **Oportunidade/Pipeline/Orçamentos** — nunca Lead/CRM/Funil.

## T6 — RH/DP & Folha confiáveis
**Épicos:** PUL-39 RH/DP.
- **Objetivo concreto:** folha, custos, benefícios e desligamento corretos e auditáveis.
- **Valor:** custo de pessoa alimenta margem e o aha moment; erro aqui contamina tudo a jusante.
- **Storytelling:** *"O custo por pessoa que aparece na margem do projeto é o mesmo que o RH
  confia na folha — uma fonte só, sem planilha paralela."*

## T7 — IA conversacional em PT-BR
**Épicos:** liga ao O4 KR4.2 (≥90% das queries sem escalar humano). Módulo a definir.
- **Objetivo concreto:** IA responde a maioria das perguntas sobre os dados do tenant.
- **Valor:** reduz suporte humano e acelera o time-to-insight; diferencial de encantamento.
- **Storytelling:** *"O gestor pergunta em português 'qual projeto vai estourar esse mês?' e tem a
  resposta na hora, sem abrir cinco telas."*

## T8 — Escala & confiabilidade
**Épicos:** PUL-47 Infra · PUL-64 Compra · liga ao O3 (referral/Indique e Ganhe) e O4 (uptime ≥99,5%).
- **Objetivo concreto:** plataforma aguenta 80–100 clientes com uptime ≥99,5%; programa de referral no ar.
- **Valor:** sustenta a base do O3 sem degradar experiência; referral vira canal de aquisição barato.
- **Storytelling:** *"Crescer 3× a base sem que ninguém sinta o sistema mais lento — e transformar
  cliente satisfeito em vendedor via indicação."*

---

## Pendências / decisões abertas
- **T1 Alocações:** aguardando sua lista de pontos para virar histórias sob PUL-38.
- **Meta e nome do Sprint atual:** decidimos reusar o Sprint 0; a meta ainda fala de "Fundação/
  migração". Atualizar a **meta da sprint no board** (não editável via API) para refletir
  Segurança & Alocações, ou fechar o Sprint 0 e abrir "Sprint — Confiança".
- **T2/T7 donos de épico:** o aha moment e a IA ainda não têm épico dedicado no PUL — avaliar criar.
- **Sequência é PROPOSTA:** T1→T8 reflete "confiança do dado → aha moment → onboarding → uso →
  aquisição → escala". Ajuste a ordem conforme prioridade de negócio.
