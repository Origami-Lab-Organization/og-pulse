

## Grafico de Volume de Projetos -- Ganho Mensal, Perdido Mensal e Acumulado

### Problema Atual
O grafico "Receita Acumulada" mostra apenas duas curvas acumuladas (Ganho e Perdido), sem mostrar o volume mensal individual. Alem disso, o eixo Y exibe "0k" repetido quando nao ha dados.

### Nova Proposta
Transformar em um grafico combinado (ComposedChart do Recharts) com 3 series:

1. **Barras "Ganho no Mes"** (verde) -- valor dos leads fechados naquele mes
2. **Barras "Perdido no Mes"** (vermelho/coral) -- valor dos leads arquivados naquele mes
3. **Linha "Acumulado Ganho"** (verde escuro, com area preenchida) -- soma acumulada dos ganhos

### Dados
O hook `useCommercialDashboard.ts` ja calcula `won` (mensal) e o acumulado. Sera ajustado para retornar 3 campos por mes: `wonMonth`, `lostMonth` e `wonAccumulated`.

### Mudancas Tecnicas

**1. `src/hooks/useCommercialDashboard.ts`**
- Alterar o formato do `revenueByMonth` para incluir 3 campos: `wonMonth` (ganho no mes), `lostMonth` (perdido no mes) e `wonAccumulated` (acumulado de ganhos)
- Atualizar a interface `CommercialDashboardData` para refletir os novos campos

**2. `src/components/commercial/RevenueAccumulatedChart.tsx`**
- Trocar de `AreaChart` para `ComposedChart` (Recharts)
- Adicionar duas series `Bar` lado a lado: Ganho no Mes (verde) e Perdido no Mes (vermelho)
- Adicionar uma serie `Line` (ou `Area`) para o Acumulado Ganho com eixo Y secundario (YAxis com `yAxisId`)
- Titulo: "Volume de Projetos"
- Legendas: "Ganho no Mes", "Perdido no Mes", "Acumulado Ganho"
- Tooltip com formatacao em moeda (BRL)

**3. `src/pages/CommercialDashboard.tsx`**
- Nenhuma alteracao necessaria, o componente continua recebendo `data.revenueByMonth`

### Layout Visual

```text
Volume de Projetos
R$ (barras)                              R$ (linha acumulada)
|  ██                                    ___________
|  ██ ░░                          ______/
|  ██ ░░    ██              ____/
|  ██ ░░    ██ ░░    ██ ___/
|  ██ ░░    ██ ░░    ██ ░░
+--Jan--Fev--Mar--Abr--Mai--Jun--Jul--...--Dez

██ Ganho no Mes   ░░ Perdido no Mes   ── Acumulado Ganho
```

