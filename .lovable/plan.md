
# Fix: Pipeline por Etapa card showing empty when lead values are zero

## Problem
The `useCommercialDashboard` hook filters out pipeline stages where the total value is 0 (`.filter(s => s.value > 0)`). When leads don't have `estimated_value` set, the chart data array is empty and the component renders a blank donut with "Total R$ 0,00".

## Solution

### 1. Update the hook (`src/hooks/useCommercialDashboard.ts`)
- Remove the `.filter(s => s.value > 0)` from `pipelineByStage` so all stages with leads are included (even if value is 0)
- Filter only stages that have at least one lead: `.filter(s => s.count > 0)`
- Add a new boolean `pipelineAllZeroValues` to indicate when there are leads but all values are zero

### 2. Rewrite the chart component (`src/components/commercial/PipelineDonutChart.tsx`)
- Add a new prop `pipelineAllZeroValues` (or compute it internally from data)
- When all values are zero but counts exist:
  - Show a donut/bar chart based on **count** instead of value
  - Display a warning label: "Valores nao informados"
  - Center text shows total lead count instead of R$ 0,00
- When values exist: show the current donut chart by value (existing behavior)
- When no leads at all: show a friendly empty state message ("Nenhum lead ativo no pipeline")

### 3. Update the dashboard page (`src/pages/CommercialDashboard.tsx`)
- Pass the new prop to `PipelineDonutChart` if needed

## Technical Details

In `useCommercialDashboard.ts`, change line ~139:
```typescript
// Before
}).filter(s => s.value > 0);

// After  
}).filter(s => s.count > 0);
```

In `PipelineDonutChart.tsx`, detect if all values are zero and switch `dataKey` to `count`:
```typescript
const allZeroValues = data.length > 0 && data.every(d => d.value === 0);
// Use dataKey="count" when allZeroValues is true
// Show warning text and adjust center label accordingly
```

Also handle the truly empty case (no leads at all) with a centered message.
