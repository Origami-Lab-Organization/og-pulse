/** Custo do projeto pela regra única (US-0025, `src/lib/projectCostSummary.ts`). */
export interface ProjectCostSummary {
  laborPlanned: number;
  laborActual: number;
  /** Custos do ledger `project_costs` (todas as categorias, em BRL). */
  otherPlanned: number;
  otherActual: number;
  totalPlanned: number;
  totalActual: number;
}
