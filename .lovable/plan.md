
# Reorganizar abas Visao Geral e Financeiro do Projeto

## Problemas identificados

### 1. Aba Financeiro nao permite gerenciar NF/Recebimentos
A aba "Financeiro" em execucao mostra apenas KPIs de custos e graficos. Nao ha como lancar emissao de NF ou registrar recebimento. O componente `ProjectInstallmentsTable` (que permite editar status, numero NF, datas e valores) existe mas so e usado na aba "Visao Geral" em modo somente leitura.

### 2. Analytics misturados com dados operacionais
A aba "Visao Geral" em execucao contem graficos (composicao de custos, recebimentos, tendencia), KPIs financeiros e tabela de parcelas. O usuario quer que os analytics fiquem na Visao Geral e o gerenciamento financeiro fique na aba Financeiro.

### 3. Calculos incorretos na Visao Geral
- Usa `salarioMensal + beneficios + encargos + toolsCost` em vez de `total_monthly_cost_estimated`
- Usa constante `HOURS_PER_MONTH = 176` em vez de `employee.jornada_mensal`

## Plano de mudancas

### Passo 1 - Reestruturar aba "Visao Geral" (execucao)
Arquivo: `src/components/projects/detail/ProjectOverviewTab.tsx`

Manter apenas conteudo analitico/dashboard:
- 5 cards de KPIs (Contrato, Custo Planejado, Margem, Recebido, Pendente)
- Grafico de Composicao de Custos (pie chart)
- Grafico de Recebimentos (barra de progresso)
- Grafico de Tendencia (area chart)
- Equipe do Projeto

**Remover**: a tabela de "Parcelas de Pagamento" (sera movida para Financeiro)

**Corrigir calculos**:
- Trocar `salarioMensal + beneficios + encargos + toolsCost` por `total_monthly_cost_estimated`
- Trocar `HOURS_PER_MONTH = 176` por `employee.jornada_mensal`

### Passo 2 - Reestruturar aba "Financeiro" (execucao)
Arquivo: `src/components/projects/detail/ProjectFinancialTab.tsx`

Reescrever para conter:
- KPIs financeiros (Receita, Custo Planejado, Margem Bruta, Margem %)
- Tabela editavel de parcelas usando o componente `ProjectInstallmentsTable` existente (permite editar status, NF, datas, valores)
- Grafico Planejado vs Realizado (ja existente)

**Corrigir calculos**: usar `total_monthly_cost_estimated / jornada_mensal` (ja esta correto neste arquivo)

### Passo 3 - Garantir consistencia no planejamento
Arquivo: `src/components/projects/detail/ProjectExpectedResultTab.tsx`

Manter como esta - ja permite editar data de emissao NF na `PlanningInstallmentsTable`.

## Resumo das mudancas por arquivo

| Arquivo | Acao |
|---------|------|
| `ProjectOverviewTab.tsx` | Remover tabela de parcelas; corrigir calculo de custos |
| `ProjectFinancialTab.tsx` | Adicionar `ProjectInstallmentsTable` editavel; reorganizar KPIs para foco em receita/margem |

## Detalhes tecnicos

### Correcao de custo na OverviewTab
```text
// ANTES (incorreto)
const totalCost = employee.salarioMensal + employee.beneficios + employee.encargos + (employee.totalToolsCost || 0);
const hourlyCost = totalCost / 176;

// DEPOIS (correto)
const totalCost = employee.total_monthly_cost_estimated || 0;
const hourlyCost = totalCost / (employee.jornada_mensal || 168);
```

### Adicao de parcelas editaveis na FinancialTab
Importar e usar o `ProjectInstallmentsTable` existente que ja suporta:
- Editar status (Pendente, NF Emitida, Recebido, Atrasado)
- Numero da NF
- Data de emissao
- Data de pagamento
- Valor da parcela
