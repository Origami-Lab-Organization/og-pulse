# Knowledge Platform — plano de construção

Status: proposta para discussão. Nada aqui foi iniciado.
Visão: eventos de todas as ferramentas do time → pipeline de conhecimento →
base pesquisável → agentes.

```
Eventos (Teams, Email, GitHub, CRM, Jira, Deploy, Claude, ...)
   ↓  Event Bus
   ↓  Knowledge Pipeline (normalização → enriquecimento IA)
   ↓  Knowledge Base
   ↓  Busca + Agentes
```

---

## 1. O que já existe e serve de fundação (verificado no repo)

| Peça do diagrama | O que já temos |
|---|---|
| Event Bus / workers | `pg_cron` + `pg_net` **já em produção** (crons de NF e ponto chamando Edge Functions). O padrão fila-em-Postgres + worker agendado já é usado no projeto. |
| Ingestão | 16 Edge Functions no ar, incluindo endpoints públicos com validação própria (`microsoft-sso`). Webhook de fonte externa é o mesmo formato. |
| Eventos internos | CRM/Pipeline, projetos, timesheets, ritos **já moram no nosso Postgres** — 46 triggers no schema. Emitir evento aqui é trigger, não integração. |
| Enriquecimento IA | `ANTHROPIC_API_KEY` já está nos Secrets das functions. |
| Knowledge Base | Postgres multi-tenant com RLS madura. `pgvector` é uma migration (`CREATE EXTENSION vector`) — Supabase suporta nativamente. |
| Identidade | SSO Entra ID validando tokens no servidor; MSAL no cliente. |

**A lacuna estrutural:** toda a integração Microsoft construída até aqui é
**client-side e delegada (`/me`)** — o token vive no navegador de cada pessoa e
morre em ~24h. Serve para UI; **não serve para ingestão**. Pipeline exige
ingestão server-side, e isso é a decisão nº 1 abaixo.

---

## 2. As três decisões que precisam de ADR antes de código

### D1 — Como ingerir e-mail/agenda/Teams no servidor

Opções, da menos à mais invasiva:

a. **Por usuário, opt-in**: cada pessoa autoriza e guardamos refresh token
   cifrado no servidor (Postgres, RLS, cifrado com chave de function). Ingestão
   só de quem aderiu. Mais trabalho de engenharia, menor exposição.
b. **Application permissions no Entra** (`Mail.Read` de aplicação + admin
   consent): o sistema lê **todas** as caixas do tenant, sem ação do usuário.
   Simples de operar, exposição máxima — vira decisão de diretoria, não técnica
   (LGPD: dado pessoal de todo mundo, inclusive e-mails privados).

Agravante Teams: ler mensagens de canal em escala é **API protegida da
Microsoft** — exige pedido formal de aprovação à MS. Chat 1:1 via change
notifications tem licenciamento próprio (modelo B, cobrado). Teams entra no
plano como fase tardia por burocracia, não por técnica.

### D2 — ACL do conhecimento (o problema mais perigoso do projeto)

Um e-mail ingerido da caixa do GP **não pode** aparecer na busca de todo mundo.
Sem modelo de visibilidade, isso é um vazamento de dados com UI bonita, e
viola `boundaries.md` (dados pessoais/comerciais tratados como públicos).

Proposta: todo `knowledge_item` nasce com `visibility`:
- `private` (só quem originou — e-mails, chats 1:1)
- `project` (membros do projeto — eventos de repo, ritos, Jira)
- `tenant` (todo o tenant — CRM, deploys, anúncios)

RLS aplica a visibilidade na **busca**, não na UI. Busca de agente herda a ACL
do usuário que pergunta — agente nunca busca com privilégio próprio.

### D3 — Onde isso roda

O MVP cabe no Lovable Cloud (provado pelos crons existentes). Mas pipeline com
volume (webhooks de repo + e-mail de 20 pessoas + embeddings) vai pressionar
limites de Edge Function e a falta de acesso ao dashboard. A migração para
Supabase próprio — já discutida por outros motivos — vira pré-requisito em
algum ponto entre a Fase 2 e 3. Decisão adiável; registrá-la agora evita
construir algo que amarre mais ao Lovable.

---

## 3. Arquitetura proposta (mapeando o diagrama em peças reais)

