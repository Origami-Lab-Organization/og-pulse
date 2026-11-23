# US-0004 — Recolher os filtros para ver mais da lista

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Empresas da Receita
- **Prioridade:** 2
- **Aprovada por / em:** Victor Couto, 2026-11-17
- **Relacionadas:** US-0003, US-0005

## Descrição

**Como** pessoa do comercial,
**quero** recolher o painel de filtros depois de defini-los,
**para** ver mais colunas e mais empresas de uma vez.

### Contexto

Pedido do Victor em 2026-11-16: o título e os filtros tomavam boa parte da tela antes
de aparecer a primeira empresa.

A US-0003 (PR #71) já entregou o painel à direita, o botão "Filtros" com a contagem de
filtros ativos e o botão de recolher. Faltam quatro coisas:

- lembrar se o painel ficou aberto ou fechado;
- começar recolhido na primeira visita;
- devolver o foco ao botão "Filtros" quando o painel recolhe;
- telas estreitas: abaixo de 1024 px o painel hoje cai embaixo da lista, longe de quem rola.

### Escopo

- Inclui, no computador (1024 px ou mais):
  - o painel à direita da lista, recolhível pelo botão do painel e por "Filtros";
  - na primeira visita, o painel começa recolhido;
  - a tela lembra no navegador se o painel ficou aberto ou fechado.
- Inclui, no celular e no tablet (abaixo de 1024 px):
  - o painel começa sempre fechado e abre por cima da lista, pela direita;
  - os filtros valem enquanto a pessoa marca;
  - no rodapé do painel, o botão "Ver N empresas" fecha o painel; Esc, o botão de recolher e
    tocar fora também fecham.
- Inclui: ao recolher ou fechar, o foco volta ao botão "Filtros".
- Não inclui: mudar a casca do Pulse; guardar a escolha no servidor; lembrar o painel no
  celular.

## Critérios de aceite

**Cenário 1: primeira visita**

- **Dado** que nunca abri a tela neste navegador, num computador;
- **Então** o painel começa recolhido e a lista ocupa toda a largura;
- **E** o botão "Filtros" mostra quantos filtros estão ativos.

**Cenário 2: recolher**

- **Dado** que o painel está aberto;
- **Quando** clico no botão de recolher do painel ou em "Filtros";
- **Então** o painel some e a lista ocupa toda a largura;
- **E** os filtros continuam aplicados;
- **E** o foco vai para o botão "Filtros".

**Cenário 3: reabrir**

- **Quando** clico em "Filtros";
- **Então** o painel volta com os filtros como estavam.

**Cenário 4: lembrar**

- **Dado** que abri o painel;
- **Quando** volto à tela outro dia, no mesmo navegador;
- **Então** o painel continua aberto;
- **E** o mesmo vale para recolhido.

**Cenário 5: celular e tablet**

- **Dado** uma tela com menos de 1024 px;
- **Então** o painel começa fechado, mesmo que eu o tenha deixado aberto no computador;
- **Quando** toco em "Filtros";
- **Então** o painel abre por cima da lista;
- **E** a lista atrás já muda a cada filtro marcado.

**Cenário 6: voltar para a lista no celular**

- **Dado** o painel aberto por cima da lista;
- **Quando** toco em "Ver 1.234 empresas" no rodapé, no botão de recolher, fora do painel ou
  aperto Esc;
- **Então** o painel fecha e o foco volta ao botão "Filtros";
- **E** enquanto o total é contado, o botão diz "Ver empresas"; acima de 100 mil, "Ver mais
  de 100.000 empresas".

## Decisões (Victor Couto, 2026-11-16 e 2026-11-17)

- Filtros à direita e recolhíveis (16/11).
- Na primeira visita, no computador, o painel começa recolhido (17/11).
- No celular e no tablet, o rodapé do painel tem "Ver N empresas" para voltar à lista
  (17/11).

## Pontos em aberto

### Hipóteses para validar

- 1024 px é a largura a partir da qual o painel cabe ao lado da lista sem apertar a
  tabela. Origem: o painel tem 288 px e a lista já usa o breakpoint `lg` do Tailwind.

### Provocações para produto

- Quem chega pela primeira vez pode não perceber que dá para filtrar — impacto possível:
  menos uso dos filtros; o botão "Filtros" fica ao lado da busca, com a contagem.

## Contexto técnico

- **Objetivo observável:** painel recolhível, com a escolha lembrada por navegador no
  computador, e gaveta por cima da lista abaixo de 1024 px.
- **Comportamento atual:** PROVADO (código da #71):
  - `EmpresasDaReceita` guarda `painelAberto` em `useState(true)`, sem lembrar;
  - abaixo de `lg` o grid vira uma coluna e o `PainelDeFiltros` fica embaixo da lista;
  - o botão de recolher fecha o painel, mas o foco se perde (o botão some com o painel).
- **Comportamento esperado:**
  - `lg` ou mais: painel em linha, estado em `localStorage`
    (`pulse:empresas-receita:painel:v1`), padrão recolhido, com leitura e escrita em
    try/catch;
  - abaixo de `lg`: `Sheet` do shadcn (Radix Dialog) à direita, com o mesmo conteúdo do
    painel; Radix cuida de Esc, de tocar fora, de prender o foco e de devolvê-lo ao gatilho;
  - "Ver N empresas" usa o mesmo total da barra da lista (`useTotalReceita`).
- **Superfícies conhecidas:**
  - `src/components/prospeccao/receita/EmpresasDaReceita.tsx`;
  - `src/components/prospeccao/receita/PainelDeFiltros.tsx`;
  - `src/components/ui/sheet.tsx`;
  - um hook de largura (`src/hooks/use-mobile.tsx` usa 768 px; aqui o corte é 1024 px).
- **Restrições e padrões aplicáveis:** foco visível, Esc para fechar, `aria-expanded` no
  botão "Filtros", título acessível na gaveta, tokens do tema — fonte:
  `.harness/patterns/design-system.md`.
- **Riscos para investigar:** o `Sheet` traz um "x" próprio; o painel já tem o botão de
  recolher, então a gaveta não pode mostrar dois botões de fechar.
- **Provas esperadas:** evidência na tela, no computador e em largura de celular: primeira
  visita, recolher, reabrir, lembrar, foco de volta ao botão, Esc, tocar fora e "Ver N
  empresas".
- **Fora do escopo:** guardar a escolha no servidor.

## Implementação

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1, 4 | `painelDoNavegador` / `guardarPainel` (`filtrosReceita.ts`): sem nada guardado, recolhido; chave `pulse:empresas-receita:painel:v1` |
| 2, 3 | `usePainelDeFiltros`: recolher pelo painel ou por "Filtros" devolve o foco ao botão; os filtros não mudam |
| 5 | `useTelaLarga` (1024 px): abaixo disso, `GavetaDeFiltros` (`Sheet` à direita), sempre fechada ao chegar, sem lembrar |
| 6 | `GavetaDeFiltros`: "Ver N empresas" com o total da barra; Esc e tocar fora pelo Radix; foco de volta ao botão em `onCloseAutoFocus` |

- `Sheet` ganhou `hideClose`: a gaveta usa o botão de recolher do painel, sem um segundo "x".
- **Tela:** validada pelo Victor em 17/11/2026.
