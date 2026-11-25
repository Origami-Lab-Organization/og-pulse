# US-0049 — Uma tela só para empresas e clientes

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 2.1 do roadmap, depois da US-0045
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("vamos passar as ressalvas para estarem prontas")
- **Depende de:** US-0045
- **Relacionadas:** US-0019, US-0045, US-0051, ADR-0027

## Descrição

**Como** pessoa do comercial, GP ou admin,
**quero** ver empresas e clientes numa tela só, a Empresas,
**para** consultar a relação e o histórico de cada empresa num lugar, sem dois cadastros.

### Contexto

Hoje há duas telas: **Empresas** (Comercial, com `prospeccao:ler`) e **Clientes** (carteira, com
`cliente:ler`). Com a empresa como cadastro único (US-0045), a tela Clientes deixa de ter um
cadastro próprio. Decisão do Victor (25/11/2026): uma tela só, Empresas. Quem só tem acesso à
carteira, como o GP sem Prospecção, continua vendo só os clientes.

### Escopo

- Inclui: o item Clientes sai do menu; Empresas atende os dois acessos; o que cada acesso vê e
  edita; a ficha com projetos e histórico.
- Não inclui: matriz e filiais (US-0050); marcas (US-0051); contatos e stakeholders, que
  continuam como estão (ADR-0037, ADR-0045).

## Critérios de aceite

**Cenário 1: uma tela só**

- **Dado** qualquer pessoa com `prospeccao:ler` ou `cliente:ler`;
- **Então** o menu mostra Empresas e não mostra Clientes;
- **E** os endereços antigos de Clientes levam para Empresas, mostrando os clientes.

**Cenário 2: quem só tem acesso à carteira**

- **Dado** uma pessoa com `cliente:ler` e sem `prospeccao:ler`;
- **Quando** abro Empresas;
- **Então** vejo só as empresas com relação Cliente ativo ou Já foi cliente, ou com a marca
  Parceiro (US-0051);
- **E** não vejo a base da Receita, empresas em prospecção nem as ações comerciais.

**Cenário 3: ver só os clientes**

- **Dado** uma pessoa com `prospeccao:ler`;
- **Quando** escolho a relação Cliente ativo e Já foi cliente no filtro;
- **Então** a lista mostra a carteira, como a antiga tela Clientes.

**Cenário 4: ficha com o histórico**

- **Dado** uma empresa cliente;
- **Quando** abro a ficha;
- **Então** vejo os projetos ativos e encerrados, com linha e serviço;
- **E** quem tem `prospeccao:ler` vê também as Oportunidades e os orçamentos.

**Cenário 5: quem edita a identificação**

- **Dado** uma empresa;
- **Então** nome, razão social, CNPJ, filiais e site só são editados por quem tem
  `prospeccao:editar` ou pelo admin;
- **E** quem só tem acesso à carteira vê esses dados sem editar.

**Cenário 6: "editar cliente" deixa de existir**

- **Dado** a tela de perfis de acesso;
- **Então** a capacidade `cliente:editar` não aparece mais;
- **E** contatos da empresa seguem `prospeccao:editar`, e stakeholders seguem as regras do
  projeto.

**Cenário 7: lugar no menu**

- **Dado** uma pessoa só com `cliente:ler`;
- **Então** Empresas aparece em Comercial, no mesmo lugar de todos, e é o único item do grupo
  para ela.

## Decisões (Victor Couto, 25/11/2026)

- Uma tela só, Empresas.
- Quem só tem `cliente:ler` vê só os clientes (e os Parceiros).
- A identificação é editada só pelo comercial (`prospeccao:editar`) e pelo admin.
- `cliente:editar` deixa de existir.
- Empresas fica no mesmo lugar do menu para todos.

## Contexto técnico

- **Objetivo observável:** uma tela só; cada acesso vê o seu recorte.
- **Comportamento atual:**
  - PROVADO: `cliente:ler` / `cliente:editar` governam a rota de Clientes
    (`.harness/capability-matrix.md`, linha 117); `prospeccao:ler` governa `/comercial/empresas`
    (linha 118).
  - PROVADO: a relação e o filtro "Relação com a Origami" existem na tela Empresas (US-0019).
- **Restrições:** nova regra de leitura por capacidade na RLS da empresa, sem afrouxar
  (ADR-0027); linha nova na capability-matrix.
- **Riscos para investigar:** atalhos, ajuda e guia que apontam para `/clients`; a busca de
  clientes do MCP (`search_clients`).
- **Riscos de `cliente:editar` sair:** perfis e exceções que a usam, policies que a citam e a
  capability-matrix; a remoção vai por migration.
- **Provas esperadas:** cenários 1 a 7, com uma pessoa só com `cliente:ler`.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
