import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AllocationCell, AllocationFiltersState, AllocationMetrics, AllocationMonth, AllocationPerson, AllocationStatusKey } from '@/types/allocation';
import { countWorkingDays } from '@/lib/workingDays';

const DEFAULT_MINIMUM_UTILIZATION = 40;

interface HolidayLike {
  holiday_type: string;
  fixed_day: number | null;
  fixed_month: number | null;
  specific_date: string | null;
}

export function getAllocationStatus(utilization: number | null, minimum = DEFAULT_MINIMUM_UTILIZATION): AllocationStatusKey {
  if (utilization === null || utilization < minimum) return 'unallocated';
  if (utilization < 70) return 'idle';
  if (utilization <= 100) return 'healthy';
  if (utilization <= 115) return 'limit';
  return 'critical';
}

export function getAllocationStatusLabel(status: AllocationStatusKey) {
  const labels: Record<AllocationStatusKey, string> = {
    unallocated: 'DESALOCADO',
    idle: 'OCIOSO',
    healthy: 'SAUDÁVEL',
    limit: 'LIMITE',
    critical: 'SOBRECARGA CRÍTICA',
  };
  return labels[status];
}

export function getAllocationStatusClasses(status: AllocationStatusKey) {
  const classes: Record<AllocationStatusKey, { text: string; bg: string; soft: string; dot: string }> = {
    unallocated: {
      text: 'text-destructive',
      bg: 'bg-destructive',
      soft: 'bg-destructive/10 text-destructive',
      dot: 'bg-destructive',
    },
    idle: {
      text: 'text-warning',
      bg: 'bg-warning',
      soft: 'bg-warning/10 text-warning',
      dot: 'bg-warning',
    },
    healthy: {
      text: 'text-success',
      bg: 'bg-success',
      soft: 'bg-success/10 text-success',
      dot: 'bg-success',
    },
    limit: {
      text: 'text-warning',
      bg: 'bg-warning',
      soft: 'bg-warning/10 text-warning',
      dot: 'bg-warning',
    },
    critical: {
      text: 'text-destructive',
      bg: 'bg-destructive',
      soft: 'bg-destructive/10 text-destructive',
      dot: 'bg-destructive',
    },
  };
  return classes[status];
}

export function buildAllocationMonths(baseDate: Date, offsetStart: number, length: number, holidays: HolidayLike[] = []): AllocationMonth[] {
  const boundedStart = Math.max(-2, Math.min(4, offsetStart));
  const boundedLength = Math.max(1, Math.min(6, length));

  return Array.from({ length: boundedLength }, (_, index) => {
    const date = addMonths(startOfMonth(baseDate), boundedStart + index);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    return {
      key: format(date, 'yyyy-MM'),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      label: format(date, 'MMM', { locale: ptBR }).replace('.', '').toUpperCase(),
      workingDays: countWorkingDays(start, end, holidays),
    };
  });
}

export function emptyAllocationCell(monthKey: string): AllocationCell {
  return {
    monthKey,
    plannedHours: 0,
    actualProjectHours: 0,
    internalHours: 0,
    totalHours: 0,
    capacityHours: 0,
    utilization: null,
    status: 'unallocated',
    projects: [],
  };
}

export function getLoggedHours(cell: AllocationCell) {
  return Number(cell.actualProjectHours || 0) + Number(cell.internalHours || 0);
}

export function getPlanVariance(cell: AllocationCell) {
  return getLoggedHours(cell) - Number(cell.plannedHours || 0);
}

export function calculateMetrics(people: AllocationPerson[], referenceMonthKey: string): AllocationMetrics {
  if (people.length === 0) {
    return {
      overloaded: null,
      unallocated: null,
      avgUtilization: null,
      availableHours: null,
      activeMembers: null,
    };
  }

  const referenceCells = people.map((person) => person.cells[referenceMonthKey] ?? emptyAllocationCell(referenceMonthKey));

  const overloaded = referenceCells.filter((cell) => cell.status === 'critical').length;
  const unallocated = referenceCells.filter((cell) => cell.status === 'unallocated').length;
  const activeMembers = people.length;

  const cellsWithUtil = referenceCells.filter((cell) => cell.utilization !== null);
  const avgUtilization = cellsWithUtil.length > 0
    ? Math.round(cellsWithUtil.reduce((sum, cell) => sum + (cell.utilization ?? 0), 0) / cellsWithUtil.length)
    : null;

  const availableHours = Math.round(
    referenceCells.reduce((sum, cell) => {
      const spare = Number(cell.capacityHours || 0) - Number(cell.plannedHours || 0);
      return sum + Math.max(0, spare);
    }, 0),
  );

  return { overloaded, unallocated, avgUtilization, availableHours, activeMembers };
}

export function filterAllocationPeople(
  people: AllocationPerson[],
  filters: AllocationFiltersState,
  referenceMonthKey: string,
) {
  const search = filters.search.trim().toLocaleLowerCase('pt-BR');

  return people.filter((person) => {
    const cell = person.cells[referenceMonthKey] ?? emptyAllocationCell(referenceMonthKey);
    const plannedHours = Number(cell.plannedHours || 0);
    const loggedHours = getLoggedHours(cell);
    const matchesTerminated = filters.showTerminated || (person.status !== 'arquivado' && !person.terminationDate);
    const matchesRole = filters.role === 'all' || person.role === filters.role;
    const matchesProject = filters.projectId === 'all' || Object.values(person.cells).some((monthCell) =>
      monthCell.projects.some((project) => project.id === filters.projectId),
    );
    const matchesSearch = !search || person.name.toLocaleLowerCase('pt-BR').includes(search);
    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'abovePlan' && loggedHours > plannedHours) ||
      (filters.status === 'missingLogs' && plannedHours > 0 && loggedHours === 0) ||
      (filters.status === 'overloaded' && cell.status === 'critical') ||
      (filters.status === 'unallocated' && cell.status === 'unallocated');

    return matchesTerminated && matchesRole && matchesProject && matchesSearch && matchesStatus;
  });
}

export function sortByReferencePlanVariance(people: AllocationPerson[], referenceMonthKey: string) {
  return [...people].sort((left, right) => {
    const leftCell = left.cells[referenceMonthKey] ?? emptyAllocationCell(referenceMonthKey);
    const rightCell = right.cells[referenceMonthKey] ?? emptyAllocationCell(referenceMonthKey);
    const leftVariance = Math.abs(getPlanVariance(leftCell));
    const rightVariance = Math.abs(getPlanVariance(rightCell));
    return rightVariance - leftVariance || left.name.localeCompare(right.name, 'pt-BR');
  });
}

export function sortByReferenceUtilization(people: AllocationPerson[], referenceMonthKey: string) {
  return [...people].sort((left, right) => {
    const leftUtilization = left.cells[referenceMonthKey]?.utilization ?? -1;
    const rightUtilization = right.cells[referenceMonthKey]?.utilization ?? -1;
    return rightUtilization - leftUtilization || left.name.localeCompare(right.name, 'pt-BR');
  });
}
