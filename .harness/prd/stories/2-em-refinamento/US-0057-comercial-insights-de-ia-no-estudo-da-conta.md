# US-0057 — Insights de IA no Estudo da conta

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** NÃO PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** a definir no refino
- **Pedida por / em:** Victor Couto, 26/11/2026 ("gerar insights de IA igual no Econodata… quando
  colocarmos a empresa para qualificar, o usuário pode pressionar os insights de IA para ajudar na
  qualificação")
- **Depende de:** US-0053 (página da empresa e Estudo da conta)
- **Relacionadas:** US-0022 e US-0024 (evidências do BANT propostas e aceitas pela pessoa), US-0054,
  US-0056; a busca de notícias e referências que ficou fora da US-0053
- **Referência:** a página da empresa no Econodata tem blocos "Clientes" ("Pra quem essa empresa
  vende?"), "Concorrentes" e "Produtos e Serviços", cada um com um botão "Gerar insights com IA".

## Descrição

**Como** pessoa do comercial que está qualificando uma empresa,
**quero** pedir à IA um resumo do que a empresa vende, para quem vende e com quem concorre, com as fontes,
**para** estudar a conta mais rápido e qualificar com mais segurança.

### Contexto

O Estudo da conta da página da empresa (US-0053) guarda a síntese e os links, notas e arquivos que a
pessoa junta à mão. A busca de notícias e referências ficou para depois. O Victor viu no Econodata os
blocos de insights gerados por IA e quer o mesmo no Pulse, disponível quando a empresa entra em
qualificação, acionado pela pessoa.

O Pulse já chama a IA da Anthropic pela Edge Function da Análise de mercado (`market-analysis-start`,
com `ANTHROPIC_API_KEY`), e já tem o padrão de a IA propor e a pessoa aceitar, nas evidências do BANT.

### Escopo (a confirmar no refino)

- Inclui, como hipótese:
  - botão "Gerar insights com IA" no Estudo da conta, para empresas em qualificação;
  - insights por tema: produtos e serviços, clientes (para quem vende), concorrentes, notícias e
    referências recentes e, talvez, faturamento e funcionários estimados com fontes;
  - cada insight com as fontes (links) e a data em que foi gerado.
- Não inclui, como hipótese: insights automáticos sem a pessoa pedir; dados comprados (Serasa,
  Econodata).

## Decisões pendentes

1. **Quais temas entram** e em que ordem: produtos e serviços, clientes, concorrentes, notícias, porte
   (faturamento e funcionários), fit com os serviços da Origami, pessoas-chave?
2. **O que a IA pode gravar:** o insight fica só no Estudo da conta, ou pode propor valores para campos
   da empresa (faixa de funcionários, faturamento, site, LinkedIn) que a pessoa aceita ou recusa, como no
   BANT?
3. **Quando fica disponível:** só em qualificação, ou também na Base e com a Oportunidade em andamento?
4. **Quem pode gerar e com que limite:** toda pessoa com `prospeccao:editar`? Limite por empresa ou por
   mês, por causa do custo de cada chamada?
5. **Atualizar:** gerar de novo substitui o insight anterior ou guarda o histórico?
6. **Fontes obrigatórias:** insight sem fonte aparece, com aviso, ou não aparece?
7. **Em qual ADR se encaixa:** o ADR-0042 manda o fit e a priorização saírem de regra, sem IA; o ADR-0054
   permite a IA no BANT só como sugestão com fonte, que a pessoa aceita ou recusa na tela. Insights que só
   informam o estudo cabem no ADR-0054; se a IA passar a mexer no fit, na priorização ou em campos da
   empresa sem a pessoa aceitar, é preciso um ADR novo.

## Provocações para produto

- A IA pode errar com segurança, como aconteceu com o faturamento da Gecal. Sem a fonte ao lado, a pessoa
  não tem como conferir.
- Se o insight puder preencher a faixa de funcionários, ele resolve o erro da RAIS (US-0054) para as
  empresas em qualificação, mas aí precisa da confirmação de alguém, como o BANT.

## Contexto técnico

- **Comportamento atual:**
  - PROVADO: a IA da Anthropic é chamada pelas Edge Functions `market-analysis-start` e
    `market-analysis-refine` (`.harness/docs/architecture/integrations.md`, linha da Anthropic).
  - PROVADO: o Estudo da conta guarda links, notas e arquivos em `prospect_company_estudo` (migration
    20261126100000, US-0053), com RLS por tenant.
  - PROVADO: as evidências do BANT são propostas e aceitas ou recusadas pela pessoa
    (`prospect_bant_evidencias`, US-0024, ADR-0054).
- **Riscos para investigar:** custo por chamada e limite; busca na web pela API (fontes verificáveis);
  dados pessoais de sócios e funcionários na resposta (LGPD, ADR-0041); tempo de resposta (a chamada pode
  levar dezenas de segundos).
- **Provas esperadas:** a definir no refino.
