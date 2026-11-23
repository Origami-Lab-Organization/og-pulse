# US-0008 — Mover empresas para abordar

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 18/11/2026 (versão revista depois da validação da tela)
- **Relacionadas:** US-0006, US-0007, US-0010, US-0017, US-0019, US-0020, ADR-0040, ADR-0041, ADR-0042, TD-0022

## Descrição

**Como** pessoa do comercial,
**quero** selecionar na lista as empresas que vou abordar e movê-las para A abordar,
confirmando se cada uma é Âncora, Ponte ou Satélite,
**para** que elas entrem no Pipeline com responsável e tipo de conta, sem cadastro à mão.

### Contexto

O fluxo do Victor (18/11/2026): analiso as empresas com os filtros, seleciono uma ou várias
para abordar, confirmo o tipo de conta de cada uma, vejo o relacionamento da Origami com ela
(US-0019) e faço o estudo da conta antes da abordagem (US-0020).

A Origami separa as contas em três tipos (material "Projetos · Empresas de base"):

| | Âncora | Ponte | Satélite |
|---|---|---|---|
| Quem é | Acima de R$ 300 mi, de base | De R$ 100 a 300 mi | De R$ 10 a 100 mi |
| Contrato | Fases de 6 meses, renovadas todo ano | Fases de 6 a 12 meses, parcela menor | 6 meses ou mais; piloto em 2027 |
| Ticket | R$ 40 a 60 mil por mês | R$ 15 a 30 mil por mês | R$ 7 mil por mês |

Esta história incorpora a seleção em lote (antiga US-0009) e o tipo de conta (antiga
US-0016), arquivadas em 18/11/2026.

### Escopo

- Inclui: caixa de seleção em cada linha e "selecionar todas desta página"; barra com a
  quantidade selecionada, "Mover para abordar" e "Limpar seleção".
- Inclui: "Mover para abordar" também na ficha (US-0007), para uma empresa só.
- Inclui: janela de confirmação com o responsável (padrão: quem move) e a lista das
  empresas, cada uma com o tipo de conta sugerido pelo faturamento estimado e editável. O
  tipo é obrigatório: sem ele, a empresa não entra.
- Inclui: a empresa vai direto para A abordar no Pipeline de Oportunidades, cadastrada com os
  dados da Receita (como na importação por CNPJ, ADR-0041), com o tipo de conta e o
  faturamento estimado como "Calculado" (quando o time não informou o dele); a oportunidade
  nasce sem alavanca.
- Inclui: a tela Empresas vira só a base da Receita com filtros, sem abas: saem "A
  classificar" e "Na Prospecção" (a lista de contas); a classificação é o tipo de conta, feita
  obrigatoriamente ao mover para abordar.
