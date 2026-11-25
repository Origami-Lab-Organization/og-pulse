# US-0045 — A empresa é o cadastro do cliente

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 2.1 do roadmap; antes da US-0043
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("vamos passar as ressalvas para estarem prontas")
- **Relacionadas:** US-0019, US-0043, US-0049, US-0050, US-0051, US-0052, ADR-0037, ADR-0040,
  ADR-0044, ADR-0045, decisão de 15/09/2026 (`20260915110000_prospect_companies.sql`)

> **Reescrita em 25/11/2026** com as decisões do refino (Victor Couto, 24 e 25/11/2026). A versão
> anterior mantinha dois cadastros sincronizados; esta junta tudo na empresa. A tela única, as
> filiais, as marcas e a regularização foram para as US-0049 a US-0052.

## Descrição

**Como** pessoa do comercial ou GP,
**quero** que o cliente seja a própria empresa, sem um segundo cadastro,
**para** não redigitar dados no Ganho e para todo projeto saber qual é a empresa do cliente.

### Contexto

Hoje o Pulse tem dois cadastros para a mesma organização: a **empresa**, na Prospecção, e o
**cliente**, na carteira. A ligação entre eles é manual e falha. Na Origami Lab, em produção, em
25/11/2026:

| Situação | Clientes |
|---|---|
| Ligados a uma empresa | 13 de 24 |
| Ligados a duas empresas | 2 (Bry, Syngularid) |
| Sem ligação, com empresa de mesmo CNPJ | 2 (Prumo, Tecno2000) |
| Sem empresa | 7 (99, Facilita Minas, P.IN, Integrar, Injetoras NS, Gfsis, Rodosafra) |
| Sem Ganho e sem projeto | 4 (Gfsis, Rodosafra, Cosmex, Transportadora Cabral) |

No Ganho, o diálogo pede para escolher o cliente ou cadastrá-lo, redigitando o que a empresa já
tem. A US-0043 precisa achar a empresa do cliente para abrir a Oportunidade de renovação, e falha
justamente nos clientes antigos.

A decisão de 15/09/2026 separou os cadastros para que uma empresa só abordada não entrasse na
carteira. Essa razão continua valendo, mas a carteira passa a ser uma **relação** da empresa, não
um cadastro à parte: **cliente é a empresa com Ganho ou com projeto**. A tela Empresas já calcula
essa relação ("Cliente ativo", "Já foi cliente", US-0019), mas hoje ela também sai da simples
presença no cadastro de clientes (`dados.cliente`, `relacao.ts` linha 72): esse braço cai com esta
história, e a relação passa a sair só de projeto ou Ganho.

### Escopo

- Inclui:
  - o Ganho sem pedir nem criar cliente: a empresa da Oportunidade é o cliente;
  - cliente = empresa com Ganho ou com projeto; orçamento não cria cliente;
  - todo projeto de cliente ligado à empresa;
  - a relação Cliente ativo / Já foi cliente sem o braço do cadastro de clientes
    (`dados.cliente`);
  - o Ganho pelo MCP com a mesma regra;
  - o endereço da empresa vindo da Receita (estabelecimento da matriz);
  - o logo só para empresa cliente;
  - o contato principal dos clientes atuais levado para os contatos da empresa.
- Não inclui:
  - a tela única Empresas (US-0049);
  - matriz e filiais (US-0050);
  - as marcas Parceiro e "Cliente antes do Pulse" (US-0051);
  - a regularização dos clientes atuais, caso a caso (US-0052);
  - o CNPJ de faturamento no Ganho (épico 4, história 4.2).

## Critérios de aceite

**Cenário 1: Ganho numa empresa que ainda não é cliente**

- **Dado** uma Oportunidade cuja empresa nunca teve Ganho nem projeto;
- **Quando** registro o Ganho;
- **Então** o diálogo não pede cliente nem abre cadastro;
- **E** a empresa passa a ser cliente, com o projeto ligado a ela.

**Cenário 2: Ganho numa empresa que já é cliente**

- **Dado** uma Oportunidade de uma empresa que já é ou já foi cliente;
- **Quando** registro o Ganho;
- **Então** o projeto fica ligado à mesma empresa;
- **E** nenhum cadastro novo é criado.

**Cenário 3: orçamento não cria cliente**

- **Dado** uma empresa com orçamento, sem Ganho e sem projeto;
- **Então** ela não aparece como cliente na relação, nos indicadores de clientes, nem para quem
  só tem acesso à carteira.

**Cenário 4: projeto antigo sem Oportunidade**

- **Dado** um projeto de cliente criado sem Oportunidade de origem (ex.: Lei do Bem Prumo);
- **Então** a empresa do projeto é a do cliente dele;
- **E** a empresa conta como cliente.

**Cenário 5: Ganho pelo chat**

- **Dado** uma Oportunidade em etapa que permite Ganho;
- **Quando** o Ganho é registrado pelo MCP de Prospecção (`mark_contact_won`);
- **Então** vale o mesmo que nos cenários 1 e 2.

