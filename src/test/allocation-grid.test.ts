import { describe, expect, it } from 'vitest';
import {
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

    const referenceMonth = {
      key: '2026-06',
      year: 2026,
      month: 6,
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      label: 'JUN',
      workingDays: 22,
      workingDaysElapsed: 22,
    };

    const filtered = filterAllocationPeople(
      people,
      {
        status: 'missingLogs',
        role: 'Designer',
        projectId: 'p-1',
        search: 'renata',
        showTerminated: false,
      },
      referenceMonth,
    );

    expect(filtered.map((item) => item.name)).toEqual(['Renata Vidal']);
    expect(sortByReferencePlanVariance(people, '2026-06').map((item) => item.name)).toEqual([
      'Renata Vidal',
      'Daniel Reis',
      'Cecilia Pacheco',
    ]);
  });
});
