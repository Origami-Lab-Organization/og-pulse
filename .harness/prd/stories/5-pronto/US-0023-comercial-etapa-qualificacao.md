# US-0023 — Qualificar a empresa antes de abordar

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 19/11/2026 ("pode seguir nessa ordem… desenvolva tudo")
- **Relacionadas:** US-0008, US-0010, US-0019, US-0020, US-0022, US-0024, ADR-0040

## Descrição

**Como** pessoa do comercial,
**quero** que a empresa escolhida na tela Empresas entre numa etapa de Qualificação, que
acompanho numa aba da própria tela Empresas, onde eu a estudo antes de abordar,
**para** só abordar quem tem chance, com o gancho e a pessoa certa, e arquivar o resto.

### Contexto

Fluxo do quadro do Victor (19/11/2026): Empresa → qualificada? Não → arquiva; Sim →
Oportunidade (A abordar em diante) → qualificada pelo BANT? Não → arquiva (Perda); Sim →
Oportunidade qualificada → Ganho (contrato). A Qualificação é a primeira decisão; o estudo da
conta (US-0020) é o trabalho dela, e o BANT (US-0022) começa nela.

### Escopo

- Inclui: etapa "Qualificação" da oportunidade, antes de "A abordar", acompanhada na tela
  Empresas, aba **"Em qualificação"** (a outra aba é "Base de empresas", o filtro da base da Receita). O quadro do Pipeline
  começa em A abordar (revisão de 19/11/2026).
- Inclui: a aba "Em qualificação" é uma tabela para comparar: empresa (CNPJ e cidade), BANT
  (letras e nota), tipo de conta, fit, faturamento, responsável e desde quando; ordenada pela
  nota do BANT; a linha abre a ficha da oportunidade no "Estudo da conta".
- Inclui: "Mover para qualificação" (antes "Mover para abordar") na tela Empresas e na ficha;
  a empresa entra em Qualificação, com tipo de conta e responsável (US-0008).
- Inclui: a oportunidade em Qualificação abre na aba "Estudo da conta"; pesquisa registrada
  ali não conta como primeiro toque.
- Inclui: saída "A abordar" (o botão de avançar), e "arquivar" pela Perda (com motivo da lista,
  ex.: "Sem fit", "Momento errado") ou "Devolver para a lista", enquanto não houver atividade,
  tarefa nem contato.
- Não inclui: "Não agora" com data para voltar (US-0010, a rever como saída da Qualificação).

## Critérios de aceite

**Cenário 1: entrar em Qualificação**

- **Dado** uma empresa escolhida na tela Empresas;
- **Quando** confirmo "Mover para qualificação";
- **Então** a empresa aparece na aba "Em qualificação" da tela Empresas, com o responsável e
  o tipo de conta, e a aba mostra a contagem;
- **E** a mensagem diz "[empresa] em Qualificação", com Desfazer e o link que abre a ficha;
- **E** ela não aparece no quadro do Pipeline.

**Cenário 2: estudar na Qualificação**

- **Dado** uma oportunidade em Qualificação;
- **Quando** clico na linha da aba "Em qualificação";
- **Então** ela abre na aba "Estudo da conta", com o BANT;
- **E** registrar uma atividade ali não marca o primeiro toque nem muda a etapa.

**Cenário 3: qualificada → A abordar**

- **Dado** uma oportunidade em Qualificação;
- **Quando** uso o botão de avançar ("A abordar") na ficha;
- **Então** ela sai da aba "Em qualificação" e aparece em A abordar no Pipeline.

**Cenário 4: não qualificada → arquiva**

- **Dado** uma oportunidade em Qualificação que não vale abordar;
- **Quando** registro a Perda com o motivo (ex.: "Sem fit");
- **Então** ela sai do trabalho em aberto, como qualquer Perda;
- **Ou**, sem atividade, tarefa nem contato, "Devolver para a lista" a tira do Pipeline.

## Decisões (Victor Couto, 2026-11-19)

- A qualificação é uma etapa da oportunidade, antes de A abordar (recomendação aceita).
- Revisão (19/11): a Qualificação fica numa aba da tela Empresas, não como coluna do Pipeline —
  é trabalho sobre a empresa, chega em volume e pede tabela para comparar; o Pipeline mostra só
  o que tem conversa a conduzir.
- Nomes (19/11): a aba da base chama "Base de empresas"; no menu Comercial, Empresas vem antes
  de Oportunidades, na ordem do fluxo. Revê a decisão de 18/11 de "tela Empresas sem abas": agora
  são duas abas com papéis diferentes ("Base de empresas" e "Em qualificação").
- Na interface, "Oportunidade" no lugar de "lead".

## Contexto técnico

- **Comportamento atual:** PROVADO — etapas em `PROSPECT_STAGE_META` e listas derivadas
  (`src/types/prospect.ts`), usadas pela tela e pelo MCP; `prospects_stage_valid` no banco;
  gatilho `prospect_activities_advance` marca o primeiro toque.
- **Mudanças no banco:** migration `20261119120000_qualificacao_e_bant` (etapa no CHECK;
  gatilho de atividade sem primeiro toque na Qualificação), com rollback. Aplicada em produção em
  19/11/2026 com o ok do Victor; etapa, gatilho, tabela, RLS e gatilho de evidências conferidos.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 4 | validação na tela pelo Victor em 19/11/2026; testes desativados neste ciclo |

- Etapa `qualificacao` em `PROSPECT_STAGE_META`, `PROSPECT_FUNNEL_STAGES`,
  `PROSPECT_MANUAL_STAGES` e `PROSPECT_NEXT_STAGE` (→ `a_abordar`), fora de
  `PROSPECT_BOARD_STAGES` (o quadro começa em A abordar); aba "Em qualificação"
  (`qualificacao/EmQualificacao.tsx`, `useEmQualificacao`) na tela Empresas
  (`ProspeccaoEmpresas`, `?aba=qualificacao`, `?oportunidade=<id>` abre a ficha); a entrada pela base usa
  `stage: 'qualificacao'` (`abrirOportunidadeService`); aba inicial "Estudo da conta"
  (`ProspectDetailDialog`); "Devolver para a lista" também em Qualificação
  (`OpportunityHeader`); situação "Na fila" inclui Qualificação (`companyStatus`). O MCP
  herda a etapa pelas mesmas constantes.
