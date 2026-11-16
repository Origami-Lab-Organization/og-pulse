# US-0002 — Ver as empresas da base da Receita na tela Empresas

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 1
- **Aprovada por / em:** Victor Couto, 2026-11-16
- **Relacionadas:** US-0001, US-0003, US-0006, US-0011, ADR-0040, ADR-0042

## Descrição

**Como** pessoa do comercial,
**quero** ver na tela Empresas as médias e grandes empresas ativas do país,
**para** escolher quem abordar sem depender de uma lista montada à mão.

### Contexto

Hoje a tela Comercial > Empresas mostra só as contas que já estão na Prospecção e
responde "posso abordar esta empresa?". O time não tem de onde tirar empresas novas.
A nova tela troca essa lista pela base da Receita, e a empresa só entra na Prospecção
quando alguém abre oportunidade para ela (US-0008).

### Escopo

- Inclui: lista paginada com Empresa (nome, CNPJ, cidade e UF), Faturamento
  estimado, Funcionários, Atividade (com o ramo da indústria), Idade, Dívida ativa,
  Fit prévio e as ações de classificar; ordenar por empresa, faturamento,
  funcionários, idade e fit; linha do total com o recorte da base; estados de
  carregando, vazio e erro.
- Inclui: as funções da tela atual continuam na nova tela (decisão de 2026-11-16):
  a aba "Na Prospecção" lista as contas da Prospecção com os filtros de abordagem
  (Abordar e Não abordar), anel, tier e responsável; o botão "Importar CNPJs" fica no topo; o link das notificações de
  gatilho abre a ficha da conta.
- Não inclui: filtros da base (US-0003), busca (US-0005), ficha da base (US-0007),
  classificar (US-0008 a US-0011).

## Critérios de aceite

**Cenário 1: abrir a tela**

- **Dado** que tenho `prospeccao:ler`;
- **Quando** abro Comercial > Empresas;
- **Então** vejo a lista de empresas da base, ordenada pelo maior fit prévio;
- **E** a linha do total mostra quantas empresas existem e a frase "só matrizes
  ativas, médias e grandes".

**Cenário 2: o que a linha mostra**

- **Dado** uma empresa na lista;
- **Então** vejo nome fantasia (ou razão social), CNPJ formatado, cidade e UF,
  faturamento estimado, funcionários, atividade principal com o ramo, idade em anos,
  situação na dívida ativa e fit prévio.

**Cenário 3: textos longos**

- **Dado** um nome ou atividade que não cabe em duas linhas;
- **Então** o texto é cortado com reticências;
- **E** passar o mouse mostra o texto inteiro.

**Cenário 4: ações sempre à vista**

- **Dado** que a tabela não cabe na largura da tela;
- **Quando** rolo a tabela para o lado;
- **Então** a coluna de classificar continua fixa na borda direita.

**Cenário 5: link da notificação de gatilho**

- **Dado** uma notificação de gatilho do `company-watch` com "Ver empresa";
- **Quando** clico no link;
- **Então** a tela Empresas abre com a ficha daquela conta da Prospecção.

**Cenário 6: contas da Prospecção**

- **Quando** abro a aba "Na Prospecção";
- **Então** vejo todas as contas da Prospecção, inclusive ganhas, perdidas e sem
  oportunidade, e as que estão fora da base (ME, EPP, filial ou cadastrada à mão);
- **E** posso filtrar por abordagem (Abordar, Não abordar), anel, tier e responsável,
  com a mesma regra de "posso abordar?" da tela atual.

**Cenário 7: ordenar**

- **Quando** clico no cabeçalho de Empresa, Faturamento estimado, Funcionários,
  Idade ou Fit prévio;
- **Então** a lista ordena por aquela coluna, e um segundo clique inverte a ordem.

## Decisões (Victor Couto, 2026-11-15 e 2026-11-16)

- A nova tela substitui a aba Empresas.
- O recorte da base aparece como frase na linha do total, não como filtro.
- Faturamento estimado é coluna da tabela, logo depois da empresa.
- As funções da tela atual vão para a aba "Na Prospecção" da nova tela; "Abordar" e
  "Não abordar" viram filtro dentro dela; "Importar CNPJs" e o link do gatilho
  continuam (2026-11-16).
- Anel e Tier vão sair (2026-11-16). Ficam na aba "Na Prospecção" até a US-0017, que os
  troca pela distância de Formiga (US-0015) e pelo tipo de conta (US-0016).

## Pontos em aberto

### Hipóteses para validar

- Ordenar pelo fit prévio por padrão. Origem: protótipo.

## Contexto técnico

- **Objetivo observável:** `/comercial/empresas` lista a base da Receita.
- **Termos do domínio:** Oportunidade, Pipeline, A abordar, fit (glossário).
- **Comportamento atual:** PROVADO — `src/pages/ProspeccaoEmpresas.tsx` monta a lista
  com `useProspectCompanies`, `useProspects` e `buildCompanyRows`; facetas em
  `COMPANY_FACETS` (`src/lib/prospecting/companyList.ts`); o link de gatilho é
  tratado pelo parâmetro `empresa` na mesma página.
- **Superfícies conhecidas:** rota `/comercial/empresas` em `src/App.tsx`; item
  "Empresas" em `src/components/layout/sidebar-nav.ts` e `nav-config.ts`;
  notificação `prospeccao_gatilho` da Edge Function `company-watch`.
- **Restrições e padrões aplicáveis:** capacidade `prospeccao:ler` já cobre a tela —
  fonte: `../../../capability-matrix.md`; moeda truncada, nunca arredondada — fonte:
  ADR-0011; Design System Origami e nomenclatura Oportunidade/Pipeline — fonte:
  `../../../patterns/design-system.md`.
- **Riscos para investigar:** quebrar o link das notificações de gatilho já enviadas.
- **Provas esperadas:** render com estados carregando, vazio e erro; ordenação;
  coluna de ações fixa.
- **Fora do escopo:** mudar a tela de Oportunidades.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | **Pendente:** evidência da tela com a base carregada. Código: aba "A classificar", ordem padrão pelo fit, linha do total com o recorte e a data da base. |
| 2 | **Pendente:** evidência da tela. O faturamento estimado entra com a US-0006: a coluna só aparece quando a carga traz o valor. |
| 3 | **Pendente:** evidência da tela. Código: nome e atividade cortam em duas linhas, com o texto inteiro no `title`. |
| 4 | **Adiado para a US-0008:** a coluna de classificar nasce com as ações. Sem ação, não há coluna para fixar. |
| 5 | **Pendente:** evidência do link de uma notificação de gatilho. Código: `?empresa=` abre "Na Prospecção" com a ficha e troca o parâmetro por `?aba=prospeccao`. |
| 6 | **Pendente:** evidência da tela. Código: a lista atual inteira foi para "Na Prospecção" (`ContasDaProspeccao`), e as abas antigas viraram o filtro "Abordagem". |
| 7 | Evidência, 16/11/2026: as quatro ordens validadas no banco com a base real (US-0001, cenário 2). Clicar no mesmo cabeçalho inverte (`alternarOrdenacao`). |

- **Verificações:** `tsc` sem erro novo (o único erro, em `JornadaConfiguracoes.tsx`, já
  existia); `eslint` limpo nos arquivos tocados; `npm run build` verde.
- **Testes automatizados:** não escritos. O Harness desta máquina está com testes
  desativados, salvo pedido explícito.
- **Commits / PR:** branch `feat/empresas-base-receita`.
- **Implantada em:** —
