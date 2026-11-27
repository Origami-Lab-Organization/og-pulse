# US-0047 — Fit por serviço segue o catálogo

- **Status:** Pronto
- **Pronto em:** 27/11/2026, aprovado pelo Victor (PR #114 e #115 mesclado e testado por ele no localhost). O front chega à produção com o deploy destravado pelo #127.
- **Tipo:** história
- **Prontidão:** PRONTA COM RESSALVAS
- **Épico:** Catálogo e formas de receita (épico 1 do roadmap em `prd/refino-fluxo-comercial-a-projeto.md`)
- **Prioridade:** 2 do roadmap
- **Aprovada por / em:** Victor Couto, 25/11/2026 ("3. ok, pode abrir o PR")
- **Depende de:** US-0046
- **Relacionadas:** US-0014, US-0042, US-0044, US-0046, ADR-0042, ADR-0055

## Descrição

**Como** pessoa do comercial,
**quero** ver o fit da empresa pelos serviços do catálogo,
**para** que a nota fale dos serviços que a Origami vende hoje, com o nome que usamos no
orçamento e no projeto.

### Contexto

O fit por serviço (US-0014) tem quatro regras escritas no código, cada uma com sinais e pesos
próprios: Dev. de Software, Lei do Bem, Captação de recursos e Consultoria. O nome que aparece na
tela também está no código. Por isso:

- serviço novo no catálogo não ganha fit (pendência registrada na US-0044);
- os nomes podem divergir do catálogo, como aconteceu com "Studio de Produto";
- com o catálogo de 2027 (US-0046), o fit mostraria "Captação de recursos" onde a Origami vende
  "Acesso a Capital".

Decisão de 24/11/2026 (Victor Couto): o fit passa a usar a lista de serviços do catálogo.

Criar uma regra nova de fit continua exigindo código, porque cada regra tem sinais e pesos
próprios e é explícita, sem IA (ADR-0042). O que muda é que cada serviço do catálogo **usa** uma
das regras existentes, ou nenhuma, e o nome vem do catálogo.

### Escopo

- Inclui:
  - escolher, no serviço, qual regra de fit ele usa, ou nenhuma;
  - fit mostrado pelo nome do serviço do catálogo, com a linha quando houver nome repetido;
  - filtros de fit da Base e de Em qualificação lendo os serviços com regra.
- Não inclui:
  - criar regra de fit nova ou mudar sinais e pesos;
  - mudar o cálculo das notas na Base (VPS).

## Critérios de aceite

**Cenário 1: o admin liga o serviço a uma regra de fit**

- **Dado** um serviço ativo do catálogo;
- **Quando** o admin edita o serviço;
- **Então** escolhe a regra de fit: Dev. de Software, Lei do Bem, Captação de recursos,
  Consultoria ou "Sem fit".

**Cenário 2: fit pelo nome do catálogo**

- **Dado** uma empresa com dados da Receita;
- **Quando** abro a ficha, o Estudo da conta, Em qualificação ou a Base;
- **Então** vejo uma nota para cada serviço ativo que tem regra de fit, com o nome do serviço no
  catálogo;
- **E** quando dois serviços têm o mesmo nome em linhas diferentes, o nome aparece com a linha.

**Cenário 3: serviço sem regra ou desativado**

- **Dado** um serviço com "Sem fit" ou desativado;
- **Então** ele não aparece no fit nem nos filtros de fit.

**Cenário 4: dois serviços com a mesma regra**

- **Dado** dois serviços ligados à mesma regra;
- **Então** os dois mostram a mesma nota e os mesmos motivos.

**Cenário 5: filtros de fit**

- **Dado** os filtros "Fit por serviço" da Base e de Em qualificação;
- **Então** a lista de serviços vem do catálogo (serviços ativos com regra);
- **E** um filtro salvo no navegador com serviço que não existe mais é ignorado, sem erro.

**Cenário 6: destaque do melhor fit**

- **Dado** a empresa com notas em vários serviços;
- **Então** o destaque continua indo para a maior nota (a partir de 20, como hoje), agora com o
  nome do catálogo.

## Decisões (Victor Couto, 24/11/2026)

- O fit é ajustado para a lista de serviços do catálogo.
- **Ligação inicial do catálogo 2027** (confirmada em 25/11/2026):

  | Serviço | Regra de fit |
  |---|---|
  | Projetos › Consultoria | Consultoria |
  | Projetos › Dev. de Software | Dev. de Software |
  | Fomento › Lei do Bem | Lei do Bem |
  | Fomento › Acesso a Capital | Captação de recursos |
  | Fomento › Consultoria | Captação de recursos (escreve o pleito, mesmo público) |
  | Governo › Workshop Sebrae | Sem fit (o cliente é o Sebrae; pipeline próprio de editais) |
  | Governo › Dev. de Software | Sem fit (mesmo motivo) |

- **Quem liga o serviço à regra:** o admin, na edição do serviço (mesma permissão do catálogo,
  US-0046).

## Pontos em aberto

### Provocações para produto

- **Regra própria para serviço novo.** Um serviço que não se encaixa em nenhuma das quatro regras
  fica sem fit até alguém escrever a regra. É o caso de Governo hoje; se surgir outro serviço,
  vira uma história de regra nova.

## Contexto técnico

- **Objetivo observável:** fit e filtros mostram os serviços do catálogo; cada serviço escolhe uma
  das quatro regras existentes ou nenhuma.
- **Termos do domínio:** fit por serviço, regra de fit (no código "frente"), serviço do catálogo,
  Base, Em qualificação, Estudo da conta.
- **Comportamento atual:**
  - PROVADO: as regras são `FitFront = 'studio' | 'lei_do_bem' | 'captacao' | 'consultoria'`
    (`src/types/receita.ts`), calculadas em `src/lib/prospecting/fit.ts`, com rótulos em
    `ROTULO_DA_FRENTE` e `ROTULO_CURTO_DA_FRENTE` e ordem em `FRENTES_DO_FIT`.
  - PROVADO: na Base, as notas vêm prontas da VPS (`pulse.empresas.fit_studio`,
    `fit_lei_do_bem`, `fit_captacao`, `fit_consultoria`), preenchidas por
    `scripts/receita/sincronizar-base.ts` e lidas pela Edge Function `empresas-receita`.
  - PROVADO: filtro da Base em `OPCOES_DE_SERVICO_DO_FIT` e `OPCOES_DE_FIT_MINIMO`
    (`src/lib/prospecting/filtrosReceita.ts`), traduzido por `servicoDoFit` na Edge Function.
  - PROVADO: filtro de Em qualificação em `src/lib/prospecting/filtrosDaQualificacao.ts`
    (`noFit`, `COLUNA_DO_SERVICO`, `ordemDosFiltros`), com uma coluna por regra em
    `ColunaDaQualificacao` (`src/types/qualificacao.ts`) e filtro salvo no navegador em
    `pulse:em-qualificacao:v1` (`lerQualificacaoSalva`).
  - PROVADO: o destaque usa `servicoEmDestaque` com `FIT_QUE_DESTACA = 20`; a ficha mostra em
    `CompanyFitSection.tsx` e a tabela em `CelulaDeFit` (`EmQualificacao.tsx`).
  - Fonte: mensagem da sessão e1 de 25/11/2026, conferida no `origin/main`.
- **Comportamento esperado:** cenários 1 a 6.
- **Superfícies conhecidas:** cadastro do serviço; ficha da empresa; Estudo da conta; Em
  qualificação; Base de empresas; Edge Function `empresas-receita`.
- **Restrições e padrões aplicáveis:**
  - fit é regra explícita, sem IA (ADR-0042, ADR-0055);
  - as chaves das regras continuam as mesmas, porque nomeiam as colunas da VPS; o que muda é o
    rótulo e a lista de serviços;
  - schema só por migration versionada; a Edge Function valida o serviço recebido.
- **Riscos para investigar:**
  - a Base filtra por regra na VPS; o filtro por serviço precisa traduzir serviço → regra antes
    da consulta;
  - colunas e ordenação de Em qualificação hoje fixas em quatro;
  - filtro salvo com chave antiga.
- **Provas esperadas:** serviço sem regra fora do fit; dois serviços com a mesma regra mostram a
  mesma nota; nome do catálogo em todas as telas; filtro salvo antigo ignorado; Base filtrando
  pelo serviço.
- **Fora do escopo:** regra nova, mudança de pesos, recálculo na VPS.

## Implementação

> Preenchido ao implantar. Todo cenário aponta para a prova.

| Cenário | Prova (teste ou evidência) |
|---|---|
| — | — |
