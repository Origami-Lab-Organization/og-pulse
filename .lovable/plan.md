

## Dashboard Comercial -- Indicadores e Estrutura

### Objetivo

Criar uma pagina de inteligencia comercial em `/comercial` que consolida dados de Leads, Orcamentos, Clientes e Arquivados, oferecendo visao estrategica para gestores.

---

### Layout da Pagina (3 secoes verticais)

```text
+----------------------------------------------------------+
|  [Filtro: Ano]   [Filtro: Linha de Servico]              |
+----------------------------------------------------------+
|  KPI 1  |  KPI 2  |  KPI 3  |  KPI 4  |  KPI 5         |
+----------------------------------------------------------+
|                                                          |
|  Funil de Conversao (horizontal bar)                     |
|  Triagem -> Qualificacao -> Proposta -> Negociacao -> Won |
|                                                          |
+--------------------------+-------------------------------+
|  Receita Acumulada       |  Pipeline por Etapa           |
|  (Area chart mensal:     |  (Donut chart c/ valores      |
|   Ganho vs Perdido       |   por stage)                  |
|   acumulado)             |                               |
+--------------------------+-------------------------------+
|  Top 5 Clientes          |  Motivos de Perda             |
|  por receita             |  (Horizontal bar chart        |
|  (Bar chart)             |   dos archive_reasons)        |
+--------------------------+-------------------------------+
|  Leads Recentes (tabela compacta, 5 ultimos)             |
+----------------------------------------------------------+
```

---

### KPIs (5 cards no topo)

| # | Nome | Calculo | Icone |
|---|------|---------|-------|
| 1 | **Taxa de Conversao** | (leads closed / total leads criados no ano) x 100 | Percent |
| 2 | **Ticket Medio** | Soma valor ganho / qtd leads closed | Receipt |
| 3 | **Ciclo Medio de Venda** | Media de dias entre created_at e closed_at dos leads fechados | Clock |
| 4 | **Pipeline Ativo** | Soma do valor de leads em proposal + negotiation | TrendingUp |
| 5 | **Leads Novos no Mes** | Contagem de leads criados no mes corrente | UserPlus |

---

### Graficos Detalhados

**1. Funil de Conversao (Horizontal Bar)**
- Mostra quantidade de leads por etapa: Triagem, Qualificacao, Proposta, Negociacao, Fechado
- Barras com degradee de cor da etapa
- Exibe a taxa de conversao entre cada etapa

**2. Receita Acumulada Mensal (Area Chart)**
- Eixo X: meses do ano
- Duas series: "Ganho" (leads closed_at no mes, valor do budget) e "Perdido" (leads archived_at no mes, valor estimado)
- Visualizacao acumulada para mostrar tendencia

**3. Pipeline por Etapa (Donut Chart)**
- Distribuicao do valor monetario por stage (screening, qualification, proposal, negotiation)
- Centro do donut: valor total do pipeline
- Tooltips com quantidade de leads e valor

**4. Top 5 Clientes por Receita (Bar Chart Horizontal)**
- Agrupa leads fechados por client/company_name
- Ordena por valor total descendente
- Mostra os 5 maiores

**5. Motivos de Perda (Bar Chart Horizontal)**
- Conta leads arquivados agrupados por archive_reason
- Usa labels amigaveis (ARCHIVE_REASONS)
- Cor vermelha/coral para enfatizar perdas

---

### Tabela de Leads Recentes

- Ultimos 5 leads criados (qualquer stage)
- Colunas: Nome, Empresa, Etapa (badge colorido), Valor, Data Criacao
- Link para o CRM ao clicar

---

### Filtros

- **Ano**: Seletor de ano (padrao: ano corrente)
- **Linha de Servico**: Dropdown com as opcoes de SERVICE_LINE_OPTIONS + "Todas"

---

### Mudancas Tecnicas

**Arquivos criados:**
- `src/pages/CommercialDashboard.tsx` -- pagina principal
- `src/components/commercial/CommercialKPIs.tsx` -- cards de KPIs
- `src/components/commercial/ConversionFunnel.tsx` -- grafico de funil
- `src/components/commercial/RevenueAccumulatedChart.tsx` -- area chart mensal
- `src/components/commercial/PipelineDonutChart.tsx` -- donut chart
- `src/components/commercial/TopClientsChart.tsx` -- bar chart horizontal
- `src/components/commercial/LossReasonsChart.tsx` -- bar chart horizontal
- `src/components/commercial/RecentLeadsTable.tsx` -- tabela compacta
- `src/hooks/useCommercialDashboard.ts` -- hook que agrega todos os dados

**Arquivos modificados:**
- `src/App.tsx` -- nova rota `/comercial` protegida com RoleProtectedRoute requireManager
- `src/components/layout/AppSidebar.tsx` -- remover `disabled: true` do item "Dashboard" em Comercial

**Dependencias:** Usa `recharts` (ja instalado) para todos os graficos.

**Dados:** Todos os calculos sao feitos no frontend, usando os dados ja disponíveis via `useLeads`, `useArchivedLeads`, `useBudgets` e `useClients`. O hook `useCommercialDashboard` orquestra essas queries e deriva os indicadores.