```
[fontes externas]      [dados internos]
  webhook Edge Fn         triggers SQL
       │                       │
       └──────► events ◄───────┘          ← append-only, tenant_id, source,
                  │                          external_id, payload, occurred_at,
        pg_cron worker (Edge Fn)             status (pending/processed/failed)
                  │
          normalização → knowledge_items  ← schema canônico: ator, título,
                  │                          corpo, refs (projeto/cliente/
          enriquecimento (Claude)            oportunidade), visibility
                  │                        ← resumo, entidades, classificação,
          embeddings → knowledge_chunks      vínculo automático a projeto
                  │       (pgvector)
                  ▼
        busca híbrida (tsvector + cosine) via RPC, filtrada por RLS
                  │
        UI de busca no Pulse  +  agente (Claude tool-use → search_knowledge)
```

Escolhas deliberadas:
- **Event bus é Postgres**, não Kafka/fila externa. O padrão já roda no
  projeto, o volume inicial é baixo e a migração futura é troca de transporte,
  não de modelo.
- **Embeddings**: `gte-small` nativo do runtime de Edge Functions
  (`Supabase.ai`) para começar — zero custo e zero chave nova; trocar por
  Voyage/OpenAI depois é recriar índice, não rearquitetar.
- **Enriquecimento é assíncrono e reprocessável**: evento cru fica guardado;
  se o prompt melhorar, reprocessa-se o histórico.

---

## 4. Fontes, por custo real de entrada

| Fonte | Caminho | Custo | Quando |
|---|---|---|---|
| CRM/Pipeline, Projetos, Timesheets, Ritos | triggers no nosso banco | horas | Fase 1 |
| GitHub (commits, PRs, issues) | webhook + HMAC | 1 dia | Fase 1 |
| CI/CD, Deploy (Actions) | mesmo webhook GitHub | horas | Fase 1 |
| Claude Code (nós!) | hooks do harness → endpoint | 1 dia | Fase 1–2 |
| Jira | webhook nativo | 1 dia | quando usarem |
| Slack | Events API | 1 dia | se usarem (time é Teams) |
| E-mail / Calendário | Graph change notifications + renovação por cron | 1–2 semanas **após D1** | Fase 2 |
| Terraform Cloud | webhook nativo | horas | quando usarem |
| Logs | depende da origem — definir o que é "conhecimento" | ? | Fase 3 |
| Teams (mensagens) | API protegida — aprovação Microsoft | semanas de burocracia | Fase 3 |
| WhatsApp | Business API (Meta) — custo, aprovação, templates | semanas | Fase 3 |
| Meet | Google Workspace — time é Microsoft; provável cortar | — | provavelmente nunca |
| ChatGPT | Compliance API só enterprise | — | provavelmente nunca |

---

## 5. Fases

**Fase 1 — vertical fina, ponta a ponta (1–2 semanas de trabalho)**
Espinha dorsal completa com fontes que **já são nossas**: tabela `events`,
triggers de CRM/projetos/ritos, webhook GitHub, worker de normalização,
enriquecimento Claude, embeddings, busca híbrida e uma tela de busca no Pulse.
Zero permissão nova, zero LGPD novo, zero dependência do Lovable além do que já
existe. Prova o pipeline inteiro e já entrega valor ("busca tudo do projeto X").

**Fase 2 — e-mail e calendário server-side**
Depois do ADR D1 decidido e configurado no Entra. Subscriptions do Graph com
renovação via cron (expiram em ~3 dias), endpoint de notificação, ingestão com
`visibility: private` por padrão.

**Fase 3 — fontes caras** (Teams, WhatsApp, logs) por ROI, uma a uma.

**Fase 4 — agentes**: Claude tool-use com `search_knowledge` respeitando a ACL
do usuário. Só faz sentido com base povoada — agente sobre base vazia é demo.

---

## 6. Riscos que não são técnicos

- **LGPD**: ingerir e-mail/chat é tratamento de dado pessoal em escala. Precisa
  de base legal, política interna comunicada e, idealmente, opt-in (reforça a
  opção D1-a). Envolver quem responde por isso na empresa **antes** da Fase 2.
- **Confiança do time**: "a empresa indexa meus e-mails" mal comunicado destrói
  a adoção de tudo, inclusive do que já foi entregue. A visibilidade `private`
  por padrão e transparência sobre o que é coletado são o antídoto.
- **Custo de IA**: enriquecer todo evento com Claude tem custo por volume.
  Mitigação: enriquecer por lote, modelos menores (Haiku) para classificação,
  e enriquecimento sob demanda para itens frios.
```
