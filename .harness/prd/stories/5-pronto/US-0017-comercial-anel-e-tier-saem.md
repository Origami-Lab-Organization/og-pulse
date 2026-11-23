# US-0017 — Anel e Tier saem da Prospecção

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 23/11/2026 ("aprovo a US-0017, pode começar")
- **Relacionadas:** US-0008, US-0015, US-0018, US-0021, TD-0022

## Descrição

**Como** pessoa do comercial,
**quero** que a empresa deixe de ter Anel e Tier,
**para** segmentar as contas só pela distância de Formiga e pelo tipo de conta, sem dois
jeitos de dizer a mesma coisa.

### Contexto

Anel (proximidade) e Tier (porte e prioridade) são textos livres preenchidos à mão. A
distância de Formiga (US-0015) e o tipo de conta (US-0008) já estão no ar e fazem o mesmo
papel, com regra e lista fechada. Hoje os dois jeitos convivem na tela.

Levantamento de 23/11/2026, em produção:

- **Tier:** 67 empresas ("1": 50, "2": 16, "3": 1), nenhuma com tipo de conta. Só 28 têm
  CNPJ; dá para converter cerca de 23 pelo faturamento (2 pelo do time, 21 pela estimativa da
  base: 15 Âncora, 4 Ponte, 2 Satélite).
- **Anel:** 87 empresas ("1", "2" e "3"). Não converte: a distância de Formiga é calculada.
- Nenhuma função nem view do banco lê as colunas.

Onde ainda aparecem: a ficha completa da empresa (selo "Tier", campos Anel e Tier), o cartão
da empresa na oportunidade (chips e campos de edição) e o MCP da Prospecção (pede, mostra e
grava os dois). A aba "Na Prospecção" e os cortes por anel e tier das Métricas já saíram da
tela; sobrou só o código.

### Escopo

- Inclui: tirar Anel e Tier da ficha completa da empresa, do cartão da empresa na
  oportunidade, do cadastro de oportunidade e dos campos que a tela pede para completar.
- Inclui: tirar Anel e Tier do MCP da Prospecção (cadastro, edição, leitura e instruções).
- Inclui: converter o Tier em tipo de conta **pelo faturamento**, a mesma regra de mover para
  qualificação (o do time, senão o estimado pela base; o piso do porte não sugere), só nas
  empresas sem tipo de conta. O número do Tier não decide nada.
- Inclui: guardar Anel e Tier num schema fora da API antes de apagar, e apagar as duas colunas
  do banco **no mesmo PR** (decisão de 23/11/2026).
- Inclui: tirar o código que sobrou (filtros e ordens da aba antiga, cortes das Métricas,
  selo do Tier).
- Não inclui: Métricas por tipo de conta e por distância (US-0021).

## Critérios de aceite

**Cenário 1: some da tela**

- **Dado** uma empresa que tinha Anel e Tier;
- **Quando** abro a ficha completa dela ou o cartão da empresa numa oportunidade;
- **Então** não vejo Anel nem Tier, nem para ler nem para editar;
- **E** vejo o tipo de conta e a distância de Formiga, como hoje.

**Cenário 2: Tier convertido pelo faturamento**

- **Dado** uma empresa com Tier, sem tipo de conta, com faturamento do time ou estimado pela
  base de R$ 10 mi ou mais;
- **Quando** a conversão roda;
- **Então** ela passa a ter o tipo de conta da faixa do faturamento (Âncora, Ponte ou
  Satélite);
- **E** empresa já com tipo de conta não muda;
- **E** empresa sem CNPJ, sem faturamento ou só com o piso do porte fica sem tipo.

**Cenário 3: some do chat**

- **Quando** peço ao Claude para cadastrar, editar ou mostrar uma empresa;
- **Então** o MCP não pede, não mostra e não grava Anel nem Tier.

**Cenário 4: valores guardados**

- **Dado** que as colunas foram apagadas;
- **Então** o Anel e o Tier de cada empresa continuam guardados no schema
  `legado_prospeccao`, fora da API, sem acesso pela tela nem pelo MCP.

## Decisões (Victor Couto)

- 16/11/2026: Anel e Tier vão sumir; a segmentação passa a ser a distância de Formiga e o
  tipo de conta. O Tier é convertido em tipo de conta onde der.
