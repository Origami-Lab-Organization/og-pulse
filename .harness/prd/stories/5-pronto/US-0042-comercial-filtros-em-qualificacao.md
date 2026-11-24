# US-0042 — Filtros na aba "Em qualificação" para decidir quem analisar primeiro

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 3
- **Aprovada por / em:** Victor Couto, 24/11/2026 (refinamento aprovado no pedido "refine a 40, 41 e 42 para desenvolvermos elas"; testes aprovados)
- **Relacionadas:** US-0014, US-0022, US-0023, US-0040, US-0041

## Descrição

**Como** pessoa do comercial,
**quero** filtrar e ordenar as empresas em qualificação por segmento, região, conta, fit, BANT,
responsável e tempo na etapa,
**para** decidir quem analisar primeiro sem percorrer a lista inteira.

### Contexto

Pedido do Victor (24/11/2026). A aba "Em qualificação" (US-0023) é uma tabela ordenada pela nota
do BANT, sem filtros. Com o volume que a Base gera, o comercial precisa recortar: um segmento,
uma região, um serviço.

Em 24/11/2026 são 23 empresas em qualificação: 22 com os dados da Receita gravados (atividade
principal, cidade e estado), as 23 com o retrato da Base (distância), todas com a entrada na
etapa registrada no histórico, e uma holding.

### Escopo

- Inclui: botão de filtros com a contagem, no mesmo padrão da Base (ícone na linha das abas,
  painel com grupos, "Limpar"), com **todos** os filtros abaixo:

  | Grupo | Filtro | De onde vem |
  |---|---|---|
  | Segmento | setor, ramo e CNAE — incluir e tirar (US-0041, atalhos inclusive) | CNAE principal da Receita gravada na empresa |
  | Região | estado e cidade (escolha entre as que estão na lista) | endereço da Receita gravada |
  | Região | distância máxima de Formiga, barra e campo (US-0040) | retrato da Base (US-0014) |
  | Conta | tipo de conta: Âncora, Ponte, Satélite, sem tipo | `tipo_conta` |
  | Conta | faixa de faturamento (as mesmas faixas da Base) | faturamento informado pelo time; sem ele, o estimado do retrato |
  | Serviço | serviço do fit (ordena por ele e tira quem não tem nota) e fit mínimo "40, 60 ou 80 ou mais" (US-0014) | mesma regra das colunas da tabela |
  | BANT | nota mínima (25, 50 ou 75 ou mais) e "com propostas da IA esperando" | BANT do quadro |
  | Time | responsável (inclui "Sem responsável") | `owner_id` |
  | Time | há quanto tempo em qualificação: mais de 7, 15 ou 30 dias | última entrada na etapa no histórico (`prospect_stage_changes`); sem registro, a criação |

- Inclui: **busca** por nome, CNPJ ou cidade, no topo da tabela.
- Inclui: **ordem por coluna**: clicar no cabeçalho de BANT, de cada fit, faturamento, distância
  e "Desde" ordena; outro clique inverte; padrão continua sendo a nota do BANT, maior primeiro.
- Inclui: a maior nota de fit (a partir de 20) num quadrado verde, para ver de relance o
  serviço de maior fit.
- Inclui: nova coluna **Distância** (km do retrato; "—" sem retrato), para ver e ordenar.
- Inclui: a coluna **"Desde"** passa a mostrar a entrada na etapa (hoje mostra a criação).
- Inclui: a barra da aba mostra quantas aparecem com filtro: "8 de 23 empresas" (no lugar do total, como na Base).
- Inclui: filtros e ordem guardados no navegador, separados dos da Base.
- Inclui: sem resultado, a mensagem "Nenhuma empresa com esses filtros" e o botão "Limpar".
- Não inclui: filtros salvos para o time (US-0013); ir ao servidor (a lista é do tenant e
  pequena, o filtro roda na tela).

## Critérios de aceite

**Cenário 1: recortar por região e serviço**

- **Quando** filtro "até 200 km" e "Lei do Bem 60 ou mais";
- **Então** vejo só as empresas em qualificação que atendem aos dois, e a barra mostra "N de 23 empresas".

**Cenário 2: quem está parado**

- **Quando** filtro "há mais de 15 dias" e ordeno por "Desde";
- **Então** vejo primeiro as que entraram na etapa há mais tempo.

