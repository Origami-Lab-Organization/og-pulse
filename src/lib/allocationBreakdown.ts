import type {
  AllocationCell,
  AllocationProjectOption,
  ManagerByProject,
  MonthBreakdown,
  OwnerSlice,
} from '@/types/allocation';

export function buildManagerByProject(projects: AllocationProjectOption[]): ManagerByProject {
  return new Map(projects.map((project) => [project.id, { managerId: project.managerId, managerName: project.managerName }]));
}

/**
 * Decompõe o mês na ótica de PLANEJAMENTO: capacidade × planejado, separando o que está
 * sob a lente do gestor e o que está com outros GPs. Horas realizadas/lançadas não entram —
 * acompanhamento de lançamento é outra visão.
 */
export function buildMonthBreakdown(
  cell: AllocationCell | undefined,
  lensManagerId: string | undefined,
  managerByProject: ManagerByProject,
): MonthBreakdown {
  const capacityHours = Math.round(Number(cell?.capacityHours ?? 0));
  const plannedHours = Math.round(Number(cell?.plannedHours ?? 0));

  const mine: OwnerSlice[] = [];
  const others: OwnerSlice[] = [];

  (cell?.projects ?? []).forEach((pill) => {
    const hours = Math.round(Number(pill.plannedHours ?? 0));
    if (hours <= 0) return;
    const owner = managerByProject.get(pill.id);
    const slice: OwnerSlice = {
      projectId: pill.id,
      projectName: pill.name,
      managerId: owner?.managerId ?? null,
      managerName: owner?.managerName ?? null,
      hours,
    };
    if (lensManagerId && owner?.managerId === lensManagerId) {
      mine.push(slice);
    } else {
      others.push(slice);
    }
  });

  mine.sort((a, b) => b.hours - a.hours);
  others.sort((a, b) => b.hours - a.hours);

  const mineHours = mine.reduce((sum, slice) => sum + slice.hours, 0);
  const detailedOthers = others.reduce((sum, slice) => sum + slice.hours, 0);
  const othersHours = Math.max(detailedOthers, plannedHours - mineHours);

  return {
    capacityHours,
    plannedHours,
    mineHours,
    othersHours,
    freeHours: Math.max(0, capacityHours - plannedHours),
    overflowHours: Math.max(0, plannedHours - capacityHours),
    utilization: capacityHours > 0 ? Math.round((plannedHours / capacityHours) * 100) : null,
    mine,
    others,
  };
}
