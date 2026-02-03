

# Plano: Redesign Visual do Dashboard de Projeto

## Diagnostico dos Problemas Visuais

Com base na analise das screenshots, identifiquei os seguintes problemas:

1. **Cards de metricas desbalanceados**: Alguns tem cor de fundo, outros nao - falta consistencia
2. **Grafico Donut muito simples**: Falta legenda clara, percentuais mal posicionados
3. **Grafico de Recebimentos pouco informativo**: Com apenas 1 barra (Pendente), parece incompleto
4. **Curva de Tendencia perdida**: Grafico pequeno com linhas finas, dificil interpretar
5. **Equipe do Projeto basica**: Apenas avatares sem contexto visual
6. **Espacamento excessivo**: Muito espaco branco desperdicado entre secoes

## Solucao Proposta

### 1. Cards de Metricas Refinados

Redesenhar os 5 cards com:
- Estilo visual unificado (fundo neutro para todos)
- Icones mais sutis e alinhados
- Tamanho de fonte hierarquico (valor em destaque)
- Indicadores de tendencia apenas onde faz sentido (margem)

```text
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ ≡ Contrato     │  │ ◎ Custo Plan.  │  │ ↗ Margem       │
│                │  │                │  │                │
│ R$ 40.800,00   │  │ R$ 19.568,18   │  │ 52.0%          │
│                │  │                │  │ ▲ Saudavel     │
└────────────────┘  └────────────────┘  └────────────────┘
```

### 2. Grafico de Composicao de Custos Aprimorado

- Aumentar tamanho do donut chart
- Adicionar valor total no centro do donut (destaque visual)
- Legendas mais claras e proximas ao grafico
- Cores harmonicas da paleta (Pine Teal + Celadon + Amber)

### 3. Grafico de Recebimentos Reformulado

Mudar de barra horizontal para um **Progress Bar Visual** mais informativo:
- Barra de progresso mostrando % recebido do total
- Tres secoes coloridas: Recebido (verde), Pendente (amarelo), Atrasado (vermelho)
- Valores abaixo com legendas claras

```text
┌─────────────────────────────────────────────────────────┐
│ Recebimentos                                            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │
│ │ Recebido 0%    Pendente 100%                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ R$ 0,00 de R$ 40.800,00                                 │
└─────────────────────────────────────────────────────────┘
```

### 4. Curva de Tendencia Mais Legivel

- Aumentar altura do grafico (de 250px para 300px)
- Linhas mais espessas
- Area preenchida sob a linha de custo planejado (semi-transparente)
- Pontos de dados mais visiveis
- Remover grid excessivo, manter apenas linhas horizontais
- Tooltip mais rico com informacoes detalhadas

### 5. Secao de Equipe Melhorada

- Adicionar borda sutil e sombra ao card
- Mostrar horas alocadas junto ao avatar
- Indicador visual de carga (barra pequena sob avatar)

### 6. Parcelas de Pagamento Compactas

- Transformar em timeline visual ao inves de tabela
- Status com icones coloridos
- Proxima parcela em destaque

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/projects/detail/ProjectOverviewTab.tsx` | Redesign dos cards de metricas |
| `src/components/projects/detail/ProjectCostBreakdownChart.tsx` | Donut com valor central, legendas melhores |
| `src/components/projects/detail/ProjectPaymentsChart.tsx` | Progress bar ao inves de barras horizontais |
| `src/components/projects/detail/ProjectTrendChart.tsx` | Area chart, linhas mais grossas |
| `src/components/projects/detail/ProjectTeamSection.tsx` | Layout mais informativo |

## Detalhes Tecnicos

### Cards de Metricas (ProjectOverviewTab)

```tsx
// Card com estilo unificado e destaque no valor
<Card className="relative overflow-hidden">
  <CardContent className="pt-4 pb-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Contrato
        </p>
        <p className="text-2xl font-bold mt-1">
          {formatCurrency(value)}
        </p>
      </div>
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <FileText className="h-4 w-4 text-primary" />
      </div>
    </div>
  </CardContent>
