# US-0020 — Estudar a conta antes de abordar

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 18/11/2026
- **Relacionadas:** US-0006, US-0008, US-0018, US-0019, ADR-0041, ADR-0042, ADR-0045, ADR novo
  (IA no desk research)

## Descrição

**Como** pessoa do comercial,
**quero** reunir na oportunidade em A abordar as pessoas que vou abordar, o papel de cada uma
na decisão, o número real de funcionários, a alavanca e, se eu quiser, um desk research feito
pelo Pulse,
**para** decidir quem abordar e como antes do primeiro contato.

### Contexto

Passo 4 do fluxo do Victor (18/11/2026): com a empresa em A abordar (US-0008) e a relação com
a Origami à vista (US-0019), estudar a conta: levantar pessoas além dos sócios, confirmar o
número de funcionários (pelo LinkedIn, por exemplo), anotar o @ do Instagram, definir a
influência de cada pessoa na decisão e rodar um desk research da empresa e das pessoas.

Boa parte já existe e é reaproveitada: os Contatos da oportunidade, com cargo, LinkedIn,
Instagram e o **papel na decisão** (Decisor, Influenciador, Usuário, Bloqueador, Campeão), e a
rede de sócios da Receita, com "Virar contato" (ADR-0041, ADR-0045). O que falta é juntar isso
num lugar, o número de funcionários do time e o desk research.

### Escopo

- Inclui: aba "Estudo da conta" na oportunidade, ao lado de Registros, Tarefas e Arquivos.
- Inclui: as pessoas da oportunidade organizadas pelo papel na decisão, com o que falta de
  cada uma (LinkedIn, Instagram, cargo); os sócios da Receita ainda não trazidos, com "Virar
  contato".
- Inclui: "Funcionários confirmados" na empresa, informado pelo time; prevalece sobre a RAIS na
  lista, na ficha e no faturamento estimado (como o faturamento do time, US-0006).
- Inclui: a alavanca da oportunidade (canal de chegada, decisão de 18/11/2026) mostrada e
  editável no estudo.
- Inclui: um resumo do que falta no estudo (decisor, alavanca, funcionários, desk research),
  só para orientar; a oportunidade avança sem ele.
- Inclui: desk research **opcional**: um botão pede ao Pulse um resumo da empresa e das pessoas
  da oportunidade, com notícias e páginas públicas e as fontes citadas. O resumo fica guardado
  na aba, editável, com a data e quem pediu.
- Não inclui: ler postagens de LinkedIn ou Instagram com login nas redes (ADR-0041 proíbe
  raspar); mensagem de abordagem sugerida pela IA; Métricas do estudo (US-0021).

## Critérios de aceite

**Cenário 1: abrir o estudo**

- **Dado** uma oportunidade em A abordar;
- **Quando** abro a aba "Estudo da conta";
- **Então** vejo as pessoas da oportunidade agrupadas pelo papel na decisão, os sócios da
  Receita ainda não trazidos, os funcionários (do time ou da RAIS), a alavanca, o desk research
  (se houver) e o que falta.

**Cenário 2: pessoas e papel**

- **Dado** uma pessoa da oportunidade sem papel na decisão;
- **Então** ela aparece em "Sem papel", e posso escolher o papel ali mesmo;
- **E** posso abrir a pessoa para completar cargo, LinkedIn e Instagram, como nos Contatos.

**Cenário 3: sócio vira pessoa a abordar**

- **Dado** um sócio da Receita que ainda não é contato;
- **Quando** clico em "Virar contato" no estudo;
- **Então** ele entra nos Contatos da oportunidade, pronto para receber papel.

**Cenário 4: funcionários confirmados**

- **Dado** que informo 400 funcionários confirmados para a empresa;
- **Então** a lista e a ficha da tela Empresas mostram 400 "informado pelo time" no lugar da
  RAIS;
- **E** o faturamento estimado passa a usar esse número, com o detalhe dizendo que veio do time;
- **Quando** apago o número;
- **Então** volta a valer a RAIS.

**Cenário 5: o que falta**

- **Dado** uma oportunidade sem Decisor, sem alavanca ou sem desk research;
- **Então** a aba mostra o que falta;
- **E** a oportunidade pode avançar de etapa mesmo assim.

**Cenário 6: pedir o desk research**

- **Dado** que tenho `prospeccao:editar`;
- **Quando** clico em "Fazer desk research";
- **Então** vejo que o Pulse está pesquisando;
- **E** recebo um resumo da empresa e das pessoas da oportunidade (notícias, fatos recentes,
  o que cada pessoa publicou ou disse em páginas públicas), com cada informação ligada à fonte;
- **E** o resumo fica na aba, com a data e quem pediu.

**Cenário 7: editar e refazer**

- **Dado** um desk research guardado;
- **Então** posso editar o texto;
- **Quando** peço de novo;
- **Então** o Pulse avisa que o resumo atual (com as minhas edições) será substituído e só
  refaz se eu confirmar.

