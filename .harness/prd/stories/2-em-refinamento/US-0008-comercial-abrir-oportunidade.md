# US-0008 — Abrir oportunidade a partir da empresa

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** —
- **Relacionadas:** US-0006, US-0007, US-0009, US-0011, ADR-0040, ADR-0041, ADR-0042

## Descrição

**Como** pessoa do comercial,
**quero** abrir oportunidade para uma empresa da base com um clique,
**para** que ela entre no Pipeline em A abordar, com responsável, sem cadastro à mão.

### Contexto

Hoje, para trabalhar uma empresa nova, alguém cadastra a empresa, consulta o CNPJ e
cria a oportunidade. Com a base, a empresa já vem com os dados da Receita. Desde
2026-10-09 a oportunidade pertence à empresa e o contato é opcional, então dá para
abrir só com a empresa e o responsável.

### Escopo

- Inclui: botão "Abrir oportunidade" na linha (com o responsável padrão) e na ficha
  (escolhendo responsável, alavanca e observação); a empresa passa a existir na
  Prospecção com os dados da Receita; a oportunidade nasce em A abordar; mensagem de
  confirmação com Desfazer; a empresa sai de "A classificar" e vai para
  "Oportunidades abertas" (US-0011).
- Não inclui: escolher contato ou sócio na hora (segue pelo "Virar contato" da ficha
  da empresa na Prospecção); abrir em lote (US-0009).

## Critérios de aceite

**Cenário 1: abrir pela ficha**

- **Dado** que tenho `prospeccao:editar` e a empresa não está no Pipeline;
- **Quando** escolho responsável, alavanca e tipo de conta (US-0016) e clico em "Abrir
  oportunidade";
- **Então** a empresa aparece em A abordar no Pipeline, com o responsável e a alavanca;
- **E** a empresa fica com o tipo de conta escolhido;
- **E** vejo "Oportunidade aberta para [empresa] em A abordar, com [responsável]",
  com Desfazer.

**Cenário 2: abrir pela linha**

- **Quando** clico no botão de abrir oportunidade da linha;
- **Então** a oportunidade é aberta com quem clicou como responsável e a alavanca
  "Base da Receita".

**Cenário 3: empresa já no Pipeline**

- **Dado** que a empresa já tem oportunidade em andamento;
- **Então** o botão não aparece;
- **E** vejo a etapa e quem cuida dela.

**Cenário 4: dados completos depois de abrir**

- **Quando** a oportunidade é aberta;
- **Então** a empresa na Prospecção tem os dados da Receita, o regime tributário e a
  nota de fit completa, como se tivesse sido cadastrada pelo CNPJ.

**Cenário 5: faturamento calculado**

- **Dado** uma empresa com faturamento estimado;
- **Quando** abro a oportunidade;
- **Então** a empresa na Prospecção fica com esse faturamento e a base "Calculado";
- **E** o time pode trocar pelo valor dele, Estimado ou Apurado.

**Cenário 6: desfazer**

- **Dado** uma oportunidade aberta por esta tela, sem atividade, tarefa nem contato;
- **Quando** clico em Desfazer, na mensagem ou na aba "Oportunidades abertas";
- **Então** a oportunidade é apagada e a empresa volta para "A classificar".

**Cenário 7: não dá mais para desfazer**

- **Dado** que alguém já registrou atividade, tarefa ou contato na oportunidade;
- **Então** Desfazer não aparece;
- **E** o caminho é registrar a Perda no Pipeline.

**Cenário 8: sem permissão**

- **Dado** que tenho só `prospeccao:ler`;
- **Então** vejo a lista e a ficha, sem os botões de classificar.

## Decisões (Victor Couto, 2026-11-15 e 2026-11-16)

- A empresa classificada vira oportunidade em A abordar.
- O botão se chama "Abrir oportunidade".
- O faturamento calculado entra na empresa com a base "Calculado" (2026-11-16).
- O botão rápido da linha usa quem clicou como responsável e a alavanca nova "Base da
  Receita", para as Métricas mostrarem o que veio desta tela (2026-11-16).
- Desfazer vale até a primeira atividade, tarefa ou contato registrado (2026-11-16).

## Pontos em aberto

### Hipóteses para validar

- Empresa que já existe na Prospecção sem oportunidade em andamento é reaproveitada,
  em vez de duplicada. Origem: modelo de empresa com várias oportunidades (migration
  20261009120000).

### Provocações para produto

- Duas pessoas abrindo oportunidade para a mesma empresa quase ao mesmo tempo —
  impacto possível: duas oportunidades em andamento para a mesma conta.

## Contexto técnico

- **Objetivo observável:** empresa da base vira oportunidade em `a_abordar`.
- **Termos do domínio:** Oportunidade (`prospects`), empresa (`prospect_companies`),
  etapa A abordar (`a_abordar`), alavanca, responsável — fonte: glossário.
- **Comportamento atual:** PROVADO — dados da Receita gravados pela RPC
  `save_prospect_company_receita` (ADR-0041); oportunidade por empresa com contato
  opcional desde a migration 20261009120000; regime vem da BrasilAPI, com a CNPJá como
  reserva sem regime (`../../../integrations/brasilapi-cnpj.md`).
- **Alavanca nova:** "Base da Receita" entra na lista fechada de alavancas (migration
  20260917190000), no glossário e nas opções do MCP da Prospecção.
- **Restrições e padrões aplicáveis:** escrita de Oportunidade tem duas implementações,
  tela e MCP; mexer em uma sem a outra cria divergência — fonte: TD-0022 e
  `../../../ai-review-checklist.md`; Perda e Ganho seguem as regras atuais — fonte:
  ADR-0040.
- **Riscos para investigar:** duplicidade de empresa por CNPJ; corrida entre duas
  pessoas; limite de consultas da CNPJá quando a BrasilAPI cai.
- **Provas esperadas:** criação da empresa e da oportunidade; bloqueio quando já está
  no Pipeline; acesso negado sem `prospeccao:editar`; desfazer.
- **Fora do escopo:** escolher contato na hora de abrir.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
