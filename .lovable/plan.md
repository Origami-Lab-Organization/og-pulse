
# Barra Unica de Alocacao na Visao de Alocacao

## O que muda

Substituir as duas barras separadas (verde de alocacao + azul de realizacao) por uma **barra unica segmentada** que mostra tres faixas dentro da capacidade mensal (jornada):

```text
|  Real (azul)  |  Planejado restante (verde)  |  Desalocado (cinza)  |
|<-- actual -->|<-- planned - actual -------->|<-- capacity - planned -->|
```

- **Azul**: horas ja realizadas (lancadas em timesheet)
- **Verde**: horas planejadas que ainda nao foram realizadas (planned - actual)
- **Cinza**: capacidade sem planejamento (jornada - planned)

Os textos "Real." e "Plan." continuam acima da barra, e o resumo de percentual abaixo.

A navegacao entre meses e a opcao "Mes Atual" / "Ano Todo" permanecem iguais.

## Arquivo a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/timesheets/AllocationOverview.tsx` | Substituir as duas barras por uma barra segmentada unica (linhas ~301-330) |

## Detalhes tecnicos

### Calculo dos segmentos da barra

```text
const capacity = emp.jornadaMensal;
const realPercent = capacity > 0 ? (actual / capacity) * 100 : 0;
const plannedRemaining = Math.max(planned - actual, 0);
const plannedRemainingPercent = capacity > 0 ? (plannedRemaining / capacity) * 100 : 0;
// O cinza e o restante da barra (background natural)
```

### Estrutura HTML da barra

```text
<div class="h-2 w-full rounded-full bg-muted flex overflow-hidden">
  <div class="bg-blue-500 h-full" style="width: {realPercent}%" />
  <div class="bg-green-500 h-full" style="width: {plannedRemainingPercent}%" />
  <!-- cinza ja e o fundo (bg-muted) -->
</div>
```

### Textos mantidos

- "Real." com valor de horas a direita
- "Plan." com "Xh / Yh" (planejado / jornada)
- Percentuais: "X% aloc. · Y% real."
