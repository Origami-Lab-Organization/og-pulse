import { describe, expect, it } from 'vitest';
import {
  calculatePlannedLaborCost,
  calculatePlannedLaborCostByProjectMonth,
} from '@/lib/roleAllocationCosts';
import { ProjectAllocation } from '@/types/equipe.types';

function allocation(overrides: Partial<ProjectAllocation>): ProjectAllocation {
  return {
    employeeId: 'emp-1',
    employee: {
      id: 'emp-1',
      nome: 'Fernanda Lima',
      cargo: 'Consultora',
    },
    budgetRoleId: null,
    budgetRole: null,
    customRoleName: 'Consultora',
    roleName: 'Consultora',
    monthlyHours: [],
    totalHours: 0,
    ...overrides,
  };
}

describe('calculatePlannedLaborCost', () => {
  it('prioriza snapshot mensal de project_role_allocations', () => {
    const result = calculatePlannedLaborCost(
      [
        allocation({
          monthlyHours: [
            { year: 2026, month: 6, plannedHours: 10, costPerHour: 100 },
            { year: 2026, month: 7, plannedHours: 5, costPerHour: 80 },
          ],
        }),
      ],
      { 'emp-1': { jornadaDiaria: 8, monthlyCostEstimated: 8800 } },
    );

    expect(result.laborCost).toBe(1400);
    expect(result.costByEmployee['emp-1']).toBe(1400);
  });

  it('usa fallback do colaborador quando o snapshot mensal não existe', () => {
    const result = calculatePlannedLaborCost(
      [
        allocation({
          monthlyHours: [
            { year: 2026, month: 6, plannedHours: 10, costPerHour: null },
          ],
        }),
      ],
      { 'emp-1': { jornadaDiaria: 8, monthlyCostEstimated: 13200 } },
    );

    // R$13.200 / (8h × 22 dias úteis de junho/2026) = R$75/h × 10h
    expect(result.laborCost).toBe(750);
  });
});

describe('calculatePlannedLaborCostByProjectMonth', () => {
  it('distribui custo planejado pelo mês relativo ao início do projeto', () => {
    const result = calculatePlannedLaborCostByProjectMonth(
      [
        allocation({
          monthlyHours: [
            { year: 2026, month: 6, plannedHours: 10, costPerHour: 100 },
            { year: 2026, month: 7, plannedHours: 5, costPerHour: 80 },
          ],
        }),
      ],
      {},
      new Date(2026, 5, 1),
      2,
    );

    expect(result.get(1)).toBe(1000);
    expect(result.get(2)).toBe(400);
  });

  it('ignora alocações fora da duração do projeto', () => {
    const result = calculatePlannedLaborCostByProjectMonth(
      [
        allocation({
          monthlyHours: [
            { year: 2026, month: 5, plannedHours: 10, costPerHour: 100 },
            { year: 2026, month: 8, plannedHours: 10, costPerHour: 100 },
          ],
        }),
      ],
      {},
      new Date(2026, 5, 1),
      2,
    );

    expect(result.size).toBe(0);
  });
});
