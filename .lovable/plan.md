
# Reformular KPIs do Dashboard - Planejado vs Realizado

## Objetivo
Substituir os 5 cards simples do topo por 3 cards com comparativo **Realizado** (destaque) vs **Planejado** (menor) e a variacao entre eles para: Receita, Custos e Margem.

## Layout dos 3 Cards

```text
+---------------------+  +---------------------+  +---------------------+
| RECEITA             |  | CUSTOS              |  | MARGEM              |
|                     |  |                     |  |                     |
| R$ 40.800,00  Real  |  | R$ 8.500,00   Real  |  | 79.2%        Real   |
| R$ 40.800,00  Plan  |  | R$ 7.200,00   Plan  |  | 82.4%        Plan   |
| +0,0% variacao      |  | +18,1% variacao     |  | -3.2pp variacao     |
+---------------------+  +---------------------+  +---------------------+
```

Cada card tera:
- Icone + titulo no topo
- Valor realizado em destaque (fonte grande, bold)
- Valor planejado abaixo (fonte menor, muted)
- Variacao com cor (verde se favoravel, vermelho se desfavoravel)

## Logica de calculo

### Receita
- **Planejado**: valor do contrato (`project.total_value`)
- **Realizado**: soma das parcelas com status `received`
- **Variacao**: `(realizado - planejado) / planejado * 100`

### Custos
- **Planejado**: `costData.totalPlanned` (ja calculado -- mao de obra + fornecedores + materiais)
- **Realizado**: `costData.totalActual` (ja calculado -- timesheets + supplier actuals + materiais realizados)
- **Variacao**: `(realizado - planejado) / planejado * 100` (verde se negativo = gastou menos)

### Margem
- **Planejada**: `(contrato - custoPlanned) / contrato * 100`
- **Realizada**: `(recebido - custoActual) / recebido * 100` (ou baseada em contrato se recebido = 0)
- **Variacao**: diferenca em pontos percentuais (pp)

## Arquivo a modificar

| Arquivo | Acao |
|---------|------|
| `ProjectOverviewTab.tsx` | Substituir a grade de 5 cards (linhas 273-361) pelos 3 novos cards comparativos |

## Detalhes tecnicos

- Adicionar calculo de `revenueActual` (parcelas recebidas) e `revenuePlanned` (contrato) no `useMemo` existente
- Adicionar calculo de margem realizada
- Variacao com sinal: `+X%` ou `-X%`
- Cores: receita e margem positiva = verde, negativa = vermelho; custos invertido (positivo = vermelho, pois gastou mais)
- Manter os cards de "Recebido" e "Pendente" integrados no card de Receita (ou remover se redundantes com o novo layout)