- Inclui: a ficha completa da empresa abre de dentro da oportunidade ("Ver ficha completa da
  empresa"), e o link das notificações de gatilho (`?empresa=`) passa a abri-la no Pipeline.
- Inclui: empresa que já tem oportunidade em andamento não entra de novo; a confirmação diz
  quais ficaram de fora e por quê.
- Inclui: mensagem de confirmação com Desfazer, que apaga as oportunidades criadas enquanto
  elas não têm atividade, tarefa nem contato; o cadastro das empresas fica.
- Inclui: "Devolver para a lista" no menu da oportunidade em A abordar, com a mesma regra do
  Desfazer, para quem mudou de ideia depois que a mensagem fechou.
- Inclui: o tipo de conta aparece e pode ser editado no cartão da empresa da oportunidade e na
  ficha completa da empresa, e substitui o Tier (o Tier sai na US-0017).
- Não inclui:
  - alavanca: é o canal de chegada na empresa e é definida ao abordar, ou ao criar a
    oportunidade direto no Pipeline (decisão de 18/11/2026; ver US-0020);
  - relacionamento da Origami com a empresa (US-0019) e estudo da conta (US-0020);
  - Não agora e Descartar (US-0010).

## Critérios de aceite

**Cenário 1: mover uma empresa pela ficha**

- **Dado** que tenho `prospeccao:editar` e a empresa não tem oportunidade em andamento;
- **Quando** clico em "Mover para abordar" na ficha;
- **Então** a janela mostra o responsável (eu) e o tipo sugerido pelo faturamento;
- **Quando** confirmo;
- **Então** a empresa aparece em A abordar no Pipeline, com o responsável e o tipo de conta;
- **E** vejo "[empresa] em A abordar, com [responsável]", com Desfazer e o link.

**Cenário 2: mover várias pela lista**

- **Dado** que marquei cinco empresas na lista;
- **Quando** clico em "Mover para abordar" na barra;
- **Então** a janela lista as cinco, cada uma com o tipo sugerido;
- **Quando** troco o tipo de uma e confirmo;
- **Então** as cinco entram em A abordar com o responsável escolhido e o tipo de cada uma;
- **E** vejo "5 empresas em A abordar, com [responsável]", com Desfazer.

**Cenário 3: sugestão do tipo de conta**

- **Dado** uma empresa com faturamento de R$ 150 mi (pela RAIS, aproximado ou do time);
- **Então** o tipo vem sugerido como Ponte; acima de R$ 300 mi, Âncora; de R$ 10 a 100 mi,
  Satélite;
- **Dado** uma empresa só com o piso do porte, ou abaixo de R$ 10 mi;
- **Então** o tipo não vem sugerido, a janela avisa o porquê e a pessoa escolhe.

**Cenário 4: tipo obrigatório**

- **Dado** uma empresa sem tipo escolhido na janela;
- **Então** "Confirmar" fica indisponível e a empresa aparece destacada.

**Cenário 5: empresa já sendo abordada**

- **Dado** que uma das empresas selecionadas já tem oportunidade em andamento;
- **Quando** confirmo;
- **Então** ela não entra de novo;
- **E** a mensagem diz "[empresa] já está em [etapa], com [responsável]".

**Cenário 6: dados completos depois de mover**

- **Então** a empresa na Prospecção tem os dados da Receita, o regime tributário e a nota de
  fit completa, como se tivesse sido cadastrada pelo CNPJ;
- **E** o faturamento estimado fica com a base "Calculado", quando o time não informou o dele.

**Cenário 7: desfazer**

- **Dado** oportunidades criadas agora, sem atividade, tarefa nem contato;
- **Quando** clico em Desfazer na mensagem;
- **Então** elas são apagadas e saem de A abordar; o cadastro das empresas fica;
- **E**, se alguma já tiver atividade, tarefa ou contato, ela fica, e a mensagem avisa que o
  caminho é registrar a Perda.

**Cenário 8: editar o tipo depois**

- **Dado** uma oportunidade de uma empresa com tipo de conta;
- **Então** vejo o tipo no cartão da empresa e na ficha completa, e posso trocá-lo.

**Cenário 9: sem permissão**

- **Dado** que tenho só `prospeccao:ler`;
- **Então** vejo a lista e a ficha, sem seleção nem "Mover para abordar".

**Cenário 10: Receita fora do ar**

- **Dado** que a consulta da Receita falha para uma empresa;
- **Então** aquela empresa não entra, as outras entram, e a mensagem diz qual faltou, com
  "Tentar de novo".

**Cenário 11: devolver para a lista**

- **Dado** uma oportunidade em A abordar, sem atividade, tarefa nem contato;
- **Quando** escolho "Devolver para a lista" no menu da oportunidade;
- **Então** ela sai de A abordar e o cadastro da empresa fica, com o tipo de conta;
- **E** a ficha da empresa na tela Empresas volta a oferecer "Mover para abordar";
- **Dado** que ela já tem atividade, tarefa ou contato;
- **Então** ela fica, e a mensagem diz que o caminho é registrar a Perda.

## Decisões (Victor Couto, 2026-11-15, 2026-11-16 e 2026-11-18)

- A empresa escolhida vira oportunidade em A abordar (15/11).
- O faturamento calculado entra na empresa com a base "Calculado" (16/11).
- Desfazer vale até a primeira atividade, tarefa ou contato; apaga só a oportunidade e
  mantém a empresa na Prospecção (16/11 e 18/11).
- O tipo de conta é obrigatório, sugerido pelo faturamento, fica na empresa em campo próprio
  com lista fechada e substitui o Tier (16/11, da US-0016).
- Depois da validação da tela (18/11):
  - o fluxo é selecionar uma ou várias empresas e movê-las para abordar; a seleção em lote
    (US-0009) e o tipo de conta (US-0016) entram nesta história;
  - sem alavanca: ela é o canal de chegada, definida ao abordar ou ao criar a oportunidade
    direto no Pipeline; a alavanca "Base da Receita" sai do banco, da tela e do MCP;
  - o botão passa a se chamar "Mover para abordar".
- A empresa não some da lista; a marca de relacionamento entra na US-0019 (18/11).
- Depois da aplicação da migration (18/11): a tela Empresas é só um filtro da base, sem abas;
  a empresa movida para abordar entra no Pipeline de Oportunidades, em A abordar; a ficha
  completa da empresa abre de dentro da oportunidade, e a lista de contas sai. Substitui a
  US-0011 (abas da classificação), arquivada.
- O botão e a ação passam a se chamar "Mover para abordar" (antes, "Colocar para abordar"),
  na validação da US-0019 (18/11).
- 19/11/2026 (US-0023): a empresa entra em **Qualificação**, não mais direto em A abordar; o
  botão vira "Mover para qualificação", e "Devolver para a lista" vale também na Qualificação.
- "Devolver para a lista" no menu da oportunidade em A abordar, com a regra do Desfazer, para
  não usar "Excluir oportunidade", que apaga histórico (18/11).
- "Importar CNPJs" fica na tela Empresas, para a empresa que não está na base (uso raro); o
  "Ver contas" das Métricas sai, e as Métricas são revistas na US-0021 (18/11).

## Pontos em aberto

### Hipóteses para validar

- Empresa que já existe na Prospecção é reaproveitada, em vez de duplicada. Origem: CNPJ
  único por tenant (`prospect_companies_tenant_cnpj_key`).

### Provocações para produto

- Empresa importada por CNPJ é cadastrada sem oportunidade e, sem a lista de contas, não
  aparece em nenhuma tela até alguém abrir uma oportunidade para ela no Pipeline — impacto
  possível: importação "perdida"; caminho provável: a importação também mover para abordar,
  com o tipo de conta.

- Duas pessoas colocando a mesma empresa quase ao mesmo tempo — impacto possível: duas
  oportunidades em andamento para a mesma conta; a tela confere antes de criar, mas não trava
  no banco.
- Muitas empresas de uma vez consultam a Receita uma a uma — impacto possível: com 50
  empresas, alguns minutos e o limite de consultas da BrasilAPI; a janela mostra o
  andamento.

## Contexto técnico

- **Termos do domínio:** Oportunidade (`prospects`), empresa (`prospect_companies`), etapa A
  abordar (`a_abordar`), responsável, tipo de conta (novo no glossário) — fonte: glossário.
- **Comportamento atual:** PROVADO —
  - criação da empresa pela importação por CNPJ (`useBulkCompanyImport`,
    `save_prospect_company_receita`, ADR-0041), com fila e limite da BrasilAPI;
  - oportunidade por empresa, contato opcional (migration 20261009120000);
  - `prospect_companies.tier` é texto livre (faceta em `COMPANY_FACETS`, gravado também pelo
    MCP);
  - já implementado na versão anterior desta história (não commitado): serviço de abertura,
    Desfazer, base "Calculado" (migration 20261118120000 aplicada em produção).
- **Mudanças no banco (migrations, sobem com o ok do Victor):**
  - coluna `tipo_conta` em `prospect_companies` (`ancora`, `ponte`, `satelite`; nula para
    quem ainda não foi classificado);
  - a alavanca `base_receita` sai de `prospects_lever_valid` (nenhuma oportunidade a usa,
    conferido em 18/11/2026);
  - com os rollbacks.
- **Restrições e padrões aplicáveis:** escrita de Oportunidade e da empresa também no MCP
  (TD-0022); moeda truncada nas faixas (ADR-0011); acesso por `prospeccao:editar`.
- **Provas esperadas:** uma pela ficha; várias pela lista; sugestão em cada faixa e nos
  limites de R$ 10, 100 e 300 mi; sem sugestão; empresa já em andamento; desfazer; sem
  permissão; Receita fora do ar; edição do tipo na Prospecção.
- **Fora do escopo:** alavanca; relacionamento (US-0019); estudo da conta (US-0020).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 11 | validação na tela pelo Victor em 18/11/2026; testes desativados neste ciclo |

- **Serviço:** `src/services/abrirOportunidadeService.ts` — `colocarParaAbordar` move uma
  por vez (pausa de 1,2 s entre consultas e uma nova tentativa depois de 1 min se a BrasilAPI
  recusar pelo limite); a falha de uma não impede as outras; `desfazerAberturas` desfaz o lote.
- **Tela:** caixas de seleção e barra na lista (`EmpresasReceitaTable`, `BarraDeSelecao`,
  `useSelecaoDeEmpresas`); janela `ColocarParaAbordarDialog` (responsável, tipo sugerido por
  `tiposSugeridos`, andamento); botão na ficha; mensagem com Desfazer e, para as que falharam,
  outra com "Tentar de novo" (`useColocarParaAbordar`). Sem `prospeccao:editar`, nada disso
  aparece.
- **Tela Empresas sem abas** (`ProspeccaoEmpresas`): saem `ContasDaProspeccao`,
  `CompanyTable` e `CompanyFilterButton`; `?empresa=` redireciona para o Pipeline, que abre
  a ficha (`FichaDaEmpresaNoPipeline`, `useLinhaDaEmpresa`); `company-watch` passa a mandar o
  link do Pipeline (sobe com o deploy da função).
- **Devolver para a lista:** item do menu da oportunidade (`OpportunityHeader`), só em A
  abordar e fora da leitura, com `useDevolverParaALista` sobre `desfazerAbertura`.
- **Tipo de conta na oportunidade:** chip e edição no cartão da empresa
  (`OpportunityCompanyCard`), em Segmentação e na edição da ficha completa
  (`CompanyDetailDialog`); no MCP, `tipo_conta` em `create_company`/`update_company` e na
  leitura da empresa (TD-0022).
- **Migrations:** `20261118120000_base_da_receita_na_prospeccao` aplicada em produção em
  18/11/2026 (alavanca `base_receita` e base `calculado`); `20261118160000_tipo_de_conta`
  (coluna `tipo_conta` e saída da alavanca `base_receita`) aplicada em produção em 18/11/2026,
  com o ok do Victor; coluna e restrições conferidas no banco; rollback em `supabase/rollback/`.
