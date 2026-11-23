/** Período de lançamento do projeto (US-0030, `src/lib/projectPeriod.ts`). Datas `yyyy-MM-dd`. */
export interface ProjectPeriod {
  startDate?: string | null;
  endDate?: string | null;
  isContinuous?: boolean | null;
}
