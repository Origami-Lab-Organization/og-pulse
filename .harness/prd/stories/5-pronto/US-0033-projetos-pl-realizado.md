# US-0033 — Ver o P&L realizado ao lado do projetado

- **Status:** Pronto
- **Tipo:** história
- **Prontidão:** PRONTA
- **Épico:** Custos do projeto
- **Prioridade:** 9
- **Aprovada por / em:** Victor Couto, 23/11/2026
- **Relacionadas:** US-0025, US-0031

## Descrição

**Como** GP ou admin com `financeiro:ler`,
**quero** alternar o P&L da aba Financeiro entre Projetado e Realizado,
**para** comparar o resultado que o projeto prometia com o que ele já entregou em caixa.

### Contexto

A aba Financeiro só mostra o P&L projetado: contrato, comissão planejada, mão de obra
planejada, outros custos planejados e resultado. Não há como ver o resultado realizado.

### Escopo

- Inclui: seletor Projetado / Realizado no P&L, no mesmo padrão do seletor da rosca da aba
  Despesas; versão realizada do P&L.
- Não inclui: forecast (US-0031 e US-0032).

## Critérios de aceite

**Cenário 1: o seletor**

- **Dado** a aba Financeiro;
- **Quando** abro o P&L;
- **Então** vejo o seletor Projetado / Realizado, com Projetado escolhido;
- **E** Projetado mostra o P&L de hoje, sem mudança.

**Cenário 2: o P&L realizado**

- **Dado** o seletor em Realizado;
- **Quando** olho o P&L;
- **Então** as linhas são: receita recebida (parcelas recebidas), comissão paga, mão de obra
  realizada, outros custos realizados e resultado (receita recebida − comissão paga − custos
  realizados);
- **E** os custos realizados são os mesmos dos cards da aba (US-0025).

**Cenário 3: resultado negativo**

- **Dado** um projeto que gastou mais do que recebeu;
- **Quando** olho o P&L realizado;
- **Então** o resultado aparece negativo, em destaque negativo.

**Cenário 4: o Paraíso**

- **Dado** o Paraíso em 23/11/2026, sem parcela recebida;
- **Quando** escolho Realizado;
- **Então** vejo receita recebida R$ 0,00, comissão paga R$ 0,00, mão de obra R$ 3.671,67,
  outros R$ 1.083,60 e resultado −R$ 4.755,27.

**Cenário 5: valores ocultos**

- **Dado** "ocultar valores" ligado;
- **Quando** alterno o seletor;
- **Então** os valores ficam ocultos nas duas versões.

## Decisões (Victor Couto, 23/11/2026)

- No P&L realizado, a receita é a recebida (parcelas recebidas).
- Projetado e Realizado ficam num seletor, como o da rosca da aba Despesas.

## Pontos em aberto

### Hipóteses para validar

- As barras do P&L realizado continuam proporcionais ao valor do contrato, como no projetado,
  para as duas versões serem comparáveis lado a lado.

## Contexto técnico

- **Comportamento atual:** PROVADO — `ProjectPnLBridge.tsx` recebe `contract`, `commission`,
  `labor`, `other`; `ProjectFinancialTab.tsx` passa `revenuePlanned`, `commissionPlanned`,
  `laborPlanned`, `extraPlanned`. Receita recebida e comissão paga já existem em `kpiData`
  (`revenueActual`, `commissionActual`).
- **Restrições:** custos realizados da regra única (`useProjectCostSummary`, US-0025);
  seletor no padrão `ToggleGroup` da rosca (`ProjectMonthlyCostChart.tsx`); Design System
  Origami.
- **Provas esperadas:** os cinco cenários.

## Implementação

`ProjectPnLBridge.tsx` recebe as duas versões (`projected` e `realized`, tipo `PnLValues`) e
alterna com um `ToggleGroup` Projetado / Realizado, no padrão da rosca da aba Despesas;
abre em Projetado. Realizado: "Recebido" (parcelas recebidas, `kpiData.revenueActual`),
"Comissão paga" (`kpiData.commissionActual`), mão de obra e outras despesas realizadas da
regra única (`useProjectCostSummary`, US-0025) e resultado. Resultado negativo aparece com
sinal e em `text-destructive`/`bg-destructive`. As barras das duas versões são
proporcionais ao valor do contrato.

| Cenário | Prova (teste ou evidência) |
|---|---|
| 1 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). |
| 2 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). |
| 3 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080). |
| 4 | Conferido na tela por Victor Couto em 23/11/2026 (Paraíso, localhost:8080): R$ 0,00 · R$ 0,00 · R$ 3.671,67 · R$ 1.083,60 · −R$ 4.755,27. |
| 5 | Pendente: conferir com "ocultar valores". |

Testes automatizados não escritos: testes desativados no Harness por decisão do time.
