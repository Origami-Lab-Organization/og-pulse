
# Dashboard Executivo - Visao Geral do Projeto

## Objetivo
Transformar a aba "Visao Geral" (em projetos em execucao) em um painel profissional que permite ao gerente de projetos avaliar a saude do projeto em uma unica tela, consolidando informacoes de todas as dimensoes: projeto, OKRs, custos, cronograma e financeiro.

## Layout Proposto

O dashboard sera organizado em secoes compactas e visuais, sem graficos pesados -- focado em indicadores rapidos com semaforos de saude.

```text
+---------------------------------------------------------------+
| FAIXA DE KPIs FINANCEIROS (5 cards compactos)                 |
| Contrato | Custo Plan. | Margem | Recebido | Pendente         |
+---------------------------------------------------------------+
|                                                                |
| +---------------------------+  +----------------------------+  |
| | SAUDE DO PROJETO          |  | OKRs                       |  |
| | Indicador geral com       |  | Progresso medio dos OKRs   |  |
| | semaforo (verde/amarelo/  |  | Lista resumida: O1 45%     |  |
| | vermelho) baseado nas     |  |                O2 80%     |  |
| | 4 dimensoes               |  | Confianca predominante     |  |
| +---------------------------+  +----------------------------+  |
|                                                                |
| +---------------------------+  +----------------------------+  |
| | CRONOGRAMA                |  | CUSTOS                     |  |
| | Marcos: 3/5 concluidos    |  | Mao de Obra: Plan vs Real  |  |
| | Proximo marco + data      |  | Fornecedores: Plan vs Real |  |
| | Marcos atrasados (alert)  |  | Materiais: Plan vs Real    |  |
| +---------------------------+  +----------------------------+  |
|                                                                |
| +---------------------------+  +----------------------------+  |
| | FINANCEIRO                |  | EQUIPE                     |  |
| | Faturado vs Total         |  | Membros alocados + horas   |  |
| | Parcelas atrasadas        |  | (componente existente)     |  |
| | Barra de progresso receita|  |                            |  |
| +---------------------------+  +----------------------------+  |
+---------------------------------------------------------------+
```

## Detalhes de cada secao

### 1. Faixa de KPIs financeiros (manter existente)
Os 5 cards ja existentes no topo: Contrato, Custo Planejado, Margem, Recebido, Pendente. Sem alteracoes.

### 2. Card "Saude do Projeto"
Indicador visual consolidado com 4 dimensoes, cada uma com semaforo (icone colorido):
- **OKRs**: verde se progresso medio >= 70%, amarelo >= 40%, vermelho < 40%
- **Cronograma**: verde se 0 marcos atrasados, amarelo se 1, vermelho se > 1
- **Custos**: verde se custo real <= 100% do planejado, amarelo <= 110%, vermelho > 110%
- **Financeiro**: verde se sem parcelas vencidas, amarelo se 1 atrasada, vermelho se > 1

Indicador geral: verde se todas verdes, amarelo se alguma amarela, vermelho se alguma vermelha.

### 3. Card "OKRs" (resumo)
- Progresso medio de todos os OKRs (barra de progresso)
- Lista compacta: ate 5 OKRs mostrando nome + percentual + badge de status
- Nivel de confianca predominante dos Key Results

### 4. Card "Cronograma" (resumo)
- Contagem: X de Y marcos concluidos
- Barra de progresso de conclusao
- Proximo marco pendente (titulo + data limite)
- Alerta se houver marcos atrasados

### 5. Card "Custos" (resumo planejado vs realizado)
- 3 linhas compactas: Mao de Obra, Fornecedores, Materiais
- Cada linha: valor planejado | valor real | indicador % (verde/vermelho)
- Total consolidado

### 6. Card "Financeiro" (resumo de faturamento)
- Barra de progresso: valor recebido / valor contrato
- Quantidade e valor de parcelas atrasadas
- Proxima parcela pendente (valor + vencimento)

### 7. Equipe do Projeto (manter existente)
Componente `ProjectTeamSection` ja existente, sem alteracoes.

## Dados necessarios (hooks)
- `useProjectOKRs(project.id)` -- ja disponivel
- `useProjectMilestones(project.id)` -- ja disponivel
- Custos reais: reutilizar logica do `ProjectCostsTab` (timesheets, supplier actuals, materials realizados)
  - `useProjectMemberMonths` para horas planejadas
  - `useTimesheetsByMembers` para horas reais
  - `useProjectSupplierMonths` para fornecedores planejados
  - `useProjectSupplierActuals` para fornecedores reais
- Parcelas (installments) ja vem no `project.installments`

## Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/projects/detail/ProjectOverviewTab.tsx` | Reescrever completamente para o novo layout dashboard |

Nenhum arquivo novo sera criado -- toda a logica ficara no componente existente, importando os hooks necessarios.

## Detalhes tecnicos

### Calculo de saude por dimensao
```text
// OKRs
const avgProgress = okrs.reduce((sum, o) => sum + o.progress_percent, 0) / okrs.length;
const okrHealth = avgProgress >= 70 ? 'green' : avgProgress >= 40 ? 'yellow' : 'red';

// Cronograma
const delayedCount = milestones.filter(m => m.status === 'delayed').length;
const scheduleHealth = delayedCount === 0 ? 'green' : delayedCount === 1 ? 'yellow' : 'red';

// Custos (totalActual vs totalPlanned)
const costRatio = totalPlanned > 0 ? totalActual / totalPlanned : 0;
const costHealth = costRatio <= 1.0 ? 'green' : costRatio <= 1.1 ? 'yellow' : 'red';

// Financeiro (parcelas atrasadas)
const overdueCount = installments.filter(i => i.status === 'overdue').length;
const finHealth = overdueCount === 0 ? 'green' : overdueCount === 1 ? 'yellow' : 'red';
```

### Hooks adicionais a importar
```text
import { useProjectOKRs } from '@/hooks/useProjectOKRs';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useTimesheetsByMembers } from '@/hooks/useProjectTimesheets';
import { useProjectSupplierActuals } from '@/hooks/useProjectSupplierActuals';
```

### Semaforo visual
Usar circulos coloridos (verde/amarelo/vermelho) com icones lucide:
- Verde: `CheckCircle2` com `text-green-500`
- Amarelo: `AlertTriangle` com `text-amber-500`
- Vermelho: `XCircle` com `text-red-500`
