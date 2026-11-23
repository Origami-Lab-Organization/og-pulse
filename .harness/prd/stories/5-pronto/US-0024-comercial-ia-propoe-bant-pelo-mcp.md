# US-0024 — IA propõe evidências de BANT pela assinatura do Claude (fase 1)

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 19/11/2026 ("começando pela fase 1")
- **Relacionadas:** US-0020, US-0022, US-0023, ADR-0042, ADR-0054

## Descrição

**Como** pessoa do comercial,
**quero** pedir ao Claude (com a assinatura que já tenho) um desk research ou uma leitura das
notas da oportunidade e receber no Pulse evidências de BANT propostas, com a fonte,
**para** qualificar mais rápido sem perder a decisão: eu aceito ou recuso cada uma.

### Contexto

Decisão de 19/11/2026: começar a IA pela fase 1, usando as assinaturas do Claude que o time já
tem, pelo servidor MCP da Prospecção. A IA sugere, nunca decide (ADR-0054). A fase 2 (botão e
reavaliação automática dentro do Pulse, com chave de API) fica para depois.

### Escopo

- Inclui: ferramenta MCP `get_bant` (estado de cada letra, nota, meta, propostas e recusadas).
- Inclui: ferramenta MCP `propose_bant_evidence` (letra, estado, texto, fonte obrigatória); a
  evidência entra como **proposta**.
- Inclui: na aba "Estudo da conta", as propostas da IA com Aceitar e Recusar; no cartão do
  Pipeline, o aviso de propostas esperando.
- Inclui: o MCP respeita a regra do BANT ao mover para "Oportunidade qualificada".
- Não inclui: botão de desk research no Pulse e reavaliação automática (fase 2, com chave de
  API); leitura de transcrições e e-mails (depois, pelo ADR-0054).

## Critérios de aceite

**Cenário 1: a IA propõe**

- **Dado** uma oportunidade em Qualificação;
- **Quando** peço ao Claude "faça o desk research da [empresa] e proponha evidências de BANT";
- **Então** o Claude lê o BANT (`get_bant`) e a empresa (`get_company`), pesquisa e propõe
  evidências com a fonte (`propose_bant_evidence`);
- **E** elas aparecem na aba "Estudo da conta" como propostas, sem mudar a nota.

**Cenário 2: aceitar**

- **Quando** aceito uma proposta;
- **Então** a letra assume o estado proposto, a nota recalcula, e a evidência mostra "proposta
  pela IA, aceita por [pessoa] em [data]".

**Cenário 3: recusar**

- **Quando** recuso;
- **Então** nada muda no BANT, e a recusada fica no histórico; o `get_bant` a lista para a IA
  não repetir.

**Cenário 4: regra no MCP**

- **Dado** uma oportunidade com BANT 63;
- **Quando** peço ao Claude para movê-la para Oportunidade qualificada;
- **Então** ele recusa e diz o que falta.

**Cenário 5: sem permissão**

- **Dado** que tenho só `prospeccao:ler`;
- **Então** o Claude não consegue propor (o banco recusa), e na tela não vejo Aceitar e Recusar.

## Contexto técnico

- **Comportamento atual:** PROVADO — servidor `apps/mcp-prospeccao` com a sessão da pessoa
  (RLS), regras importadas de `src/` (TD-0022).
- **Banco:** `prospect_bant_evidencias` (migration `20261119120000`): origem `ia` sempre nasce
  `proposta` e só muda para `aceita` ou `recusada` (trigger), com quem decidiu e quando.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 5 | tela validada pelo Victor em 19/11/2026 (Aceitar e Recusar); os pedidos no Claude seguem a confirmar com o MCP do time depois do deploy; testes desativados |

- MCP: `get_bant`, `propose_bant_evidence`, regra em `move_contact_stage`, instruções do
  servidor; `db.evidenciasBant`, `db.proporEvidenciaBant`, `fmt.bantDaOportunidadeTexto`.
- Tela: `BantNaOportunidade` (propostas com Aceitar e Recusar), `LetrasDoBant` (selo "IA").
- MCP local do Victor atualizado em 19/11/2026 para o teste (cópia do anterior em
  `~/.og-pulse/bin/og-pulse-prospeccao.mjs.antes-us0024`); o servidor lista 29 ferramentas,
  com `get_bant` e `propose_bant_evidence`. Para o time, o pacote novo sai no deploy do merge.
