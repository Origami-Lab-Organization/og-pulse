

# Ajuste dos KPIs de Receita, Custos e Margem

## Objetivo

Alterar os cartoes de KPI nos dois locais (Visao Geral e Financeiro) para:

1. **Receita e Custos**: mostrar "% executado" (quanto do planejado ja foi realizado) em vez de "variacao" (diferenca percentual entre planejado e realizado)
2. **Margem**: quando nao houver receita recebida, mostrar margem 0% em vez de usar o valor planejado como base de calculo

## Logica de calculo

### Receita
- **Antes**: variacao = ((realizado - planejado) / planejado) * 100
- **Depois**: executado = (realizado / planejado) * 100 (ex: R$0 de R$444k = 0% executado)

### Custos
- **Antes**: variacao = ((realizado - planejado) / planejado) * 100
- **Depois**: executado = (realizado / planejado) * 100 (ex: R$2.5k de R$181k = 1.4% executado)

### Margem
- **Antes**: se revenueActual = 0, usava revenuePlanned como base
- **Depois**: se revenueActual = 0, margem realizada = 0% (margem so conta a partir dos recebimentos)

## Arquivos a modificar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/projects/detail/ProjectOverviewTab.tsx` | Alterar calculo de kpiData (margem) e substituir "variacao" por "executado" nos 2 cartoes de Receita e Custos |
| `src/components/projects/detail/ProjectFinancialTab.tsx` | Mesmas alteracoes acima |

## Detalhes tecnicos

### Calculo da margem realizada (ambos arquivos)

```text
Antes:
  marginActualBase = revenueActual > 0 ? revenueActual : revenuePlanned
  marginActual = ((marginActualBase - costActual) / marginActualBase) * 100

Depois:
  marginActual = revenueActual > 0
    ? ((revenueActual - costActual) / revenueActual) * 100
    : 0
```

### Indicador de execucao (ambos arquivos)

Nos cartoes de Receita e Custos, substituir a linha de "variacao" por "executado":

```text
Antes:
  -98.6% variacao  (vermelho/verde baseado em positivo/negativo)

Depois:
  1.4% executado   (cor neutra, apenas informativo)
```

A formula do percentual executado:
- `revenueExecuted = revenuePlanned > 0 ? (revenueActual / revenuePlanned) * 100 : 0`
- `costExecuted = costPlanned > 0 ? (costActual / costPlanned) * 100 : 0`

