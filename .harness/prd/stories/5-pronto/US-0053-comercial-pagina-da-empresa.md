# US-0053 — Página da empresa

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** depois da US-0050
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("ficou bom, pode escrever a história e começar")
- **Depende de:** US-0045, US-0049, US-0050
- **Relacionadas:** US-0007, US-0008, US-0014, US-0019, US-0023, US-0049, US-0051, ADR-0055, ADR-0056
- **Protótipo:** `prototipos/pagina-da-empresa.html` (publicado em
  https://claude.ai/artifact/9eicBgGaSa7bN6H6dw69P2)

## Descrição

**Como** pessoa do comercial, GP ou admin,
**quero** abrir uma empresa numa página própria, com tudo à vista e organizado pela fase em que ela está,
**para** consultar a empresa sem me perder em gavetas e modais, e voltar à lista na hora.

### Contexto

Hoje a mesma empresa tem quatro fichas diferentes, cada uma com um pedaço: a gaveta da Base de
empresas, a ficha da Oportunidade aberta pela aba Em qualificação, o modal da empresa no Pipeline e
a página do cliente. Pedido do Victor (25/11/2026): uma página só, com as informações todas à vista
e agradáveis, sem precisar clicar para ver, e com volta fácil para a lista.

### Escopo

- Inclui:
  - página da empresa, com cabeçalho fixo, faixa de resumo e cartões que se encaixam em até três
    colunas;
  - a mesma página para empresa só da Base e empresa do Pulse;
  - a página muda pela fase: só na Base, em qualificação, Oportunidade em andamento, cliente;
  - ação principal por fase e um menu "⋮" com as demais ações;
  - abrir a página pelas abas Base de empresas, Em qualificação e Clientes, pelo Pipeline e pelos
    projetos;
  - voltar para a lista na hora, no mesmo ponto.
- Não inclui:
  - a ficha da Oportunidade, que continua sendo onde se trabalha a conversa (atividades, BANT,
    etapas); a página mostra o resumo e leva até ela;
  - receita contratada e recebida do cliente;
  - mudar listas e filtros das abas.

## Critérios de aceite

**Cenário 1: abrir a página**

- **Dado** a tela Empresas, em qualquer aba, ou o Pipeline;
- **Quando** abro uma empresa;
- **Então** a empresa abre numa página própria, e não numa gaveta ou modal;
- **E** o endereço da página identifica a empresa, para ser compartilhado.

**Cenário 2: voltar para a lista**

- **Dado** a página de uma empresa aberta a partir de uma lista;
- **Quando** clico em "← Empresas" ou volto pelo navegador;
- **Então** a lista aparece na hora, com a mesma aba, busca e filtros.

**Cenário 3: cabeçalho, visão geral e abas**

- **Dado** a página de uma empresa;
- **Então** o cabeçalho, os cartões de visão geral e as abas ficam parados, e só o conteúdo da
  aba rola;
- **E** o cabeçalho mostra nome, relação e tipo de conta; abaixo, razão social, CNPJ com copiar,
  natureza e abertura, atividade e o dono da qualificação;
- **E** os cartões mostram funcionários, faturamento, capital e regime, localização (cidade e
  distância em km) e se já falamos com a empresa;
- **E** as abas seguem a ordem Qualificação (fit por serviço), Pessoas, Canais, Riscos (situação
  na Receita, dívida ativa e valor da dívida), Histórico com a Origami e Estudo da conta, uma
  seção por vez.

**Cenário 3a: informar o que se sabe**

- **Dado** uma empresa no Pulse e alguém com `prospeccao:editar`;
- **Quando** clica em site, LinkedIn, Instagram, funcionários ou faturamento;
- **Então** edita ali mesmo e grava com Enter ou ao sair do campo;
- **E** a síntese do Estudo da conta grava ao sair do campo;
- **E** as filiais ficam em Canais.

**Cenário 3b: estudo da conta**

- **Dado** uma empresa no Pulse e alguém com `prospeccao:editar`;
- **Quando** inclui um link, uma nota ou um arquivo no Estudo da conta;
- **Então** o item aparece na lista, do mais novo para o mais antigo, com quem incluiu e quando;
- **E** o arquivo vai para a pasta da empresa no OneDrive do Comercial, criada no primeiro envio;
- **E** tirar um arquivo do estudo também o apaga do OneDrive, com confirmação antes.

**Cenário 3c: pasta do Comercial**

- **Dado** um admin em Configurações › Integrações;
- **Quando** escolhe a pasta do Comercial no OneDrive;
- **Então** os arquivos do Estudo da conta passam a ir para pastas de empresa dentro dela;
- **E** enquanto ela não é escolhida, o botão Arquivo fica desabilitado.

**Cenário 4: empresa só da Base**

- **Dado** uma empresa que ainda não está no Pulse;
- **Então** a página mostra o que a Base sabe, com a ação "Mover para qualificação";
- **E** ao mover, o retrato da Base é gravado na empresa, como hoje (US-0014).

**Cenário 5: em qualificação**

- **Dado** uma empresa em qualificação;
- **Então** um widget fixo no canto mostra os próximos passos (site, LinkedIn, decisor,
  faturamento, tipo de conta e síntese) e o andamento;
- **E** "Preencher" leva ao campo ou à seção do passo;
- **E** o tipo de conta é escolhido dentro do widget e pode ser trocado depois pelo selo do
  cabeçalho;
- **E** a ação principal é "Criar Oportunidade", que a coloca em A abordar; com todos os passos
  feitos, o widget também a oferece.

**Cenário 6: Oportunidade em andamento**

- **Dado** uma empresa com Oportunidade em andamento;
- **Então** a página mostra a etapa, o responsável e a próxima tarefa;
- **E** a ação principal é "Abrir Oportunidade".

**Cenário 7: cliente**

- **Dado** uma empresa cliente;
- **Então** a página mostra os projetos, com linha, serviço e status, e as Oportunidades;
- **E** a ação principal é "Nova Oportunidade".

**Cenário 8: o menu "⋮"**

- **Dado** a página de uma empresa;
- **Então** as ações que não são a principal ficam no menu "⋮": editar dados, adicionar contato,
  "Não agora" e descartar;
- **E** a empresa só da Base mostra só "Não agora" e descartar.

**Cenário 9: quem só tem a carteira**

- **Dado** uma pessoa só com `cliente:ler`;
- **Então** a página mostra projetos, contatos e cadastro, sem fit, faturamento, Receita,
  Oportunidades nem ações.

## Decisões (Victor Couto, 25/11/2026)

- Uma página só substitui a gaveta da Base, a ficha aberta pela Qualificação, o modal da empresa no
  Pipeline e a página do cliente.
- Informações todas à vista numa página, sem abas.
- Na qualificação, a ação é "Criar Oportunidade"; com a Oportunidade já criada, "Abrir Oportunidade".
- Sem botão Editar à parte: as ações secundárias ficam no menu "⋮".
- A empresa é qualificada pela decisão de quem estudou: "Criar Oportunidade" não exige os passos.
- O BANT fica na Oportunidade; a nota 75 continua valendo para "Oportunidade qualificada".
- Cabeçalho e visão geral fixos; próximos passos em widget, como o checklist do planejamento; tipo
  de conta definido no widget. O índice lateral do protótipo virou abas, uma seção por vez
  (26/11/2026).
- Riscos só com a Receita; "Pediu para parar" e as Perdas ficam no Histórico (26/11/2026).
- Arquivos do Estudo da conta: uma pasta por empresa no OneDrive do Comercial; o admin escolhe a
  pasta do Comercial uma vez; tirar o arquivo do estudo o apaga também do OneDrive (26/11/2026).
- A busca de notícias e referências fica para depois.
- O dono da qualificação aparece na linha de identificação, com ícone e nome (26/11/2026).

## Contexto técnico

- **Comportamento atual:**
  - PROVADO: a gaveta da Base é `FichaDaEmpresaReceita` (Edge Function `empresas-receita`, modo
    ficha); "Mover para qualificação" grava o retrato com `prospectCompanyService.setRetratoDaBase`
    (US-0014, ADR-0055).
  - PROVADO: a aba Em qualificação abre `ProspectDetailDialog`; o Pipeline abre
    `FichaDaEmpresaNoPipeline` (`CompanyDetailDialog`); a carteira abre `/clients/:id`.
  - PROVADO: a busca e os filtros da Base e da Qualificação ficam no navegador
    (`buscaDoNavegador`, `filtrosDoNavegador`, `qualificacaoDoNavegador`).
- **Restrições:** Design System Origami; sem texto explicativo na tela; RLS e capacidades atuais
  (a Base exige `prospeccao:ler`); complexidade até 7 por função.
- **Riscos para investigar:** empresa do Pulse sem CNPJ (só pelo id); a ficha da Base só existe
  para matriz ativa; desempenho de várias consultas na mesma página.
- **Provas esperadas:** cenários 1 a 9, no localhost, pelo Victor.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
