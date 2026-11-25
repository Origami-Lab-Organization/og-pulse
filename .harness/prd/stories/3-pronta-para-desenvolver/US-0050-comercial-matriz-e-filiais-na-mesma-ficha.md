# US-0050 — Matriz e filiais na mesma ficha

- **Status:** Pronta para desenvolver
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresa e cliente (épico 2 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 2.1 do roadmap, depois da US-0045
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("vamos passar as ressalvas para estarem prontas")
- **Depende de:** US-0045
- **Relacionadas:** US-0019, US-0045, ADR-0044

## Descrição

**Como** pessoa do comercial,
**quero** guardar os CNPJs das filiais na ficha da empresa,
**para** que matriz e filiais contem como a mesma empresa em todo o Pulse.

### Contexto

Decisão do Victor (24 e 25/11/2026): matriz e filial são a mesma empresa, informadas no cadastro.
A empresa é a matriz e a ficha guarda os CNPJs das filiais. A base da Receita já trabalha com a
matriz, e a relação da US-0019 já junta pela raiz do CNPJ.

### Escopo

- Inclui: adicionar e remover CNPJ de filial; encontrar a empresa pelo CNPJ da filial; a nota do
  Conta Azul de uma filial cair na empresa.
- Não inclui: escolher o CNPJ de faturamento no Ganho (épico 4, história 4.2).

## Critérios de aceite

**Cenário 1: adicionar uma filial**

- **Dado** a ficha de uma empresa;
- **Quando** adiciono o CNPJ de uma filial;
- **Então** ele aparece na ficha, abaixo do CNPJ da matriz.

**Cenário 2: encontrar pela filial**

- **Dado** uma empresa com uma filial cadastrada;
- **Quando** busco pelo CNPJ da filial em Empresas, no Ganho ou pelo MCP;
- **Então** encontro a empresa;
- **E** cadastrar uma empresa nova com esse CNPJ é recusado como duplicidade.

**Cenário 3: só filial de verdade**

- **Dado** a ficha de uma empresa;
- **Quando** tento adicionar um CNPJ com raiz (8 primeiros dígitos) diferente da matriz;
- **Então** o Pulse recusa: empresa de outra raiz é outra empresa;
- **E** ficha sem CNPJ de matriz não aceita filial: primeiro informe o CNPJ da matriz.

**Cenário 4: filial que já é empresa no Pulse**

- **Dado** que o CNPJ da filial já é uma empresa cadastrada;
- **Quando** adiciono a filial;
- **Então** o Pulse mostra a empresa encontrada e pede confirmação para juntar;
- **E** com a confirmação, a empresa da filial é juntada à da matriz, com Oportunidades, contatos,
  atividades, orçamentos e projetos.

**Cenário 5: nota da filial**

- **Dado** uma nota do Conta Azul emitida para o CNPJ de uma filial;
- **Então** ela é conciliada com a empresa, como se fosse da matriz.

## Decisões (Victor Couto, 25/11/2026)

- A empresa é a matriz; a ficha guarda os CNPJs das filiais.
- Só entra filial com a mesma raiz de CNPJ; sem CNPJ de matriz, não entra filial.
- Filial que já é empresa no Pulse é juntada à matriz, com confirmação.

## Contexto técnico

- **Comportamento atual:** PROVADO: a empresa tem um CNPJ só (`prospect_companies.cnpj`); a Conta
  Azul casa pela `clients.cnpj` (`.harness/integrations/conta-azul.md`). INFERIDO: a duplicidade
  (`check_company_duplicates`) olha só o CNPJ da empresa.
- **Restrições:** migration versionada; RLS da empresa.
- **Riscos para investigar:** índice único de CNPJ por tenant; consulta à Receita por filial;
  juntar empresas preserva tudo o que aponta para a da filial.
- **Provas esperadas:** cenários 1 a 5.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
