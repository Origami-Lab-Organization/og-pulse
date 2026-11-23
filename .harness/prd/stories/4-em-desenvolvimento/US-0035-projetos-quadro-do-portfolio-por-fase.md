# US-0035 — Quadro do portfólio por fase, sem rolagem longa

- **Status:** Em desenvolvimento
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Portfólio de projetos
- **Prioridade:** 2
- **Aprovada por / em:** Victor Couto, 23/11/2026 (pediu as US e o desenvolvimento da tela a partir do protótipo, versão 6)
- **Relacionadas:** US-0034, US-0037

## Descrição

**Como** GP ou admin com `portfolio:ler`,
**quero** ver os projetos em quatro colunas que reflitam a fase de verdade, com cards
compactos e sem rolagem longa,
**para** enxergar o portfólio inteiro de relance.

### Contexto

A coluna Entrega de Valor gerava rolagem longa; Apresentação de Resultados e Aprendizado e
Case ficavam quase vazias; havia visão em Lista, selo "Visão da empresa" e lixeira em todo
card. Protótipo: `prototipos/portfolio-de-projetos.html`.

### Escopo

- Inclui: colunas Planejamento, Entrega de Valor, Encerramento e Concluído (do ano); card sem
  lixeira, cadeado e "Origem comercial"; rolagem dentro da coluna; filtro "Meus projetos |
  Todos" no lugar do selo e do filtro de gerente; sem visão em Lista.
- Não inclui: sino de pendências (US-0037); fim do arrasto entre colunas (vem com o modo
  planejamento e o encerramento).

## Critérios de aceite

**Cenário 1: Encerramento pela data**

- **Dado** um projeto em Entrega de Valor que termina em 20 dias ou menos, ou que já passou
  da data de fim;
- **Quando** abro o portfólio;
- **Então** ele aparece em Encerramento, com "termina em N dias" ou "terminou em dd/mm/aa";
- **E** projetos nas etapas antigas Apresentação de Resultados e Aprendizado e Case também
  aparecem em Encerramento.

**Cenário 2: Concluído do ano**

- **Dado** o ano filtrado;
- **Quando** olho Concluído;
- **Então** vejo só os projetos concluídos naquele ano, o mais recente primeiro.

**Cenário 3: rolagem dentro da coluna**

- **Dado** uma coluna com muitos projetos;
- **Quando** rolo;
- **Então** só a coluna rola, e o cabeçalho dela fica visível.

**Cenário 4: alcance**

- **Dado** um GP;
- **Quando** abre o portfólio;
- **Então** vê "Meus projetos"; o admin abre em "Todos"; os dois podem trocar.

**Cenário 5: sem Lista e sem selo**

- **Dado** o portfólio;
- **Então** não há botão Lista, selo "Visão da empresa" nem lixeira nos cards (excluir fica
  em "Excluir / Arquivar", na página do projeto).

**Cenário 6: arrasto que continua valendo**

- **Dado** um projeto que posso editar;
- **Quando** arrasto para Entrega de Valor ou para Concluído;
- **Então** acontece como antes (Concluído pede a data de conclusão);
- **E** soltar em Encerramento avisa que essa coluna segue a data de fim.

## Contexto técnico

- **Implementação:** `boardColumnOf`, `isCompletedInYear` e `sortForColumn` em
  `src/lib/portfolioBoard.ts`; colunas `PORTFOLIO_BOARD_COLUMN` em `src/types/portfolio.ts`.
  As etapas gravadas (`portfolio_stage`) não mudaram.
- **Testes desatualizados (testes desativados no Harness):** `src/test/portfolio.permissions.test.tsx`
  espera o filtro de gerente; `src/test/portfolio.kanban.test.tsx` espera cinco colunas.
  `PortfolioTable.tsx` ficou sem uso na página e sai junto com esses testes.
