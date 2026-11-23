import type { ProjectCostCategory, ProjectCostDB, ProjectMemberMonthDB, ProjectWithRelations } from '@/types/project';
import type { Holiday } from '@/types/holiday';
import type { ProjectAllocation } from '@/types/equipe.types';
import type { ProjectTimesheetDB } from '@/hooks/useProjectTimesheets';

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

/** Custo de um mês separado em mão de obra e categorias do ledger. */
export interface CostBucket {
  labor: number;
  byCategory: Partial<Record<ProjectCostCategory, number>>;
}

/** Um mês de calendário do custo do projeto (US-0026, `src/lib/projectMonthlyCosts.ts`). */
export interface ProjectCostMonth {
  /** `yyyy-MM`. */
  key: string;
  /** Primeiro dia do mês. */
  date: Date;
  /** Mês fora do período do projeto, aberto só porque há lançamento nele. */
  outOfPeriod: boolean;
  planned: CostBucket;
  realized: CostBucket;
}

/** Valor datado: entra no mês de calendário da data. */
export interface DatedCost {
  date: Date;
  cost: number;
}

/** Dados já carregados de um projeto para calcular o custo dele (`computeProjectCosts`). */
export interface ProjectCostInputs {
  project: Pick<ProjectWithRelations, 'start_date' | 'end_date' | 'is_continuous' | 'duration_months' | 'members'>;
  allocations: ProjectAllocation[];
  memberMonths: ProjectMemberMonthDB[];
  timesheets: ProjectTimesheetDB[];
  costs: ProjectCostDB[];
  holidays: Holiday[];
}