**Cenário 3: tirar holdings**

- **Quando** uso "Sem holdings";
- **Então** a holding em qualificação some da lista.

**Cenário 4: propostas da IA**

- **Quando** marco "com propostas da IA esperando";
- **Então** vejo só as oportunidades com proposta de evidência ainda sem decisão.

**Cenário 5: busca**

- **Quando** digito parte do nome, do CNPJ ou da cidade;
- **Então** a lista mostra só as que casam, junto com os filtros.

**Cenário 6: dado que falta**

- **Dado** uma empresa sem a Receita gravada ou sem retrato;
- **Quando** filtro por segmento, cidade ou distância;
- **Então** ela fica fora desse filtro e aparece de novo quando ele é limpo; sem filtro, aparece
  com "—" na coluna.

**Cenário 7: limpar**

- **Quando** uso "Limpar" (no painel ou na lista vazia);
- **Então** volto à lista inteira, sem busca, ordenada pelo BANT.

**Cenário 8: escolher o serviço**

- **Quando** escolho "Studio de Produto" no fit, sem mínimo;
- **Então** a lista passa a ser ordenada pelo fit de Studio, e saem as empresas sem nota (sem os
  dados da Receita).

## Decisões (24/11/2026)

- Victor: todos os filtros de uma vez.
- Empresa sem o dado fica fora do filtro que depende dele (mesma regra da Base, onde a distância
  nula não passa em "até N km").
- "Há quanto tempo" conta da última entrada na etapa, não da criação.
- No teste (Victor): escolher o serviço precisa mudar a lista (antes, só o mínimo filtrava); a
  maior nota ganha o quadrado verde.

## Contexto técnico

- **Comportamento atual:** PROVADO — `EmQualificacao.tsx` (`src/components/prospeccao/
  qualificacao/`) e `useEmQualificacao`, lista do tenant em memória a partir de `useProspects`,
  ordenada pela nota do BANT (`useBantDoQuadro`, que já traz `nota`, `notaComprovada` e
  `propostas`); a coluna "Desde" usa `prospects.created_at`.
- **Mudanças:**
  - Regra de filtro e ordem pura e reaproveitável, ex. `src/lib/prospecting/filtrosDaQualificacao.ts`
    (tipo em `src/types/`), sobre a linha que a tabela já monta; setor e ramo por
    `setorDoCnae`/`divisaoDoCnae` (`src/lib/prospecting/cnae.ts`).
  - Entrada na etapa: ler a última `prospect_stage_changes` com `to_stage = 'qualificacao'` das
    oportunidades da lista (uma consulta, RLS do tenant), num hook próprio.
  - Painel: reaproveitar os blocos do painel da Base (`Grupo`, `Chips`, `EscolhaUnica`,
    `Caixa`) exportando-os de `PainelDeFiltros.tsx` ou movendo-os para um arquivo comum; o
    controle de distância vem da US-0040 e a parte "Tirar" da US-0041.
  - Persistência no `localStorage` com leitura tolerante (como `lerFiltrosSalvos`).
- **Ordem de desenvolvimento:** US-0040 e US-0041 primeiro (os controles), depois esta.
- **Restrições:** tokens do tema; cabeçalhos ordenáveis com `aria-sort`; nomes
  Oportunidade/Pipeline; nada de dado da Base além do retrato (ADR-0055).

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 a 8 | validado pelo Victor no localhost em 24/11/2026 ("testei, tudo passou"), depois dos ajustes do primeiro teste; testes automatizados desativados |

- Regra: `src/lib/prospecting/filtrosDaQualificacao.ts` (linha, filtro, contagem, ordem, ordem pelo
  serviço escolhido, navegador); tipos em `src/types/qualificacao.ts`.
- Entrada na etapa: `fetchEntradasNaQualificacao` (`src/services/qualificacaoService.ts`) e
  `useEntradasNaQualificacao`, pelo `occurred_on` de `prospect_stage_changes` (RLS do tenant).
- Tela: `EmQualificacao.tsx` (busca, contagem, cabeçalhos ordenáveis com `aria-sort`, coluna
  Distância, maior fit em destaque) e `PainelDaQualificacao.tsx` na gaveta de filtros; botão de
  filtros comum (`BotaoDeFiltros.tsx`).
- Sem mudança no banco.