**Cenário 6: endereço da matriz**

- **Dado** uma empresa com CNPJ;
- **Quando** abro a ficha;
- **Então** vejo o endereço do estabelecimento da matriz, vindo da Receita;
- **E** ninguém digita o endereço.

**Cenário 7: logo só de cliente**

- **Dado** uma empresa cliente;
- **Então** posso colocar o logo dela na ficha;
- **E** uma empresa que não é cliente não tem o campo de logo.

**Cenário 8: contato principal dos clientes atuais**

- **Dado** um cliente atual com contato principal (nome, e-mail, telefone) no cadastro de cliente;
- **Quando** a mudança é publicada;
- **Então** esse contato aparece entre os contatos da empresa;
- **E** a ficha não tem mais um campo de contato principal.

## Decisões (Victor Couto, 24 e 25/11/2026)

- Um cadastro só, a empresa. Cliente é a empresa que teve Ganho ou tem projeto. Orçamento não
  cria cliente.
- Uma tela só, Empresas (US-0049).
- Os dados de identificação (nome, razão social, CNPJ, filiais, site) são editados só por quem
  tem `prospeccao:editar` e pelo admin.
- Os registros atuais são regularizados caso a caso (US-0052), porque podem ter sido clientes
  antes de a operação começar no Pulse, em 2026.
- O endereço vem da base da Receita, do estabelecimento da matriz; ninguém digita.
- O logo entra quando a empresa vira cliente; antes disso não se justifica.
- O contato principal do cliente vira contato da empresa (ADR-0045).
- Pedidos de reembolso e stakeholders de projeto passam a apontar para a empresa, sem mudar de
  comportamento.

## Contexto técnico

- **Objetivo observável:** o Ganho não pede cliente; todo projeto de cliente aponta para uma
  empresa; a relação "cliente" sai de Ganho ou projeto.
- **Termos do domínio:** Empresa, Cliente (relação), Ganho, Oportunidade, Pipeline (nunca Lead,
  CRM ou Funil).
- **Comportamento atual:**
  - PROVADO: a separação e a ligação por `prospect_companies.client_id` vêm de
    `20260915110000_prospect_companies.sql`.
  - PROVADO: o Ganho pede o cliente (`ClientField` e `ClientFormDialog` em
    `src/components/prospeccao/CloseBusinessDialog.tsx`); a ligação é feita por
    `prospectCompanyService.linkClient`.
  - PROVADO: apontam para `clients`: `budgets`, `client_contacts`, `project_stakeholders`,
    `projects`, `prospect_companies` e `reimbursement_requests` (consulta de 25/11/2026).
  - PROVADO: a relação Cliente ativo / Já foi cliente é calculada em
    `supabase/functions/_shared/relacao.ts` (`relacaoDaEmpresa`, US-0019).
  - PROVADO: hoje "Já foi cliente" também sai de `dados.cliente` (`relacao.ts`, linha 72), que a
    Edge Function `empresas-receita` liga pela simples existência de linha em `clients` com o CNPJ
    (`index.ts`, `cliente`) ou pelo `prospect_companies.client_id` (`index.ts`, `empresa`), sem
    Ganho e sem projeto. Sem tirar esse braço, o cenário 3 falha para Gfsis, Rodosafra e Cosmex.
  - PROVADO: a Conta Azul casa a nota pelo `clients.cnpj` (`.harness/integrations/conta-azul.md`).
- **Comportamento esperado:** cenários 1 a 8.
- **Endereço:** INFERIDO: a Base na VPS tem `estabelecimentos` com o endereço, mas a visão lida
  pelo Pulse expõe só município e UF (`.harness/integrations/base-receita-vps.md`); PROVADO: a
  consulta à BrasilAPI já monta o endereço (`supabase/functions/_shared/receita.ts`, `endereco`).
  Empresa sem CNPJ fica sem endereço.
- **Restrições e padrões aplicáveis:**
  - Muda a decisão de 15/09/2026: registrar ADR (cliente passa a ser relação da empresa).
  - Schema só por migration versionada; compatível com o front em produção até o merge.
  - RLS não pode afrouxar: quem só tem `cliente:ler` não passa a ler a Prospecção (ADR-0027).
- **Superfícies tocadas na relação:** `supabase/functions/_shared/relacao.ts`
  (`relacaoDaEmpresa` perde o `|| dados.cliente`) e a Edge Function `empresas-receita`
  (deixa de ligar `cliente` por linha em `clients`).
- **Riscos para investigar:** telas, relatórios e o Conta Azul que leem `clients`; o MCP de
  Prospecção (`mark_contact_won`, `search_clients`); dados que só existem no cliente (endereço,
  logo, contato principal, status).
- **Provas esperadas:** cenários 1 a 8; nenhum projeto de cliente sem empresa.
- **Fora do escopo:** US-0049 a US-0052; CNPJ de faturamento.

## Implementação

> Preenchido ao implantar. Todo cenário aponta para a prova.

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
