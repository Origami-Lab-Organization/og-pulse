# US-0039 — Planejar o projeto guiado por um checklist que acompanha o preenchimento

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Portfólio de projetos
- **Prioridade:** 5
- **Aprovada por / em:** Victor Couto, 23/11/2026 (protótipo versão 8, tela "Projeto em planejamento", e as decisões abaixo)
- **Relacionadas:** US-0025, US-0030, US-0035, US-0037, ADR-0006, ADR-0027, ADR-0037, ADR-0049

## Descrição

**Como** GP do projeto ou admin,
**quero** planejar o projeto numa tela que mostra só o que falta planejar, com um checklist que
se atualiza enquanto eu preencho,
**para** concluir o planejamento sabendo o que é obrigatório, o que é opcional e se o
resultado planejado cabe no orçamento vendido.

### Contexto

Hoje o projeto em planejamento abre com todas as abas do projeto. O checklist fica numa aba
própria ("Planejamento") e some quando a pessoa vai preencher as outras abas. Ele tem seis
itens, todos com o mesmo peso. Para declarar um projeto sem gastos além da equipe, o GP marca
"o projeto só tem mão de obra". Nada compara o planejado com o orçado, e "Iniciar Execução"
deixa seguir com itens pendentes.

A nova experiência:

- O topo mostra a fase e os dados do projeto que vieram da venda.
- Aparecem só as cinco abas que se planejam.
- O checklist fica sempre à direita e separa os itens obrigatórios do opcional.
- O checklist mostra o resultado planejado contra o orçado.