- 23/11/2026: a conversão é pelo faturamento, não pelo número do Tier (recomendação aceita).
- 23/11/2026: tirar da tela e do MCP e apagar as colunas no mesmo PR.

## Pontos em aberto

### Riscos aceitos

- Quem estiver com o MCP antigo instalado recebe erro ao cadastrar ou editar empresa com
  Anel ou Tier, até atualizar o MCP (o pacote novo sai no deploy da main). Mitigação: avisar o
  time no dia do deploy.

### Provocações para produto

- 44 empresas com Tier ficam sem tipo de conta (sem CNPJ ou sem faturamento) — impacto
  possível: quem usava o Tier para priorizar perde essa marca nelas; o tipo de conta pode ser
  marcado à mão no cartão da empresa.

## Contexto técnico

- **Comportamento atual:** PROVADO —
  - colunas `prospect_companies.ring` e `.tier` (texto, CHECK de até 60 caracteres;
    migration `20260915110000`);
  - tela: `CompanyDetailDialog` (selo `TierBadge`, itens e campos de edição),
    `OpportunityCompanyCard` (chips e campos), `ProspectFormFields`/`ProspectDetailDialog`
    (`company_ring`, `company_tier`), `companyGaps` (campos a completar);
  - código sem uso na tela: facetas e ordens em `companyList`, `anel`/`tier` em
    `companyStatus`, cortes `ring`/`tier` em `metrics`, `parseRank`/`formatRankInput` em
    `companySegmentation`;
  - MCP: `apps/mcp-prospeccao/src/index.ts` (campos `ring` e `tier`, instruções), `format.ts`
    e `types.ts`.
- **Mudanças no banco:** migration nova, com rollback: cria `legado_prospeccao` (sem GRANT,
  fora da API, como `legado_oportunidades` em `20260929120000`), copia `id`, `tenant_id`,
  `ring` e `tier` das empresas que têm um dos dois, e apaga as colunas e o CHECK.
- **Conversão:** script avulso (`scripts/receita/converter-tier.ts`), porque a estimativa mora
  na VPS (ADR-0053) e não pode ir para o Supabase nem para o repositório: lê as empresas com
  Tier pelo CLI do Supabase, cruza o CNPJ com a base pelo túnel, calcula o tipo pela mesma
  regra da tela (`faturamentoDaSugestao` e `sugerirTipoDeConta`) e grava só `tipo_conta` onde
  ele é nulo. Roda antes da migration; o resultado (contagens) fica na história.
- **Restrições e padrões aplicáveis:** tela e MCP mudam juntos (TD-0022); `types.ts` do
  Supabase regenerado; nenhum faturamento nem CNPJ de empresa no repositório.
- **Provas esperadas:** telas sem Anel e Tier; MCP sem os campos; contagem da conversão;
  colunas fora do banco e cópia em `legado_prospeccao`.
- **Fora do escopo:** Métricas por tipo de conta e distância (US-0021).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Anel e Tier fora de `CompanyDetailDialog`, `OpportunityCompanyCard`, `ProspectFormFields`, `ProspectDetailDialog`, `companyGaps` e do tipo `ProspectCompanyDB`; tela validada pelo Victor em 23/11/2026; testes desativados |
| 2 | `scripts/receita/converter-tier.ts`, aplicado em produção em 23/11/2026 com o ok do Victor: 67 com Tier e sem tipo, 21 convertidas (15 Âncora, 4 Ponte, 2 Satélite), 46 sem tipo; conferido no banco |
| 3 | MCP sem os campos `ring` e `tier`, sem Anel e Tier no resumo e na ficha da empresa, instruções atualizadas (versão 1.3.0) |
| 4 | migration `20261123160000` (cópia em `legado_prospeccao.empresas_anel_tier` e as colunas apagadas), com rollback; aplicada depois do deploy da main, com o ok do Victor (23/11/2026) |

- Código sem uso tirado: facetas, busca e ordens da antiga aba de empresas (`companyList`),
  `anel`/`tier` em `companyStatus`, cortes `ring`/`tier` em `metrics`, `parseRank` e
  `formatRankInput` (`companySegmentation`), `TierBadge` e `AnelBadge` (`CompanyBadges`).
- O erro de tipo do `tipo_conta` no `tsc` do MCP já existia na main (o pacote sai pelo esbuild).

Validação: Victor Couto, 23/11/2026 ("testei, tudo passou").