**Cenário 8: desk research indisponível ou sem resultado**

- **Dado** que o serviço de pesquisa falha ou não acha nada relevante;
- **Então** a aba diz isso, sem apagar o resumo anterior, e posso tentar de novo.

**Cenário 9: sem permissão**

- **Dado** que tenho só `prospeccao:ler`;
- **Então** vejo o estudo e o desk research, sem editar nem pedir um novo.

**Cenário 10: porte no estudo**

- **Dado** uma oportunidade em A abordar;
- **Quando** informo no estudo o faturamento anual aproximado (em milhões) ou os funcionários;
- **Então** o faturamento fica na empresa como "Estimado" (pelo time) e os funcionários como
  confirmados pelo time, e os dois prevalecem sobre a estimativa da base.

## Decisões (Victor Couto, 2026-11-18)

- A influência é o papel na decisão que já existe (Decisor, Influenciador, Usuário,
  Bloqueador, Campeão); sem escala nova.
- O desk research é feito por IA dentro do Pulse e é **opcional**: só roda quando a pessoa
  pede. Pesquisa a empresa e as pessoas em fontes públicas da web, sempre com a fonte citada,
  sem entrar logado em LinkedIn ou Instagram.
- O resumo fica guardado na oportunidade, editável; refazer substitui, com aviso.
- Funcionários confirmados pelo time prevalecem sobre a RAIS e recalculam o faturamento
  estimado.
- O estudo só orienta: não impede a oportunidade de sair de A abordar.
- O estudo fica numa aba da oportunidade.
- Responsável de oportunidade (18/11, "por enquanto"): só funcionários **ativos** com
  `prospeccao:editar` — hoje Admin e Gerente. A regra é a capacidade (ADR-0027), não o nome do
  papel; desligados e cadastros por confirmar ficam de fora.
- Janela de "Mover para abordar", refeita na validação (18/11, depois de uma crítica de
  design): a empresa é o título; só o "Tipo de conta", em três cartões (Satélite, Ponte,
  Âncora) com a faixa, o "Sugerido" e o faturamento estimado ao lado para apoiar; o
  responsável no rodapé. Várias empresas viram uma tabela compacta. Faturamento e
  funcionários **não** entram na janela: são preenchidos depois, no estudo, com a oportunidade
  em A abordar (cenário 10).

## Pontos em aberto

### Decisões pendentes (ADR novo, antes do desenvolvimento do desk research)

- **ADR de IA no Pulse** (revê o "sem IA" do ADR-0042 só para o desk research): modelo,
  ferramenta de busca na web, custo por pesquisa, onde fica a chave, o que é guardado e por
  quanto tempo, o que vai para o provedor de IA (nome e cargo das pessoas, nada além do que o
  Pulse já guarda) e a revisão humana.
- **Base legal (LGPD):** o ADR-0041 apoia a prospecção B2B no interesse legítimo, com
  minimização. O desk research traz informação pública de pessoas físicas para o Pulse; o ADR
  precisa dizer o que pode ficar guardado (ex.: só o que for profissional e ligado à empresa) e
  como apagar a pedido.

### Hipóteses para validar

- O desk research usa como entrada o que o Pulse já sabe da empresa (Receita, site, fomento,
  fit e relação com a Origami), para não repetir o que já está na ficha. Origem: ADR-0042
  ("quando a IA entrar, usa estes mesmos sinais").
- O formato do resumo segue o briefing de desk research que o time já usa (skill
  "desk-research-cliente"): empresa, momento, pessoas, gatilhos para a abordagem. Origem:
  material do time.
- Funcionários confirmados ficam na empresa (valem para todas as oportunidades dela), como o
  faturamento do time.

### Provocações para produto

- O resumo fica na **oportunidade**: se ela for perdida e a empresa voltar a ser abordada um
  ano depois, a nova oportunidade começa sem o estudo — impacto possível: refazer o trabalho;
  alternativa é guardar na empresa e mostrar nas oportunidades dela.
- Cada desk research tem custo de IA e de busca — impacto possível: uso sem limite pesa na
  conta; um limite por mês ou por pessoa pode entrar no ADR.
- A IA pode errar a pessoa (homônimos) — impacto possível: abordagem com informação de outra
  pessoa; o resumo precisa deixar claro o que é da empresa e o que é de cada pessoa, com a
  fonte, para o time conferir.

## Contexto técnico

- **Objetivo observável:** aba "Estudo da conta" na oportunidade; funcionários do time na lista
  e na ficha da tela Empresas; desk research sob pedido, guardado e editável.
- **Termos do domínio:** Oportunidade (`prospects`), Contatos e papel na decisão
  (`prospect_opportunity_contacts`, `PROSPECT_CONTACT_ROLES`), rede de sócios
  (`prospect_company_partners`), alavanca (`prospects.lever`, `PROSPECT_LEVERS`), faturamento
  do time (`prospect_companies.faturamento_anual`) — fonte: glossário.
