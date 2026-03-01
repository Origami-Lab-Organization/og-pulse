
# Tooltips e Variacao nos KPIs do Dashboard Comercial

## Resumo
Adicionar icone de ajuda (?) com tooltip em cada card de KPI e indicador de variacao comparando com o ano anterior.

## Alteracoes

### 1. Hook: calcular KPIs do periodo anterior (`useCommercialDashboard.ts`)

Duplicar o calculo dos 5 KPIs para `selectedYear - 1` e retornar os valores anteriores no objeto de dados:

```typescript
// Novos campos no CommercialDashboardData
prevConversionRate: number;
prevAvgTicket: number;
prevAvgSalesCycleDays: number | null;
prevActivePipeline: number;
prevNewLeadsThisYear: number;
```

O calculo usa a mesma logica ja existente, mas filtrando por `selectedYear - 1`. As variacoes serao calculadas no componente.

### 2. Componente: adicionar tooltip e variacao (`CommercialKPIs.tsx`)

**Tooltip de ajuda:**
- Adicionar icone `HelpCircle` (lucide-react) ao lado do label de cada KPI
- Usar componente `Tooltip` do Radix (ja disponivel em `@/components/ui/tooltip`)
- Cada KPI tera seu texto explicativo conforme especificado

**Indicador de variacao:**
- Calcular variacao: `((atual - anterior) / anterior) * 100`
- Para Ciclo Medio, a logica e invertida (menor e melhor, entao queda e verde)
- Exibir seta para cima (verde) ou para baixo (vermelho) com o percentual
- Se nao houver dados do periodo anterior, nao exibir variacao

**Textos dos tooltips:**
- Taxa de Conversao: "Percentual de leads que se tornaram negocio fechado no periodo"
- Ticket Medio: "Valor medio dos negocios fechados. O valor e definido na etapa Proposta, quando o orcamento e gerado"
- Ciclo Medio: "Tempo medio em dias desde a criacao do lead ate o fechamento do negocio"
- Pipeline Ativo: "Soma dos orcamentos em andamento (etapas Proposta e Negociacao). Leads em Triagem e Qualificacao ainda nao possuem valor definido"
- Leads no Periodo: "Quantidade de novos leads criados no periodo, independente da etapa"

**Props adicionais no componente:**
- `prevConversionRate`, `prevAvgTicket`, `prevAvgSalesCycleDays`, `prevActivePipeline`, `prevNewLeadsThisYear`

### 3. Pagina: passar novas props (`CommercialDashboard.tsx`)
Passar os novos campos `prev*` do hook para o componente `CommercialKPIs`.

## Arquivos modificados
1. `src/hooks/useCommercialDashboard.ts` -- adicionar calculo dos KPIs do ano anterior
2. `src/components/commercial/CommercialKPIs.tsx` -- adicionar tooltips e indicadores de variacao
3. `src/pages/CommercialDashboard.tsx` -- passar novas props

## Detalhes de UI
- O icone `?` sera pequeno (h-3 w-3), cinza, posicionado ao lado do label
- A variacao aparecera abaixo do valor principal, em fonte pequena (text-xs)
- Verde para variacao positiva (exceto Ciclo Medio onde menor e melhor)
- Vermelho para variacao negativa (exceto Ciclo Medio)
- Formato: "triangulo 12.5% vs. ano anterior"
