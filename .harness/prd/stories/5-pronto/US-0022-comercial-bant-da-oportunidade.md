# US-0022 — Qualificar a oportunidade pelo BANT, do começo ao fim

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 19/11/2026 ("pode seguir nessa ordem… desenvolva tudo")
- **Relacionadas:** US-0008, US-0019, US-0020, US-0021, US-0023 (etapa Qualificação), ADR-0040,
  ADR-0042, ADR-0054, US-0024 (IA pelo MCP)

## Descrição

**Como** pessoa do comercial,
**quero** acompanhar o BANT (Budget, Authority, Need, Timing) de cada oportunidade, letra por
letra, com a evidência de cada uma e uma nota que mostra o quanto ela está qualificada para a
etapa em que está,
**para** saber o que falta descobrir em cada conta e só levar para proposta quem de fato tem
verba, decisor, dor e momento.

### Contexto

O time já usa o BANT para qualificar a oportunidade à medida que ela anda no Pipeline: da
seleção da empresa à qualificação, à criação da oportunidade e até o Ganho ou a Perda (Victor,
19/11/2026). Hoje o BANT fica na cabeça de quem conduz. O Pulse já tem boa parte da evidência
espalhada (faturamento estimado, tipo de conta, regime tributário, fomento, sócios, papel na
decisão, fit, leitor do site, gatilhos, relação com a Origami), mas não a junta nas quatro
letras.

O fluxo decidido em 19/11/2026: Selecionar (tela Empresas) → **Qualificação** (etapa nova,
US-0023) → A abordar → … → Oportunidade qualificada → Ganho ou Perda. O BANT acompanha o mesmo
cartão do começo ao fim.

### As letras e seus estados

| Estado | Significa | Visual | Pontos |
|---|---|---|---|
| Não sei | nada levantado | letra apagada | 0 |
| Indício | sinal público, com fonte (notícia, site, LinkedIn, base) | contorno verde, fundo claro | 1 |
| Confirmado | o cliente disse (reunião, conversa, e-mail) | verde cheio | 2 |
| Não atende | sinal contra (sem verba, sem dor, sem decisor, sem momento) | vermelha | 0, com alerta |

**Nota do BANT** = pontos ÷ 8, de 0 a 100. Ex.: um indício e dois confirmados = 5 de 8 = 63.

### Meta da nota por etapa

| Etapa | Meta | Por quê |
|---|---|---|
| Qualificação | 38 (três indícios) | vale abordar: decisor mapeado, hipótese de dor, gancho de momento |
| A abordar, Em cadência, Respondeu | 38 | mantém o que a qualificação achou |
| Reunião agendada, Reunião feita | 50 | a conversa começa a confirmar |
| Oportunidade qualificada | **75** (três confirmados) | vale fazer proposta |

A meta só **orienta**, exceto na entrada em "Oportunidade qualificada", que **exige** nota 75 e
nenhuma letra "Não atende" (decisão de 19/11/2026).

### O que buscar em cada letra

| Letra | Pergunta | Já vem do Pulse | A pessoa ou o desk research busca | Confirma na conversa |
|---|---|---|---|---|
| **B** Budget | tem porte e verba para nosso ticket? | faturamento, tipo de conta, capital social, regime (Lei do Bem), fomento recebido, dívida ativa | notícias de investimento ou expansão, vagas abertas | verba, ciclo orçamentário, quem aprova |
| **A** Authority | quem decide e como chegamos nela? | sócios e administradores, relação com a Origami, papel na decisão | organograma no LinkedIn, Instagram, **pessoas em comum** (conexões do time, clientes, parceiros) | quem assina, se há comitê |
| **N** Need | há dor que resolvemos? | ramo e CNAE, fit por frente, pistas do site (ERP, MES) | notícias, vagas de TI ou automação, posts dos decisores, hipótese de dor | dor, impacto, prioridade |
| **T** Timing | por que agora? | gatilhos (Lucro Real, sócio novo, porte), calendário da Lei do Bem, editais | troca de diretoria, inauguração, contrato grande | prazo, evento que obriga, início |

### Escopo

- Inclui: as quatro letras no cartão do Pipeline (com a nota) e na oportunidade, numa área
  "BANT" (na aba "Estudo da conta" e no painel da oportunidade).
- Inclui: para cada letra, o estado, uma nota curta ("o que sabemos"), a fonte (link ou
  "conversa em [data]") e quem marcou e quando.
- Inclui: **indícios automáticos** pelo que o Pulse já sabe (ver hipóteses), marcados como
  "do Pulse"; contam enquanto ninguém registrou nada na letra, e a pessoa os troca registrando
  a própria evidência (inclusive "Não sei").
