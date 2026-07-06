export type AllocationStatusKey =
  | 'unallocated'
  | 'idle'
  | 'healthy'
  | 'limit'
  | 'critical';

export type AllocationStatusFilter = 'all' | 'abovePlan' | 'missingLogs' | 'overloaded' | 'unallocated';

export interface AllocationMonth {
  key: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  label: string;
  workingDays: number;
}

export interface AllocationProjectPill {
  id: string;
  code: string;
  name: string;
  hours: number;
  plannedHours?: number;
  actualHours?: number;
}

export interface AllocationCell {
  monthKey: string;
  plannedHours: number;
  actualProjectHours: number;
  internalHours: number;
  totalHours: number;
  capacityHours: number;
  utilization: number | null;
  status: AllocationStatusKey;
  projects: AllocationProjectPill[];
}

export interface AllocationPerson {
  id: string;
  name: string;
  role: string;
  status: string;
  hireDate: string | null;
  terminationDate: string | null;
  dailyHours: number;
  cells: Record<string, AllocationCell>;
}

export interface AllocationFiltersState {
  status: AllocationStatusFilter;
  role: string;
  projectId: string;
  search: string;
  showTerminated: boolean;
}

export interface AllocationProjectOption {
  id: string;
  name: string;
  managerId: string | null;
  managerName: string | null;
}

export interface AllocationGridData {
  months: AllocationMonth[];
  people: AllocationPerson[];
  roles: string[];
  projects: AllocationProjectOption[];
}

export interface AllocationMetrics {
  overloaded: number | null;
  unallocated: number | null;
  avgUtilization: number | null;
  availableHours: number | null;
  activeMembers: number | null;
}

export interface AllocationPanelProjectRow {
  projectId: string;
  projectMemberId: string;
  monthKey: string;
  monthNumber: number;
  projectName: string;
  clientName: string;
  subtitle: string;
  plannedHours: number;
  actualHours: number;
}

export interface AllocationPanelMonthData {
  month: AllocationMonth;
  projects: AllocationPanelProjectRow[];
  plannedHours: number;
  actualHours: number;
}

export interface AllocationPanelData {
  employee: Pick<AllocationPerson, 'id' | 'name' | 'role' | 'status' | 'hireDate' | 'terminationDate' | 'dailyHours'>;
  months: AllocationPanelMonthData[];
}
