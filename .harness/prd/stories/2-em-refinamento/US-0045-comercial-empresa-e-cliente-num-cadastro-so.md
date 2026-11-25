# US-0045 — Empresa e cliente num cadastro só

- **Status:** Em refinamento
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Portfólio de projetos (pré-requisito da US-0043; toca o Comercial)
- **Prioridade:** antes da US-0043
- **Aprovada por / em:** —
- **Relacionadas:** US-0043, ADR-0037, ADR-0040, ADR-0044, ADR-0045, decisão de 15/09/2026
  (`20260915110000_prospect_companies.sql`)

> **Em espera (25/11/2026):** será reescrita como a história 2.1 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`, com as decisões do refino (cliente = empresa com Ganho, orçamento não cria cliente, marca Parceiro, matriz e filiais, regularização caso a caso).

## Descrição

**Como** pessoa do comercial ou GP,
**quero** que a empresa da Prospecção vire cliente no Ganho sem eu digitar os dados de novo,
**para** que cada empresa tenha um cadastro só, e o projeto sempre saiba qual é a empresa do
cliente.

### Contexto

Hoje o Pulse tem dois cadastros para a mesma organização:

- **Empresa**, na Prospecção: entra pela base da Receita, pela Qualificação ou direto na
  Oportunidade. Há 1.547 empresas na Origami Lab.
- **Cliente**, na carteira: quem comprou. Há 24 clientes.

A separação foi decidida em 15/09/2026, para que uma empresa só abordada não entrasse na
carteira, nos indicadores e no acesso de "ler clientes". Essa razão continua valendo.

O problema é o cadastro em dobro:

- No Ganho, o diálogo pede para escolher o cliente ou cadastrá-lo, redigitando o que a
  empresa já tem.
- A ligação entre os dois é manual e falha. Na Origami Lab, em produção, em 24/11/2026:

| Situação | Quantos |
|---|---|
| Clientes ligados a exatamente uma empresa | 13 de 24 |
| Clientes com empresa de mesmo CNPJ, mas sem a ligação | 2 (Prumo, Tecno2000) |
| Clientes sem empresa | 7 (um deles sem CNPJ) |
| Clientes ligados a duas empresas | 2 (Bry, Syngularid) |
| Clientes sem nenhum projeto, só com orçamento | 3 |

A US-0043 precisa achar a empresa do cliente para abrir a Oportunidade de renovação. Com os
cadastros soltos, isso falha justamente nos clientes antigos.

### Escopo

- Inclui:
  - cliente criado no Ganho a partir da empresa, sem redigitar;
  - dados de identificação (nome, razão social, CNPJ, site) iguais nos dois lados;
  - cliente cadastrado direto, fora da Prospecção, ganhando a empresa;
  - arrumação única dos clientes existentes.
- Não inclui:
  - juntar as duas telas (Empresas e Clientes continuam separadas);
  - mudar quem vê a carteira (`cliente:ler`) ou a Prospecção;
  - contatos e stakeholders, que continuam onde estão (ADR-0037, ADR-0045);
  - conciliação do Conta Azul, que continua casando pelo CNPJ do cliente (ADR-0044).

## Critérios de aceite

**Cenário 1: o Ganho cria o cliente a partir da empresa**

- **Dado** uma Oportunidade cuja empresa ainda não é cliente;
- **Quando** registro o Ganho;
- **Então** o cliente é criado com os dados da empresa e já vem escolhido no diálogo;
- **E** eu não preciso abrir o cadastro de cliente nem digitar nada;
- **E** a empresa fica ligada ao cliente.

**Cenário 2: empresa que já é cliente**

- **Dado** uma Oportunidade cuja empresa já está ligada a um cliente;
- **Quando** registro o Ganho;
- **Então** o diálogo usa esse cliente;
- **E** nenhum cliente novo é criado.

**Cenário 3: um cadastro só para identificar a empresa**

- **Dado** uma empresa ligada a um cliente;
- **Quando** altero o nome, a razão social, o CNPJ ou o site num dos lados;
- **Então** o outro lado mostra o mesmo valor.

**Cenário 4: carteira só com quem comprou**

- **Dado** uma empresa da Prospecção sem Ganho;
- **Então** ela não aparece na lista de Clientes, nos indicadores de clientes, nem para quem só
  tem acesso aos clientes.

**Cenário 5: cliente cadastrado direto**

- **Dado** a tela de Clientes;
- **Quando** cadastro um cliente novo;
- **Então** o Pulse procura a empresa pelo CNPJ e liga o cliente a ela;
- **E** se não houver empresa com esse CNPJ, ela é criada com os dados do cliente;
- **E** um cliente sem CNPJ também ganha empresa, criada pelo nome.

**Cenário 6: arrumação dos clientes existentes**

- **Dado** os clientes em produção;
- **Quando** a mudança é publicada;
- **Então** Prumo e Tecno2000 ficam ligados às empresas de mesmo CNPJ;
- **E** os 7 clientes sem empresa ganham a empresa, criada com os dados deles;
- **E** depois disso todo cliente tem exatamente uma empresa.

**Cenário 7: todo projeto de cliente sabe qual é a empresa**

- **Dado** qualquer projeto com cliente, com ou sem Oportunidade de origem;
- **Então** a empresa do projeto é a empresa ligada ao cliente dele.

## Decisões (Victor Couto, 24/11/2026)

- Unificar o cadastro na empresa, com o cliente nascendo dela no Ganho. Fazer antes da US-0043.
- A carteira continua só com quem comprou (mantém a razão da decisão de 15/09/2026).

## Pontos em aberto

### Decisões pendentes

- **Bry e Syngularid, ligados a duas empresas cada.** Nos dois casos há uma empresa só com o
  nome ("Bry", "Syngular Id") e outra com CNPJ. Proposta: manter a com CNPJ e levar para ela as
  Oportunidades, contatos e atividades da outra. Precisa do OK caso a caso, porque mexe no
  histórico do Pipeline.
- **Quem edita os dados de identificação.** Hoje o cliente é editado por quem tem
  `cliente:editar` e a empresa por quem tem `prospeccao:editar`. Com um cadastro só, os dois
  passam a mudar o mesmo dado. Vale assim, ou um dos lados fica só de leitura?

### Hipóteses para validar

- **Endereço, logo e contato principal ficam no cliente.** São dados da relação comercial e
  não existem na empresa; continuam só na ficha do cliente.
- **Razão social e nome fantasia vêm da Receita quando há CNPJ.** Ao criar a empresa de um
  cliente com CNPJ, o Pulse consulta a Receita como já faz na Prospecção.

### Provocações para produto

- **Empresa que deixa de ser cliente.** Projeto concluído sem renovação mantém o cliente na
  carteira. Hoje ninguém sai da carteira; a relação "Já foi cliente" (US-0019) já cobre isso na
  Prospecção.
- **CNPJ de filial.** O cliente pode estar cadastrado com o CNPJ de uma filial e a empresa com o
  da matriz. A relação da US-0019 junta pela raiz do CNPJ; a ligação aqui deveria seguir a mesma
  regra.

## Contexto técnico

- **Objetivo observável:** todo cliente com exatamente uma empresa; o Ganho cria o cliente
  sozinho; nome, razão social, CNPJ e site iguais nos dois lados.
- **Termos do domínio:** Empresa (Prospecção), Cliente (carteira), Ganho, Oportunidade,
  Pipeline (nunca Lead, CRM ou Funil).
- **Comportamento atual:**
  - PROVADO: a separação e a ligação por `prospect_companies.client_id` vêm de
    `20260915110000_prospect_companies.sql` (decisão de 15/09/2026).
  - PROVADO: o Ganho pede o cliente e oferece cadastrá-lo com os dados da empresa
    (`ClientField` e `ClientFormDialog` em `src/components/prospeccao/CloseBusinessDialog.tsx`);
    a ligação depois do cadastro é feita pela tela (`prospectCompanyService.linkClient`).
  - PROVADO: a Conta Azul casa a nota pelo `clients.cnpj` (`.harness/integrations/conta-azul.md`).
  - PROVADO: os números do Contexto vieram de consulta de leitura em produção em 24/11/2026.
- **Comportamento esperado:** cenários 1 a 7.
- **Superfícies conhecidas:**
  - diálogo de Ganho;
  - cadastro e edição de cliente (`src/services/clientService.ts`);
  - cadastro e edição de empresa (`src/services/prospectCompanyService.ts`);
  - MCP og-pulse-prospeccao (`mark_contact_won`, `create_company`, `update_company`);
  - relação com a Origami da base (`supabase/functions/_shared/relacao.ts`).
- **Restrições e padrões aplicáveis:**
  - Muda uma decisão de arquitetura: registrar em ADR (separação mantida, identificação
    unificada).
  - Schema e arrumação só por migration versionada, com horário depois da última aplicada em
    produção. A arrumação precisa ser idempotente.
  - RLS de `clients` e `prospect_companies` não pode afrouxar: quem só tem acesso à Prospecção
    não passa a ler a carteira, e vice-versa (ADR-0027).
- **Riscos para investigar:**
  - ganho pelo MCP (`mark_contact_won`), que também precisa criar o cliente;
  - GP sem `prospeccao:editar` editando cliente (cenário 3);
  - duplicidade de CNPJ entre empresas (índice único parcial já existe);
  - retrato da Base (US-0014): a empresa criada para um cliente precisa receber o retrato
    como na Qualificação (`prospectCompanyService.setRetratoDaBase`, chamado pelo
    `abrirOportunidadeService`). O `create_company` do MCP hoje não grava o retrato;
  - telas e relatórios que leem o nome do cliente.
- **Provas esperadas:** cenários 1 a 7; a arrumação deixa todo cliente com exatamente uma
  empresa; empresa sem Ganho não aparece para quem só tem `cliente:ler`.
- **Fora do escopo:** juntar as telas, contatos e stakeholders, Conta Azul.

## Implementação

> Preenchido ao implantar. Todo cenário aponta para a prova.

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
