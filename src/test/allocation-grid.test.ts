import { describe, expect, it } from 'vitest';
import {
  calculateMetrics,
  filterAllocationPeople,
  getAllocationStatus,
  sortByReferencePlanVariance,
} from '@/lib/allocationGrid';
import { AllocationPerson } from '@/types/allocation';

function person(id: string, name: string, role: string, plannedHours: number, loggedHours: number, capacityHours: number, projectId = 'p-1'): AllocationPerson {
  const utilization = capacityHours > 0 ? Math.round((loggedHours / capacityHours) * 100) : null;

  return {
    id,
    name,
    role,
    status: 'ativo',
    hireDate: null,
    terminationDate: null,
    dailyHours: 8,
    cells: {
      '2026-06': {
        monthKey: '2026-06',
        plannedHours,
        actualProjectHours: loggedHours,
        internalHours: 0,
        totalHours: loggedHours,
        capacityHours,
        utilization,
        status: getAllocationStatus(utilization),
        projects: plannedHours > 0 || loggedHours > 0
          ? [{ id: projectId, code: 'ATL', name: 'Atlas', hours: loggedHours, plannedHours, actualHours: loggedHours }]
          : [],
      },
    },
  };
}

describe('allocationGrid', () => {
  it('classifica status por faixa de utilização', () => {
    expect(getAllocationStatus(18)).toBe('unallocated');
    expect(getAllocationStatus(48)).toBe('idle');
    expect(getAllocationStatus(83)).toBe('healthy');
    expect(getAllocationStatus(107)).toBe('limit');
    expect(getAllocationStatus(130)).toBe('critical');
    expect(getAllocationStatus(null)).toBe('unallocated');
  });

  it('filtra pessoas com lógica AND e ordena por maior desvio do plano', () => {
    const people = [
      person('1', 'Daniel Reis', 'Tech Lead', 160, 180, 168, 'p-1'),
      person('2', 'Cecilia Pacheco', 'GP', 140, 140, 168, 'p-2'),
      person('3', 'Renata Vidal', 'Designer', 30, 0, 168, 'p-1'),
    ];

    const filtered = filterAllocationPeople(
      people,
      {
        status: 'missingLogs',
        role: 'Designer',
        projectId: 'p-1',
        search: 'renata',
        showTerminated: false,
      },
      '2026-06',
    );

    expect(filtered.map((item) => item.name)).toEqual(['Renata Vidal']);
    expect(sortByReferencePlanVariance(people, '2026-06').map((item) => item.name)).toEqual([
      'Renata Vidal',
      'Daniel Reis',
      'Cecilia Pacheco',
    ]);
  });

  it('calcula os cinco cards de planejado vs lançado sobre o escopo filtrado', () => {
    const metrics = calculateMetrics(
      [
        person('1', 'Daniel Reis', 'Tech Lead', 160, 180, 168),
        person('2', 'Cecilia Pacheco', 'GP', 140, 140, 168),
        person('3', 'Ana Lima', 'Designer', 80, 0, 168),
      ],
      '2026-06',
    );

    expect(metrics.plannedHours).toBe(380);
    expect(metrics.loggedHours).toBe(320);
    expect(metrics.varianceHours).toBe(-60);
    expect(metrics.offPlanMembers).toBe(2);
    expect(metrics.missingLogs).toBe(1);
  });

  it('exibe métricas vazias sem NaN quando não há pessoas', () => {
    expect(calculateMetrics([], '2026-06')).toEqual({
      plannedHours: null,
      loggedHours: null,
      varianceHours: null,
      offPlanMembers: null,
      missingLogs: null,
    });
  });
});