Protótipo aprovado: `prototipos/portfolio-de-projetos.html`, tela "Projeto em planejamento"
(https://claude.ai/artifact/TAaDNbHEnW1nASwtTaGPPk, versão 8). Onde a história e o protótipo
divergem, vale a história: a aba Equipe mantém a grade mensal (cenário 6), e o protótipo usa
um campo só de horas por mês para simplificar.

### Escopo

- **Inclui:**
  - topo com fase e tempo em planejamento;
  - painel "Dados do projeto";
  - abas Objetivos, Roadmap, Equipe, Stakeholders e Custos;
  - checklist sempre visível, com o resultado planejado contra o orçado;
  - conclusão do planejamento, com confirmação dos opcionais vazios;
  - pedido e aprovação do admin quando o planejado fica abaixo do orçado, com devolução justificada;
  - a aba "Despesas" passa a se chamar "Custos";
  - a aba "Planejamento" deixa de existir em todas as fases;
  - o card do portfólio passa a mostrar "N de M obrigatórios".
- **Não inclui:**
  - o que o membro da equipe vê;
  - telas de Entrega de Valor e de Encerramento;
  - criação automática da pasta do OneDrive;
  - atualização em tempo real quando duas pessoas editam o mesmo planejamento ao mesmo tempo (cada uma vê o que está salvo ao abrir ou recarregar);
  - mudança nas regras de custo (US-0025) ou de lançamento só no período (US-0030).

## Critérios de aceite

**Cenário 1: o projeto em planejamento abre no planejamento**

- **Dado** um projeto na fase Planejamento;
- **Quando** o GP ou o admin abre o projeto;
- **Então** o topo mostra o nome, as fases com "Planejamento" destacada e a frase "Em planejamento há N dias · começa em dd/mm/aaaa";
- **E** o painel "Dados do projeto" mostra cliente, gerente do projeto, linha de serviço, período (com a quantidade de meses), valor do contrato, recebimento ("N parcelas", com a data da 1ª) e origem (data em que a Oportunidade foi ganha e o orçamento);
- **E** passar o mouse ou o foco em "N parcelas" mostra cada parcela com data e valor;
- **E** as abas são, nesta ordem, Objetivos, Roadmap, Equipe, Stakeholders e Custos;
- **E** não aparecem Visão Geral, Planejamento, Financeiro, Atividades, Arquivos, E-mails nem Reuniões.

**Cenário 2: o checklist está sempre presente**

- **Dado** o projeto em planejamento;
- **Quando** troco de aba;
- **Então** o checklist continua à direita (no celular e no tablet, acima das abas), com "N de 4 obrigatórios" e uma barra de progresso;
- **E** o grupo "Obrigatórios" lista Objetivos, Roadmap, Equipe e Stakeholders;
- **E** o grupo "Opcionais · informe se houver" lista Custos;
- **E** clicar num item abre a aba dele, e o item da aba aberta fica destacado;
- **E** o checklist não tem opção "o projeto só tem mão de obra" nem item que se marca à mão.

**Cenário 3: o checklist acompanha o preenchimento**

- **Dado** um item pendente;
- **Quando** preencho a aba dele até cumprir a regra da tabela abaixo;
- **Então** o item fica concluído na hora, com o resumo do que foi preenchido (por exemplo "3 pessoas · 600 h no período");
- **E** por alguns segundos o resumo começa com "Pronto ·";
- **E** a aba ganha a marca de concluída;
- **E** se eu remover o que cumpria a regra, o item volta a pendente.

| Item | Tipo | Concluído quando | Resumo pendente |
|---|---|---|---|
| Objetivos | obrigatório | 1 objetivo com pelo menos 1 resultado-chave | Pelo menos 1 objetivo com 1 resultado-chave |
| Roadmap | obrigatório | 1 marco dentro do período do projeto | Pelo menos 1 marco dentro do período |
| Equipe | obrigatório | 1 pessoa com horas em pelo menos 1 mês do período | Pelo menos 1 pessoa com horas |
| Stakeholders | obrigatório (opcional em projeto sem cliente, cenário 18) | 1 pessoa do cliente | Pelo menos 1 pessoa do cliente |
| Custos | opcional | 1 custo informado | Fornecedores, licenças, viagens… |

**Cenário 4: Objetivos**

- **Dado** a aba Objetivos;
- **Quando** adiciono um objetivo;
- **Então** o campo de resultado-chave dele recebe o foco;
- **E** um objetivo sem resultado-chave avisa que só conta com pelo menos 1;
- **E** posso remover objetivo e resultado-chave;
- **E** objetivo ou resultado-chave em branco não é salvo e o erro aparece junto do campo.

**Cenário 5: Roadmap**

- **Dado** a aba Roadmap;
- **Quando** adiciono um marco com nome e data;
- **Então** ele entra na lista em ordem de data;
- **E** marco sem nome, sem data ou com data fora do período do projeto não é salvo, e o erro diz o período.

**Cenário 6: Equipe**

- **Dado** a aba Equipe;
- **Quando** aloco pessoas e horas mês a mês, na grade mensal que a aba já tem hoje;
- **Então** a aba mostra um resumo com quantas pessoas, o total de horas no período, o custo da equipe e o custo da equipe orçado;
- **E** a tela não mostra o custo hora de cada pessoa, só o total da equipe.

**Cenário 7: Stakeholders**

- **Dado** a aba Stakeholders;
- **Quando** adiciono uma pessoa com nome, cargo (opcional) e papel (Patrocinador, Ponto focal, Usuário-chave ou Aprovador);
- **Então** ela aparece na lista e fica no cadastro do cliente, para os próximos projetos (ADR-0037);
- **E** sem nome não é salvo.

**Cenário 8: Custos**

- **Dado** a aba Custos;
- **Quando** adiciono um custo com descrição, tipo (Fornecedor, Licença ou software, Viagem, Material ou Outro), mês dentro do período e valor;
- **Então** ele entra na lista, e o rodapé mostra o total e o custo orçado;
- **E** sem descrição ou com valor zero não é salvo;
- **E** sem nenhum custo, a aba diz que não é preciso fazer nada se o projeto não tem custo além da equipe;
- **E** se o orçamento previa custos e nenhum foi informado, a aba avisa o valor orçado e que, sem eles, o resultado planejado fica melhor do que o real.

**Cenário 9: resultado planejado contra o orçado**

- **Dado** o checklist de um projeto com orçamento vinculado;
- **Quando** olho "Resultado planejado";
- **Então** vejo as linhas Equipe, Custos, Resultado e Margem, com as colunas Orçado e Planejado;
- **E** resultado = valor do contrato − comissão − equipe − custos, e margem = resultado ÷ valor do contrato;
- **E** o planejado pior que o orçado aparece em destaque de atenção;
- **E** os números mudam assim que a equipe ou os custos mudam;
- **E** não há frase dizendo de onde vêm a receita e a comissão.

**Cenário 10: concluir com obrigatórios pendentes**

- **Dado** pelo menos um obrigatório pendente;
- **Quando** olho o fim do checklist;
- **Então** o botão "Concluir planejamento" está desabilitado;
- **E** não há texto abaixo do botão (o que falta já está no checklist).

**Cenário 11: concluir dentro do orçado**

- **Dado** os obrigatórios concluídos e o resultado planejado igual ou maior que o orçado;
- **Quando** clico em "Concluir planejamento";
- **Então** a confirmação mostra o resultado e a margem planejados, e cada item com o resumo dele;
- **E** cada opcional vazio (Custos e, em projeto sem cliente, Stakeholders) aparece como não informado; Custos mostra também o valor que o orçamento previa;
- **E** com opcional vazio, os botões passam a ser "Informar [item]", que leva à aba do primeiro opcional vazio, e "Confirmar e concluir";
- **E** a confirmação não pede data: a data de início continua a do período em "Dados do projeto";
- **E** ao confirmar, o projeto vai para Entrega de Valor e a equipe alocada é avisada no sistema;
- **E** depois disso, mudanças no planejamento passam a contar como replanejamento.

**Cenário 12: planejado abaixo do orçado**

- **Dado** os obrigatórios concluídos e o resultado planejado menor que o orçado;
- **Quando** o GP olha o fim do checklist;
- **Então** vê quanto o planejado ficou abaixo do orçado e o botão "Pedir aprovação do admin";
- **E** depois de pedir, vê "Aguardando o admin" e continua podendo ajustar;
- **E** o card do projeto no portfólio mostra a pendência "Planejamento abaixo do orçado aguardando aprovação do admin" (US-0037).

**Cenário 13: mudança depois do pedido cancela o pedido**

- **Dado** um pedido de aprovação aberto;
- **Quando** o GP muda algo que altera o resultado planejado (equipe ou custos);
- **Então** o pedido é cancelado e a pendência sai do card;
- **E** o GP é avisado de que precisa pedir de novo;
- **E** se o resultado ainda estiver abaixo do orçado, o botão "Pedir aprovação do admin" volta;
- **E** se tiver voltado ao orçado, volta o "Concluir planejamento", sem aprovação.

**Cenário 14: o admin decide**

- **Dado** um pedido de aprovação aberto;
- **Quando** o admin abre o projeto;
- **Então** vê quanto o planejado ficou abaixo do orçado, "Aprovar e concluir" e "Devolver ao GP";
- **E** "Aprovar e concluir" abre a mesma confirmação do cenário 11, dizendo que ele está aprovando abaixo do orçado;
- **E** "Devolver ao GP" pede o motivo, que é obrigatório;
- **E** ao devolver, a pendência sai do card, o GP é avisado no sino e vê o motivo no checklist, junto do botão "Pedir aprovação do admin".

**Cenário 15: quem só lê**

- **Dado** alguém que vê o projeto mas não pode editar o planejamento (gerente de outro projeto);
- **Quando** abre o projeto em planejamento;
- **Então** vê os dados, as abas e o checklist sem formulários nem botões de remover;
- **E** no lugar do botão lê quantos obrigatórios faltam e "Quem conclui é o GP do projeto ou o admin.".

**Cenário 16: ocultar valores**

- **Dado** "Ocultar valores" ligado;
- **Quando** olho os dados do projeto, as abas e o checklist;
- **Então** contrato, parcelas, custos e o resultado planejado ficam ocultos.

**Cenário 17: o card do portfólio**

- **Dado** um projeto na coluna Planejamento;
- **Quando** olho o card;
- **Então** ele mostra "N de M obrigatórios", com a mesma regra do checklist (M é 4, ou 3 em projeto sem cliente).

**Cenário 18: projeto sem cliente**

- **Dado** um projeto sem cliente (produto interno, ADR-0049);
- **Quando** abro o planejamento;
- **Então** Stakeholders aparece no grupo "Opcionais · informe se houver", e o checklist mostra "N de 3 obrigatórios";
- **E** a aba Stakeholders continua disponível, mas não trava a conclusão.

**Cenário 19: projeto sem orçamento vinculado**

- **Dado** um projeto sem orçamento vinculado;
- **Quando** olho "Resultado planejado";
- **Então** vejo só a coluna Planejado;
- **E** não há aviso de custos orçados na aba Custos;
- **E** com os obrigatórios concluídos, "Concluir planejamento" fica disponível, sem pedido de aprovação.

**Cenário 20: projeto fora do planejamento não tem a aba Planejamento**

- **Dado** um projeto em Entrega de Valor, Encerramento ou Concluído;
- **Quando** abro o projeto;
- **Então** não aparece a aba "Planejamento" nem o checklist do planejamento;
- **E** o link antigo `?tab=planning` abre a primeira aba do projeto.

## Decisões (Victor Couto, 23/11/2026)

- Custos é opcional. A opção "o projeto só tem mão de obra" sai: quem não tem custo além da equipe não preenche nada, e a confirmação final mostra que Custos ficou vazio.
- Stakeholders é obrigatório, menos em projeto sem cliente, em que vira opcional.
- "Despesas" passa a se chamar "Custos".
- Abaixo do botão do checklist não há texto do que falta, porque os itens pendentes já aparecem no checklist.
- Não há frase dizendo de onde vêm a receita e a comissão.
- No planejamento aparecem só as abas que se planejam.
- Projeto fora do planejamento não tem a aba "Planejamento", nem em modo só leitura.
- As parcelas e a pasta do OneDrive saem do checklist. As parcelas aparecem em "Dados do projeto".
- O orçamento vendido é o limite: abaixo dele, o planejamento só é concluído com aprovação do admin.
- Projeto sem orçamento vinculado mostra só o planejado e conclui sem aprovação.
- Concluir o planejamento não pede data: a data de início continua a do período. Para mudar, o GP edita o projeto.
- A aba Equipe mantém a grade mensal de hoje, com o resumo novo.
- Mudança que altera o resultado depois do pedido de aprovação cancela o pedido; o GP pede de novo.
- Para devolver ao GP, o admin escreve o motivo, que é obrigatório; o GP recebe aviso no sino e vê o motivo no checklist.

## Contexto técnico

- **Objetivo observável:** o projeto com `portfolio_stage = 'planning'` abre na nova experiência, e o checklist é derivado dos dados salvos.
- **Comportamento atual:** PROVADO
  - `src/pages/ProjectDetail.tsx` mostra todas as abas em qualquer fase, inclusive "Planejamento", que fora da fase de planejamento aparece como "Planejamento concluído — visualização somente leitura".
  - `ProjectPlanningOverviewTab.tsx` tem 6 checks: cliente e GP, OKR com KR, membro com horas, marco, parcela e pasta do Drive. O handler `handleConfirmExecution` grava `portfolio_stage = 'value_delivery'`, `status = 'active'` e a data escolhida em `start_date`, e notifica os alocados.
  - Em planejamento, `ProjectCostsTab` recebe `isEditable` e a aba Financeiro mostra `ProjectExpectedResultTab`.
- **Comportamento esperado na conclusão:** grava `portfolio_stage = 'value_delivery'` e `status = 'active'` sem tocar em `start_date`, e notifica os alocados.
- **Superfícies conhecidas:**
  - `ProjectDetail.tsx`, `ProjectPlanningOverviewTab.tsx` (substituído), `ProjectOKRsTab`, `ProjectRoadmapTab`, `EquipeTab` (a grade mensal continua), `ProjectStakeholdersTab`, `ProjectCostsTab`, `ProjectHeader`;
  - card do portfólio (`PortfolioCard.tsx`) e pendências (US-0037, `ProjectPendingPanel.tsx`);
  - os dados vêm de `useProjectOKRs`, `useProjectMilestones`, `useProjectAllocations` (fonte da equipe, ADR-0006), `useProjectStakeholders`, `useProjectCostSummary` (US-0025) e do orçamento vinculado (`projects.budget_id` → `budgets`).
- **Restrições e padrões aplicáveis:**
  - regra do checklist num helper só, compartilhado pela página e pelo card (boundaries: regra multi-etapa em helper reutilizável);
  - custo hora individual não aparece (só o total da equipe);
  - Design System Origami (tokens de `src/index.css`), foco visível e navegação por setas nas abas.
  - Fontes: `.harness/boundaries.md`, `.harness/patterns/design-system.md`.
- **O que ainda precisa ser construído (engenharia):**
  - **Estado da aprovação do planejamento:** não existe no banco. Precisa de migration com pedido, aprovado ou devolvido, quem e quando, o resultado planejado no momento do pedido (para detectar a mudança do cenário 13) e o motivo da devolução, com RLS por tenant e pelo projeto.
  - **Capacidade para aprovar abaixo do orçado:** nova, via migration, com linha em `capability-matrix.md` (ADR-0027). Editar e concluir continuam em `projeto:editar` + `can_manage_project`.
  - **Orçado separado em equipe, custos e comissão:** levantar como sai do orçamento (`budgets` + `budget_versions.snapshot_data`; `planned_costs`, `commission_percent`).
  - **Avisos:** devolução e cancelamento do pedido usam as notificações existentes (sino).
- **Provas esperadas:** os 20 cenários. Os testes automatizados estão desativados no Harness, então vale evidência na tela, registrada na tabela de implementação.
- **Fora do escopo:** visão do membro, Entrega de Valor, Encerramento, criação automática da pasta do OneDrive, atualização em tempo real entre duas pessoas.

## Implementação

> Preenchido ao implantar. Todo cenário aponta para a prova.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1–20 | |

- **Commits / PR:**
- **Implantada em:**