- Inclui: a nota de 0 a 100 e a meta da etapa, com destaque quando a nota está abaixo da meta.
- Inclui: entrada em "Oportunidade qualificada" exige nota 75 e nenhuma letra "Não atende"; a
  tela diz o que falta.
- Inclui: letra marcada como "Não atende" sugere registrar a Perda com o motivo
  correspondente (Budget → "Sem orçamento"; Need → "Sem fit"; Timing → "Momento errado /
  adiado"; Authority → sem motivo próprio, só alerta), sem registrar sozinha.
- Inclui: o histórico de cada letra (quem marcou o quê, quando, e as propostas recusadas), na
  própria letra. Ajuste no desenvolvimento (19/11): o histórico fica no BANT, não nos Registros,
  para a linha do tempo continuar sendo de contatos.
- Não inclui: a etapa Qualificação (US-0023); o desk research com IA, que propõe indícios com
  fonte (US-0020, parte 2, depois do ADR); Métricas do BANT (US-0021).

## Critérios de aceite

**Cenário 1: ver o BANT no Pipeline**

- **Dado** uma oportunidade com B confirmado, N indício e A e T sem nada;
- **Então** o cartão mostra B em verde cheio, N com contorno verde, A e T apagados;
- **E** a nota 38 e a meta da etapa;
- **E** a nota fica em destaque quando está abaixo da meta.

**Cenário 2: marcar uma letra**

- **Dado** que tenho `prospeccao:editar`;
- **Quando** abro a letra N e marco "Indício", com a nota "vagas de automação abertas" e o
  link da vaga;
- **Então** a letra fica com contorno verde, a nota recalcula e a mudança entra nos Registros.

**Cenário 3: confirmar depois da reunião**

- **Dado** N como indício;
- **Quando** marco "Confirmado" com a fonte "reunião de 20/11";
- **Então** a letra fica verde cheio e a nota sobe.

**Cenário 4: indícios automáticos**

- **Dado** uma empresa com faturamento estimado de R$ 150 mi, nota de fit alta numa frente e
  um gatilho de Lucro Real nos últimos 90 dias;
- **Quando** a oportunidade é criada;
- **Então** B e N aparecem como indício "do Pulse", com a fonte (faturamento, fit);
- **E** posso trocar qualquer um registrando a minha evidência, inclusive "Não sei".

**Cenário 5: não atende**

- **Dado** que marco Budget como "Não atende" ("sem verba até 2027");
- **Então** a letra fica vermelha;
- **E** a oportunidade sugere registrar a Perda com "Sem orçamento", sem registrar sozinha.

**Cenário 6: entrar em Oportunidade qualificada**

- **Dado** uma oportunidade com nota 63;
- **Quando** tento movê-la para "Oportunidade qualificada";
- **Então** o Pulse não move e diz o que falta (ex.: "Confirme mais uma letra");
- **Dado** nota 75 ou mais e nenhuma letra "Não atende";
- **Então** ela entra.

**Cenário 7: sem permissão**

- **Dado** que tenho só `prospeccao:ler`;
- **Então** vejo as letras, a nota e as evidências, sem editar.

## Decisões (Victor Couto, 2026-11-19)

- O BANT qualifica a oportunidade à medida que ela anda, desde a seleção até o Ganho ou a
  Perda; o mesmo cartão carrega o BANT do começo ao fim.
- A qualificação é uma etapa do Pipeline, antes de A abordar (US-0023).
- A letra identificada fica verde; sem identificação, apagada. Sugestão aceita: dois tons de
  verde (indício e confirmado) e vermelho para "não atende".
- A nota sobe com a evidência; a etapa define a meta.
- As metas orientam; só a entrada em "Oportunidade qualificada" exige o BANT (nota 75, sem
  "Não atende").
- "Não atende" sugere a Perda com o motivo correspondente, sem registrar sozinha.
- Pesos iguais para as quatro letras (19/11).
- Fluxo do quadro (19/11): Empresa → qualificada? Não → arquiva; Sim → **Oportunidade** (A abordar
  em diante) → qualificada pelo BANT? Não → arquiva (Perda); Sim → **Oportunidade qualificada** →
  Ganho (contrato). Na interface, "Oportunidade" no lugar de "lead" (boundaries).
- A IA sugere, nunca decide: toda mudança de letra proposta pela IA passa pelo aceite da pessoa
  (19/11). A IA pode ler notas, evidências e registros da oportunidade; transcrições de reunião
  e e-mails ficam para depois, dentro do ADR de IA.

## Pontos em aberto

### Hipóteses para validar

- Regras dos indícios automáticos (ajustáveis depois, pela regra do ADR-0042):
  - **B** indício: faturamento estimado ou do time de R$ 10 mi para cima (tipo de conta
    sugerido), ou fomento recebido;
  - **A** indício: alguém na oportunidade com papel Decisor;
  - **N** indício: nota de fit de 60 para cima em alguma frente, ou pista de sistema no site;
  - **T** indício: gatilho comercial nos últimos 90 dias — **ainda sem regra** (os gatilhos ficam
    nas notificações de cada pessoa, não na empresa); Timing começa em "Não sei".
- O BANT é da **oportunidade**, não da empresa: numa nova oportunidade da mesma empresa, ele
  recomeça, com os indícios automáticos. Origem: o momento e o decisor mudam entre tentativas.

### Provocações para produto

- Nota alta com evidência fraca — impacto possível: alguém marca "Confirmado" sem conversa
  para destravar a etapa; exigir fonte em "Confirmado" e mostrar quem marcou ajuda a auditar.
- Oportunidades já em "Oportunidade qualificada" hoje, sem BANT — impacto possível: ficam
  abaixo da meta; elas não são movidas, só aparecem em destaque.

## Contexto técnico

- **Objetivo observável:** quatro letras com estado, evidência e nota no cartão e na
  oportunidade; regra de entrada em "Oportunidade qualificada".
- **Termos do domínio:** Oportunidade (`prospects`), etapas (`PROSPECT_STAGES`), Perda e
  motivos (`PROSPECT_DISCARD_REASONS`), papel na decisão (`PROSPECT_CONTACT_ROLES`), gatilho
  comercial (`company-watch`), fit (`src/lib/prospecting/fit.ts`), tipo de conta (US-0008) —
  fonte: glossário.
- **Comportamento atual:** PROVADO — sem BANT no Pulse (busca por "BANT" só acha o Meu Kanban);
  "Oportunidade qualificada" (`qualificado`) entra pelo avanço manual; Registros da
  oportunidade (`prospect_activities`) guardam o histórico.
- **Superfícies conhecidas:** cartão do Pipeline (`ProspectKanbanCard`), ficha da oportunidade
  (`ProspectDetailDialog`, aba "Estudo da conta" e painel), avanço de etapa
  (`ProspectAdvanceButton`, quadro), MCP da Prospecção (TD-0022: ler e marcar o BANT; o avanço
  pelo MCP também respeita a regra).
- **Mudanças no banco (migration, sobe com o ok do Victor):** onde guardar estado, nota, fonte,
  autor e data de cada letra da oportunidade, e a regra de entrada em "qualificado" também no
  banco (para tela e MCP valerem igual).
- **Restrições e padrões aplicáveis:** regra explícita, sem IA (ADR-0042); a IA do desk
  research só propõe indício com fonte, e a pessoa aceita; acesso por `prospeccao:ler` e
  `prospeccao:editar`.
- **Riscos para investigar:** cálculo dos indícios automáticos sem pesar a lista do Pipeline;
  regra de etapa no banco e no MCP; oportunidades antigas.
- **Provas esperadas:** visual das quatro letras nos quatro estados; nota e meta por etapa;
  indícios automáticos por regra; "Não atende" sugerindo a Perda certa; bloqueio e liberação
  da entrada em "Oportunidade qualificada"; histórico nos Registros; leitura sem edição.
- **Fora do escopo:** etapa Qualificação (US-0023); desk research (US-0020, parte 2); Métricas
  (US-0021).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 7 | validação na tela pelo Victor em 19/11/2026; testes desativados neste ciclo |

- **Banco:** `prospect_bant_evidencias` (migration `20261119120000_qualificacao_e_bant`, com
  rollback): letra, estado, texto, fonte (obrigatória em "Confirmado"), origem (pessoa ou IA),
  situação (proposta, aceita, recusada), quem decidiu e quando; tenant herdado da oportunidade;
  RLS como as atividades; sem DELETE (é o histórico).
- **Regras:** `src/lib/prospecting/bant.ts` (estado = aceita mais recente, senão indício do
  Pulse; nota; meta por etapa; `oQueFaltaParaQualificar`; motivo de Perda sugerido), usadas
  pela tela e pelo MCP.
- **Regra de entrada:** `updateProspectStage` recusa "qualificado" sem nota 75 ou com "Não
  atende" (exceto voltando de Ganho ou Perda); o MCP faz o mesmo em `move_contact_stage`. Ainda
  não há trava no banco.
- **Tela:** `LetrasDoBant` no cartão do Pipeline e no cabeçalho da oportunidade;
  `BantNaOportunidade` na aba "Estudo da conta" (letras, evidência atual, Atualizar,
  histórico, propostas da IA); "Não atende" abre a sugestão de Perda com o motivo marcado
  (`DiscardProspectDialog.motivoSugerido`).