- **Comportamento atual:** PROVADO —
  - Contatos da oportunidade com papel na decisão (`OpportunityContactsCard`, ADR-0045);
  - sócios com LinkedIn, Instagram e telefone manuais e "Virar contato"
    (`CompanyPartnersList`, ADR-0041);
  - alavanca no cartão Negócio da oportunidade (`ProspectDealCard`);
  - abas Registros, Tarefas e Arquivos em `ProspectDetailDialog`;
  - funcionários só pela RAIS, calculados na carga da VPS; o faturamento do time já prevalece
    na Edge Function `empresas-receita` (`comFaturamentoDoTime`), e o mesmo caminho serve para
    os funcionários.
- **Superfícies conhecidas:** `ProspectDetailDialog` (aba nova), `prospect_companies` (coluna
  de funcionários do time, com migration), Edge Function `empresas-receita` (funcionários do
  time e o faturamento recalculado com eles), Edge Function nova para o desk research (chave do
  provedor de IA só no servidor), MCP da Prospecção (TD-0022: funcionários do time e leitura do
  estudo).
- **Restrições e padrões aplicáveis:** chaves e segredos nunca no navegador nem em log
  (boundaries); nada de raspar redes sociais (ADR-0041); dados de outro tenant nunca entram no
  pedido à IA; acesso por `prospeccao:ler` e `prospeccao:editar`; ADR novo antes do desk
  research.
- **Riscos para investigar:** custo e tempo de resposta da pesquisa (a Edge Function tem limite
  de tempo); recálculo do faturamento com funcionários do time fora da carga da VPS (hoje a
  estimativa é calculada lá); o que vai para o provedor de IA.
- **Provas esperadas:** aba com pessoas por papel e o que falta; "Virar contato" a partir do
  estudo; funcionários do time na lista, na ficha e no faturamento, e a volta para a RAIS;
  desk research com fontes, guardado, editável, refeito com aviso; falha sem perder o anterior;
  leitura sem edição para `prospeccao:ler`.
- **Fora do escopo:** mensagem sugerida pela IA; Métricas (US-0021).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 5, 9 e 10 (parte 1) | validação na tela pelo Victor em 19/11/2026; testes desativados neste ciclo |
| 6 a 8 (desk research) | depois do ADR de IA |

Desenvolvida em duas partes (combinado na aprovação, 18/11/2026): primeiro a aba, as pessoas,
os funcionários e a alavanca; depois o ADR de IA e o desk research.

**Parte 1**
- **Aba "Estudo da conta"** em `ProspectDetailDialog` (`estudo/EstudoDaConta.tsx`): o que falta
  (Decisor, alavanca, funcionários), pessoas por papel com o que falta de cada uma e
  "Completar" (cargo, LinkedIn, Instagram no cadastro da pessoa), sócios da Receita ainda não
  trazidos com "Trazer para a oportunidade" (cria o contato e já inclui, sem papel),
  funcionários confirmados e alavanca. Regras puras em `src/lib/prospecting/estudoDaConta.ts`.
- **Funcionários do time:** migration `20261118200000_funcionarios_do_time`
  (`prospect_companies.funcionarios_informados`, com rollback), aplicada em produção em
  18/11/2026 com o ok do Victor e conferida no banco; a Edge Function
  `empresas-receita` devolve o número e a natureza jurídica (publicada no mesmo dia); a tela troca a RAIS pelo número
  do time e refaz o faturamento estimado pela mesma conta da carga
  (`comFuncionariosDoTime`, `estimarPorFuncionarios`). A ordem e os filtros da base
  continuam pela RAIS, porque são calculados na VPS.
- **Janela de "Mover para abordar"** (`ColocarParaAbordarDialog`): só tipo de conta (cartões ou
  tabela) e responsável. **Porte no estudo:** faturamento (`useFaturamentoDoTime`, base
  "Estimado") e funcionários no bloco "Porte" da aba. Corrigida a tela branca
  ao mover uma empresa só: o link "Ver oportunidade" da mensagem estava fora do roteador
  (Toaster em `App.tsx`); virou um botão que navega.
- **Responsáveis:** RPC `get_prospeccao_responsaveis` (migration
  `20261118210000_responsaveis_da_prospeccao`, com rollback, aplicada em produção em 18/11/2026
  com o ok do Victor; na Origami Lab lista 5 dos 11 ativos; `anon` não executa; SECURITY DEFINER com o tenant
  derivado de `auth.uid()`, projeção fixa id, nome, cargo e foto, como o diretório do
  ADR-0020), usada pela janela (`useResponsaveisDaProspeccao`).
- **MCP:** `funcionarios_informados` em `create_company`/`update_company` e na leitura
  (TD-0022).
