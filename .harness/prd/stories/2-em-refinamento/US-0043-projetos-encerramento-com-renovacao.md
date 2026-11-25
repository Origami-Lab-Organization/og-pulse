# US-0043 — Encerrar o projeto decidindo a renovação e entregando os resultados

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Portfólio de projetos
- **Prioridade:** 6
- **Aprovada por / em:** —
- **Depende de:** US-0045 (empresa e cliente num cadastro só)
- **Relacionadas:** US-0022, US-0035, US-0037, US-0038, US-0039, US-0045, ADR-0019, ADR-0021, ADR-0027, ADR-0040, ADR-0049

> **Em espera (25/11/2026):** aguarda os épicos 1 a 4 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`. Será revisada como a história 5.4 (renovação na linha Projetos vira projeto novo por Oportunidade de expansão; Lei do Bem renova no card do ano-base, no épico 6).

## Descrição

**Como** GP do projeto ou admin,
**quero** decidir a tempo se o projeto vai ter continuidade e concluí-lo só depois de entregar
os resultados ao cliente, o value book e o case,
**para** que nenhum cliente termine o projeto sem uma conversa de renovação e todo projeto
concluído deixe registrado o que entregou.

### Contexto

Hoje o fim do projeto não tem um ritual:

- O quadro do Portfólio já tem a coluna Encerramento, preenchida pela data: o projeto aparece
  nela nos últimos 20 dias antes da data de fim e depois dela (US-0035).
- O cabeçalho do projeto ainda mostra cinco fases, com Apresentação de Resultados e
  Aprendizado e Case como fases.
- Para concluir, basta arrastar o card para Concluído e informar a data. Nada pede os
  resultados, o value book ou o case.
- Ninguém é lembrado de conversar sobre a renovação antes do fim. A continuidade depende da
  memória do GP e do comercial.

A nova experiência:

- O projeto passa a ter quatro fases: Planejamento → Entrega de Valor → Encerramento →
  Concluído. Apresentação dos resultados e case viram entregáveis do Encerramento.
- 45 dias antes do fim, o GP decide a continuidade: abre uma Oportunidade de renovação no
  Pipeline ou confirma que o projeto encerra.
- Concluir é uma ação no projeto, liberada só com os três entregáveis prontos.

Protótipo: `prototipos/portfolio-de-projetos.html`, tela "Em Encerramento"
(https://claude.ai/artifact/TAaDNbHEnW1nASwtTaGPPk). Onde a história e o protótipo divergem,
vale a história: no protótipo os três entregáveis são caixas de marcar, e aqui o primeiro
é a confirmação do GP de que os resultados estão atualizados e os outros dois pedem o arquivo.

### Escopo

- Inclui:
  - stepper do cabeçalho com quatro fases;
  - decisão de renovação (abrir Oportunidade ou confirmar que encerra);
  - Oportunidade de renovação aberta pelo projeto, inclusive por GP sem acesso à Prospecção;
  - três entregáveis de encerramento com prazo;
  - "Concluir projeto" no projeto, só com os três entregáveis;
  - pendências de renovação e de entregáveis no sino do card e na Visão Geral (US-0037);
  - fim do arrasto para Concluído no quadro;
  - "Reabrir projeto" do admin, que devolve o projeto concluído ao Encerramento.
- Não inclui:
  - projeto contínuo, sem data de fim, que renova o contrato pela data de renovação;
  - projeto interno e produto interno (ADR-0049), que não têm cliente para renovar;
  - visão do membro e matriz de permissões do protótipo, que serão histórias próprias;
  - gerar o value book ou o case (há skills para isso fora do Pulse);
  - ferramenta nova no MCP. O arquivo fica identificável no Pulse para o MCP achar, mas
    ensinar o MCP a perguntar "qual o value book do projeto X" é outra história.

## Critérios de aceite

**Cenário 1: quatro fases no cabeçalho**

- **Dado** qualquer projeto de cliente;
- **Quando** abro o projeto;
- **Então** o stepper mostra Planejamento → Entrega de Valor → Encerramento → Concluído;
- **E** o projeto está em Encerramento quando faltam 20 dias ou menos para a data de fim, ou
  quando a data de fim já passou e ele não foi concluído (mesma regra da coluna do quadro,
  US-0035);
- **E** projetos gravados nas fases antigas Apresentação de Resultados ou Aprendizado e Case
  aparecem como Encerramento.

**Cenário 2: hora de decidir a renovação**

- **Dado** um projeto de cliente, não contínuo, em Entrega de Valor ou Encerramento, com
  45 dias ou menos até a data de fim;
- **Quando** o GP do projeto ou o admin abre a Visão Geral;
- **Então** vê o bloco "Este projeto vai ter continuidade?" com "Abrir Oportunidade de
  renovação" e "Confirmar que encerra";
- **E** o card no Portfólio ganha a pendência "Decidir a renovação: o projeto termina em
  dd/mm/aaaa" no sino (US-0037).

**Cenário 3: projeto curto**

- **Dado** um projeto com menos de 45 dias entre o início e a data de fim;
- **Então** o bloco da renovação aparece desde o início do projeto.

**Cenário 4: abrir a Oportunidade de renovação**

- **Dado** o bloco da renovação;
- **Quando** o GP do projeto ou o admin escolhe "Abrir Oportunidade de renovação" e confirma;
- **Então** uma Oportunidade é criada no Pipeline da Prospecção para a empresa ligada ao
  cliente do projeto (US-0045):
  - na etapa Oportunidade qualificada;
  - com a alavanca Expansão;
  - com o GP do projeto como responsável;
  - ligada ao projeto de origem;
- **E** a Oportunidade entra em Oportunidade qualificada sem a exigência do BANT comprovado
  (US-0038), por ser de cliente ativo;
- **E** quem tem acesso para editar a Prospecção recebe no sino o aviso da renovação aberta,
  com o link da Oportunidade;
- **E** o bloco vira o aviso "Oportunidade de renovação aberta", com a data e quem abriu;
- **E** a pendência de renovação sai do sino;
- **E** o GP não precisa ter acesso à Prospecção. Abrir a renovação não lhe dá acesso ao resto
  do Pipeline.

**Cenário 5: confirmar que encerra**

- **Dado** o bloco da renovação;
- **Quando** o GP do projeto ou o admin escolhe "Confirmar que encerra" e confirma;
- **Então** nenhuma Oportunidade é aberta;
- **E** o bloco vira o aviso "Encerramento confirmado", com a data e quem confirmou;
- **E** a pendência de renovação sai do sino.

**Cenário 6: a renovação se decide uma vez**

- **Dado** um projeto com a renovação já decidida;
- **Então** as duas opções não aparecem de novo;
- **E** quem não é GP do projeto nem admin vê o aviso da decisão, sem os botões.

**Cenário 7: entregáveis de encerramento**

- **Dado** um projeto em Encerramento;
- **Quando** o GP do projeto ou o admin abre a Visão Geral;
- **Então** vê "Entregáveis de encerramento · N de 3", com o prazo: uma semana depois da data
  de fim;
- **E** os três entregáveis são:
  1. Apresentação dos resultados (OKRs) ao cliente;
  2. Value book do projeto;
  3. Case interno do projeto.

**Cenário 8: resultados dos OKRs confirmados pelo GP**

- **Dado** o entregável "Apresentação dos resultados (OKRs)";
- **Quando** o GP do projeto ou o admin confirma que os resultados estão atualizados na aba
  Objetivos;
- **Então** o entregável fica pronto, mostrando quem confirmou e quando;
- **E** a confirmação não exige lançamento novo, porque um resultado-chave pode não ter
  evoluído;
- **E** o entregável mostra o atalho para a aba Objetivos, para conferir antes de confirmar.

**Cenário 8a: projeto sem resultado-chave**

- **Dado** um projeto sem nenhum resultado-chave cadastrado;
- **Quando** o projeto foi criado antes de 24/11/2026, data em que o planejamento guiado
  (US-0039) entrou em produção;
- **Então** o GP pode confirmar o entregável mesmo sem OKR;
- **E** quando o projeto foi criado a partir de 24/11/2026, o entregável pede "Cadastre os
  resultados-chave do projeto", com o atalho para a aba Objetivos, e só libera a confirmação
  depois do cadastro.

**Cenário 9: value book e case pelo arquivo**

- **Dado** o entregável "Value book" ou "Case interno";
- **Quando** o GP do projeto ou o admin envia o arquivo pelo próprio entregável;
- **Então** o arquivo vai para a pasta do projeto (no OneDrive, quando a pasta está vinculada;
  senão, nos arquivos do Pulse, ADR-0019);
- **E** o entregável fica pronto, mostrando o nome do arquivo, quem enviou e quando;
- **E** o Pulse guarda qual arquivo é o value book e qual é o case do projeto, para o MCP e
  as pessoas acharem depois;
- **E** trocar o arquivo substitui o entregável, e o anterior continua na pasta.

**Cenário 10: prazo dos entregáveis**

- **Dado** um projeto em Encerramento com entregável faltando;
- **Então** o sino do card mostra "Entregáveis de encerramento até dd/mm/aaaa";
- **E** depois do prazo, a pendência aparece como atrasada.

**Cenário 11: concluir o projeto**

- **Dado** os três entregáveis prontos;
- **Quando** o GP do projeto ou o admin clica em "Concluir projeto";
- **Então** abre a confirmação com um calendário para escolher a data de conclusão, já
  preenchida com hoje, porque o GP pode ter esquecido de concluir no dia;
- **E** a data de conclusão é diferente da data de fim do projeto, que foi informada na
  abertura e não muda;
- **E** ao confirmar, o projeto vai para Concluído com a data escolhida;
- **E** aparece na coluna Concluído do ano no Portfólio;
- **E** daqui em diante só o admin edita o projeto.

**Cenário 12: concluir sem os entregáveis**

- **Dado** algum entregável faltando;
- **Então** "Concluir projeto" fica desabilitado, com o aviso do que falta.

**Cenário 13: sem arrasto para Concluído**

- **Dado** o quadro do Portfólio;
- **Quando** arrasto um card para Concluído;
- **Então** o card não muda de coluna e o aviso diz que se conclui no projeto, com os
  entregáveis.

**Cenário 14: reabrir projeto concluído**

- **Dado** um projeto concluído;
- **Quando** o admin escolhe "Reabrir projeto" e confirma;
- **Então** o projeto volta para Encerramento;
- **E** a data de conclusão é apagada;
- **E** os entregáveis e a decisão de renovação continuam como estavam;
- **E** o GP pode corrigir o que faltou e concluir de novo;
- **E** quem não é admin não vê "Reabrir projeto".

## Decisões (Victor Couto, 24/11/2026)

- Quatro fases no cabeçalho, Planejamento → Entrega de Valor → Encerramento → Concluído.
  Apresentação dos resultados e case viram entregáveis. Concluir só no projeto, sem arrastar.
- O GP do projeto (ou o admin) abre a Oportunidade de renovação pelo projeto, sem ganhar acesso
  geral à Prospecção, e fica como responsável do card.
- A Oportunidade de renovação entra em Oportunidade qualificada, com a alavanca Expansão, que
  já existe na lista.
- Entregáveis: value book e case são arquivos enviados ao Pulse, para o MCP achar o artefato.
- Do protótipo (tela "Em Encerramento"): aviso 45 dias antes do fim, ou no início para projeto
  mais curto; vale para qualquer tipo de conta (Âncora, Ponte ou Satélite); prazo dos
  entregáveis uma semana depois da data de fim; depois de concluído, só o admin edita.
- Entregável de OKRs (refinamento, 24/11/2026): é a confirmação do GP de que os resultados
  estão atualizados, para todo projeto, sem exigir lançamento, porque o OKR pode não ter
  evoluído. Projeto criado antes da US-0039 (24/11/2026) confirma mesmo sem resultado-chave.
- Reabrir: botão "Reabrir projeto" só do admin; o projeto volta ao Encerramento.
- Data de conclusão: o GP escolhe num calendário ao concluir, com hoje sugerido. É diferente
  da data de fim do projeto.
- A renovação nasce em Oportunidade qualificada sem o BANT comprovado (US-0038), por ser
  cliente ativo. Quem edita a Prospecção é avisado no sino.
- Empresa e cliente: unificar o cadastro na empresa antes desta história (US-0045). A empresa
  da renovação é a ligada ao cliente do projeto.

## Pontos em aberto

### Hipóteses para validar

- **Limites da data de conclusão.** A data não pode ser futura nem anterior ao início do
  projeto.
- **Confirmação dos OKRs depois de reabrir.** Ao reabrir, a confirmação dos OKRs continua
  valendo; o GP só confirma de novo se quiser.

### Provocações para produto

- **Oportunidade da mesma empresa já aberta.** A empresa pode já ter uma Oportunidade aberta,
  por exemplo outro serviço. Impacto possível: duas Oportunidades da mesma empresa no Pipeline.
  A Prospecção permite isso desde 09/10/2026, mas pode confundir.
- **"Confirmar que encerra" por engano.** A decisão é única (cenário 6). Se o cliente mudar de
  ideia depois, o caminho é o comercial abrir a Oportunidade pela Prospecção, fora do projeto.

## Contexto técnico

- **Objetivo observável:**
  - projeto de cliente com decisão de renovação registrada antes do fim;
  - conclusão só com os três entregáveis;
  - value book e case achados como arquivos do projeto.
- **Termos do domínio:**
  - Oportunidade e Pipeline (nunca Lead, CRM ou Funil);
  - Oportunidade qualificada;
  - alavanca Expansão (`expansao`);
  - Ganho;
  - fase do portfólio (`projects.portfolio_stage`);
  - coluna Encerramento (derivada da data);
  - entregável de encerramento.
- **Comportamento atual:**
  - PROVADO: as fases gravadas são cinco (`PortfolioStage` em `src/types/portfolio.ts`).
  - PROVADO: a coluna Encerramento do quadro é derivada da data (`boardColumnOf` e
    `isInClosingWindow` em `src/lib/portfolioBoard.ts`, janela de 20 dias).
  - PROVADO: o stepper de cinco fases fica em `StageStepper`
    (`src/components/projects/detail/ProjectHeader.tsx`).
  - PROVADO: a conclusão é pelo arrasto para Concluído, com a data
    (`src/components/portfolio/PortfolioKanbanBoard.tsx`, diálogo "Concluir projeto?").
  - PROVADO: o projeto liga à Oportunidade de origem por `projects.prospect_id`.
  - PROVADO: o lançamento de resultado-chave grava em `key_result_history`
    (`src/hooks/useProjectOKRs.ts`); a confirmação do entregável não depende dele.
  - PROVADO: a US-0039 entrou em produção em 24/11/2026 (PR #105); o corte de "projeto
    antigo" usa a data de criação do projeto (`projects.created_at`).
  - PROVADO: o BANT só é exigido no `BEFORE UPDATE OF stage` de `prospects`
    (`20261124100000_bant_para_qualificar.sql`).
  - PROVADO: o GP não tem `prospeccao:editar` (`.harness/capability-matrix.md`).
- **Comportamento esperado:** cenários 1 a 14.
- **Superfícies conhecidas:**
  - cabeçalho do projeto (stepper);
  - Visão Geral do projeto (blocos de renovação e de entregáveis);
  - quadro do Portfólio (arrasto, sino e coluna Concluído);
  - pendências (`src/lib/portfolioBoard.ts` e US-0037);
  - Prospecção (criação da Oportunidade e aviso no sino a quem tem `prospeccao:editar`);
  - empresa ligada ao cliente (`prospect_companies.client_id`), garantida pela US-0045;
  - aba Arquivos e pasta do OneDrive (ADR-0019);
  - MCP og-pulse-drive (`list_project_folder`, `list_project_okrs`), só para conferir que o
    arquivo é achável.
- **Restrições e padrões aplicáveis:**
  - Feature nova nasce com a capacidade que governa o acesso, no mesmo commit: valor em
    `capabilities`, linha na `capability-matrix.md` e RLS (ADR-0027, `boundaries.md`).
  - Criar a Oportunidade por quem não tem `prospeccao:editar` passa por caminho próprio e
    restrito ao projeto que a pessoa gere. Se for função `security definer`, precisa da
    guarda de tenant (ADR-0021).
  - Schema só por migration versionada, com horário depois da última aplicada em produção.
  - UI no Design System (`patterns/design-system.md`); pendências no formato da US-0037.
- **Riscos para investigar:**
  - GP criando Oportunidade sem acesso à Prospecção (autorização e tenant);
  - duplicidade se dois cliques ou duas pessoas decidirem a renovação ao mesmo tempo;
  - envio para o OneDrive falhando ou sem pasta vinculada;
  - projetos antigos nas fases Apresentação de Resultados e Aprendizado e Case;
  - reabrir: o que acontece com a data de conclusão e com receitas e indicadores do ano que
    contam projetos concluídos;
  - o atalho de BANT da renovação não pode virar caminho para qualificar outras
    Oportunidades sem BANT;
  - telas que leem `portfolio_stage` (timesheet, alocação, Meus Projetos, relatórios de
    receita) e o que passam a mostrar.
- **Provas esperadas:**
  - regra de quando aparece a renovação (45 dias, projeto curto, contínuo e interno fora);
  - Oportunidade criada uma vez só, com etapa, alavanca, responsável e origem certos;
  - GP sem Prospecção consegue abrir a renovação e não consegue mais nada no Pipeline;
  - entregável de OKRs pela confirmação do GP, e projeto novo sem resultado-chave bloqueado;
  - data de conclusão escolhida, separada da data de fim;
  - "Reabrir projeto" só do admin, de volta ao Encerramento;
  - aviso no sino de quem edita a Prospecção;
  - entregáveis de arquivo registrados;
  - "Concluir projeto" só com os três;
  - arrasto para Concluído recusado;
  - projeto concluído editável só pelo admin.
  - renovação em Oportunidade qualificada sem o BANT, e o BANT continua exigido em qualquer
    outra entrada nessa etapa.
- **Fora do escopo:** projeto contínuo, projeto interno e produto interno; visão do membro;
  matriz de permissões; gerar value book ou case; ferramenta nova no MCP.

## Implementação

> Preenchido ao implantar. Todo cenário aponta para a prova.

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
