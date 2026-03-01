
# Fix: Pipeline Ativo not counting leads with linked budgets

## Problem
The pipeline KPI only looks at `l.estimated_value` to determine if a lead has a value and to sum the pipeline total. However, leads that have gone through the "Proposta" stage have a linked budget with `budget.final_total` -- the `estimated_value` field on the lead itself may still be 0.

This is the same pattern already used elsewhere in the hook (e.g., avgTicket and revenueByMonth calculations), where `budget.final_total` is prioritized over `estimated_value`.

## Solution

Update `src/hooks/useCommercialDashboard.ts` (lines 94-98) to use the same value resolution logic: prioritize `budget.final_total` when available, fall back to `estimated_value`.

### Change

```typescript
// Before (line 95-96)
const pipelineLeadsWithBudget = pipelineLeads.filter(l => (l.estimated_value || 0) > 0);
const activePipeline = pipelineLeadsWithBudget.reduce((sum, l) => sum + l.estimated_value, 0);

// After
const getLeadValue = (l: LeadWithBudget) => 
  (l.budget?.final_total && l.budget.final_total > 0) ? l.budget.final_total : l.estimated_value;
const pipelineLeadsWithBudget = pipelineLeads.filter(l => getLeadValue(l) > 0);
const activePipeline = pipelineLeadsWithBudget.reduce((sum, l) => sum + getLeadValue(l), 0);
```

This is a single-file change (3 lines) in `src/hooks/useCommercialDashboard.ts`. No other files need modification since the props and UI already handle the values correctly.