</Card>
```

### Donut com Valor Central (ProjectCostBreakdownChart)

```tsx
// Centro do donut com valor total
<PieChart>
  <Pie innerRadius={60} outerRadius={90}>...</Pie>
  {/* Label personalizado no centro */}
  <text x="50%" y="45%" textAnchor="middle" className="text-xs fill-muted-foreground">
    Total
  </text>
  <text x="50%" y="55%" textAnchor="middle" className="text-lg font-bold fill-foreground">
    R$ 19.5k
  </text>
</PieChart>
```

### Progress Bar de Recebimentos (ProjectPaymentsChart)

```tsx
// Barra de progresso segmentada
<div className="h-4 rounded-full overflow-hidden flex bg-muted">
  <div className="bg-green-500" style={{ width: `${receivedPercent}%` }} />
  <div className="bg-amber-400" style={{ width: `${pendingPercent}%` }} />
  <div className="bg-red-500" style={{ width: `${overduePercent}%` }} />
</div>
```

### Area Chart para Tendencia (ProjectTrendChart)

```tsx
// Usar AreaChart ao inves de apenas LineChart
<AreaChart>
  <Area 
    type="monotone" 
    dataKey="planejado" 
    fill="hsl(var(--chart-1))" 
    fillOpacity={0.1}
    stroke="hsl(var(--chart-1))"
    strokeWidth={2}
  />
  ...
</AreaChart>
```

## Layout Final Esperado

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  TABS: [Visao Geral] [Custos] [Financeiro] [Stakeholders] [Cronograma]          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ CONTRATO │  │CUSTO PLAN│  │  MARGEM  │  │ RECEBIDO │  │ PENDENTE │          │
│  │ R$40.8k  │  │ R$19.5k  │  │   52%    │  │   R$0    │  │ R$40.8k  │          │
│  │          │  │          │  │ ▲Saudável│  │          │  │          │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                                  │
│  ┌──────────────────────────────┐  ┌────────────────────────────────┐          │
│  │ COMPOSICAO DE CUSTOS         │  │ RECEBIMENTOS                   │          │
│  │                              │  │                                 │          │
│  │      ┌───────────┐           │  │ ┌─────────────────────────────┐│          │
│  │     /    Total    \          │  │ │░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ││          │
│  │    │   R$ 19.5k    │         │  │ └─────────────────────────────┘│          │
│  │     \             /          │  │  R$ 0 de R$ 40.800,00 (0%)     │          │
│  │      └───────────┘           │  │                                 │          │
│  │ ● Mão de Obra: 77%           │  │ ● Recebido  ● Pendente ● Atras. │          │
│  │ ● Fornecedores: 23%          │  │   R$ 0        R$ 40.8k   R$ 0   │          │
│  └──────────────────────────────┘  └────────────────────────────────┘          │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ CURVA DE TENDENCIA                                                        │  │
│  │ ████████████████████████████████████████████████████████████████████████ │  │
│  │ Grafico de area com linha de tendencia clara e area preenchida           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ EQUIPE DO PROJETO (1 membro)                              [+ Adicionar]  │  │
│  │ ┌──────────┐                                                              │  │
│  │ │   VC     │  Victor Costa                                                │  │
│  │ │ 40h/mes  │  Desenvolvedor                                               │  │
│  │ └──────────┘                                                              │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ PARCELAS DE PAGAMENTO                                                     │  │
│  │ Mensal • 2 parcela(s) • Vencimento dia 26                                 │  │
│  │ ─────────────────────────────────────────────────────────────────────────│  │
│  │ Tabela de parcelas                                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Paleta de Cores Aplicada

| Elemento | Cor | Variavel CSS |
|----------|-----|--------------|
| Mao de Obra | Pine Teal | --chart-1 |
| Fornecedores | Celadon | --chart-2 |
| Materiais | Amber Gold | --chart-3 |
| Recebido | Verde | emerald-500 |
| Pendente | Amarelo | amber-400 |
| Atrasado | Vermelho | red-500 |
| Margem Positiva | Verde | green-600 |
| Margem Negativa | Vermelho | red-600 |

## Espacamento e Gaps

- Espacamento entre secoes: `space-y-4` (16px) ao inves de `space-y-6` (24px)
- Altura dos cards de metricas: compactos com `pt-4 pb-4`
- Altura dos graficos: 220px (menor) com mais informacao
- Grid de cards: `gap-3` para manter tudo mais unido

