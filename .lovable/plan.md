

# Fix: Pipeline Ativo KPI - Business Logic and Sub-labels

## Problem
The "Pipeline Ativo" KPI shows R$ 0,00 because it sums `estimated_value` from all active leads, but leads in "Triagem" and "Qualificacao" typically don't have values set yet. The card also lacks context about what the value represents.

## Solution

### 1. Hook (`src/hooks/useCommercialDashboard.ts`)
- Change pipeline calculation to only sum leads with `estimated_value > 0` (effectively Proposta + Negociacao stages)
- Add a new field `pipelineLeadsWithBudgetCount` counting how many leads have value > 0
- Add a boolean `pipelineHasNoProposals` for when zero leads have reached Proposta stage with a value
- Remove the old `pipelineHasLeadsWithoutValue` field (replaced by new contextual info)

### 2. KPI Component (`src/components/commercial/CommercialKPIs.tsx`)
- Update the Props interface to receive `pipelineLeadsWithBudgetCount` and `pipelineHasNoProposals`
- For the Pipeline Ativo card, display a sub-label:
  - If leads with budget exist: "Baseado em N leads com orcamento definido"
  - If no leads have budget (value is R$ 0,00): "Nenhum orcamento gerado no periodo"

### 3. Dashboard Page (`src/pages/CommercialDashboard.tsx`)
- Pass the new props to `CommercialKPIs`

## Technical Details

In the hook, the pipeline calculation changes from:
```typescript
const pipelineLeads = activeLeadsYear.filter(l => l.crm_stage !== 'closed');
const activePipeline = pipelineLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
```
To:
```typescript
const pipelineLeads = activeLeadsYear.filter(l => l.crm_stage !== 'closed');
const pipelineLeadsWithBudget = pipelineLeads.filter(l => l.estimated_value > 0);
const activePipeline = pipelineLeadsWithBudget.reduce((sum, l) => sum + l.estimated_value, 0);
const pipelineLeadsWithBudgetCount = pipelineLeadsWithBudget.length;
const pipelineHasNoProposals = pipelineLeadsWithBudgetCount === 0 && pipelineLeads.length > 0;
```

The KPI card renders conditionally:
- Value > 0: Shows value + "Baseado em N leads com orcamento definido"
- Value = 0 with active leads: Shows "R$ 0,00" + "Nenhum orcamento gerado no periodo"
- No leads at all: Shows "R$ 0,00" with no sub-label
