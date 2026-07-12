import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeAllocationPanel } from '@/components/allocation/EmployeeAllocationPanel';
import { AllocationMonth, AllocationPanelData, AllocationPerson } from '@/types/allocation';

const mutateMock = vi.fn();
let panelData: AllocationPanelData | null = null;
let availabilityCapacity = 184;

vi.mock('@amplitude/analytics-browser', () => ({
  track: vi.fn(),
}));

vi.mock('@/hooks/useEmployeeAllocationPanel', () => ({
  useEmployeeAllocationPanel: () => ({
    data: panelData,
    isLoading: false,
  }),
  useSaveEmployeeAllocationPanel: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
  useAllocateEmployeeToProject: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeallocateEmployeeFromProject: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useEmployeeAvailability', () => ({
  useEmployeeAvailability: () => ({
    data: { capacityHours: availabilityCapacity },
    isLoading: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    employee: { id: 'user-1', isAdmin: false },
  }),
}));

const months: AllocationMonth[] = [
  {
    key: '2026-09',
    year: 2026,
    month: 9,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    label: 'SET',
    workingDays: 22,
    workingDaysElapsed: 22,
  },
  {
    key: '2026-10',
    year: 2026,
    month: 10,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    label: 'OUT',
    workingDays: 23,
    workingDaysElapsed: 0,
  },
  {
    key: '2026-11',
    year: 2026,
    month: 11,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    label: 'NOV',
    workingDays: 20,
    workingDaysElapsed: 0,
  },
];

function employee(capacityHours = 184): AllocationPerson {
  return {
    id: 'emp-1',
    name: 'Fernanda Lima',
    role: 'Senior Consultant',
    status: 'ativo',
    hireDate: '2026-01-01',
    terminationDate: null,
    dailyHours: 8,
    cells: {
      '2026-09': {
        monthKey: '2026-09',
        plannedHours: 184,
        actualProjectHours: 184,
        internalHours: 0,
        totalHours: 184,
        capacityHours,
        utilization: 100,
        status: 'healthy',
        projects: [],
      },
      '2026-10': {
        monthKey: '2026-10',
        plannedHours: 240,
        actualProjectHours: 114,
        internalHours: 0,
        totalHours: 240,
        capacityHours,
        utilization: 130,
        status: 'critical',
        projects: [],
      },
      '2026-11': {
        monthKey: '2026-11',
        plannedHours: 160,
        actualProjectHours: 0,
        internalHours: 0,
        totalHours: 160,
        capacityHours,
        utilization: 87,
        status: 'healthy',
        projects: [],
      },
    },
  };
}

function renderPanel(person = employee()) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <EmployeeAllocationPanel
        open
        onOpenChange={vi.fn()}
        tenantId="tenant-1"
        employee={person}
        months={months}
        monthKey="2026-10"
        projectIdFilter="all"
        projectOptions={[
          { id: 'project-1', name: 'Transformação Digital', managerId: 'user-1', managerName: 'Cecilia' },
          { id: 'project-2', name: 'Diagnóstico de Inovação', managerId: 'user-1', managerName: 'Cecilia' },
          { id: 'project-3', name: 'Financiamento EMBRAPII', managerId: 'user-1', managerName: 'Cecilia' },
        ]}
        roleOptions={['Senior Consultant']}
      />
    </MemoryRouter>,
  );
}

describe('EmployeeAllocationPanel', () => {
  beforeEach(() => {
    mutateMock.mockReset();
    availabilityCapacity = 184;
    panelData = {
      employee: employee(),
      months: [
        {
          month: months[0],
          plannedHours: 184,
          actualHours: 184,
          projects: [],
        },
        {
          month: months[1],
          plannedHours: 240,
          actualHours: 114,
          projects: [
            {
              projectId: 'project-1',
              allocationId: 'allocation-1',
              projectMemberId: 'member-1',
              monthKey: '2026-10',
              monthNumber: 10,
              projectName: 'Transformação Digital',
              clientName: 'TechVision',
              subtitle: 'TechVision',
              plannedHours: 100,
              actualHours: 52,
            },
            {
              projectId: 'project-2',
              allocationId: 'allocation-2',
              projectMemberId: 'member-2',
              monthKey: '2026-10',
              monthNumber: 10,
              projectName: 'Diagnóstico de Inovação',
              clientName: 'Meridian',
              subtitle: 'Meridian',
              plannedHours: 80,
              actualHours: 38,
            },
            {
              projectId: 'project-3',
              allocationId: 'allocation-3',
              projectMemberId: 'member-3',
              monthKey: '2026-10',
              monthNumber: 10,
              projectName: 'Financiamento EMBRAPII',
              clientName: 'InnovaFarma',
              subtitle: 'InnovaFarma',
              plannedHours: 60,
              actualHours: 24,
            },
          ],
        },
        {
          month: months[2],
          plannedHours: 160,
          actualHours: 0,
          projects: [],
        },
      ],
    };
  });

  it('recalcula status e conflito ao editar horas planejadas inline', () => {
    renderPanel();

    expect(screen.getByText('130%')).toBeInTheDocument();
    expect(screen.getByText('Sobrecarga Crítica')).toBeInTheDocument();
    expect(screen.getByText('Conflito de capacidade: reduzir 56h')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('80'), { target: { value: '44' } });

    expect(screen.getByText('111%')).toBeInTheDocument();
    expect(screen.getByText('Limite')).toBeInTheDocument();
    expect(screen.getAllByText('204h')).not.toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /salvar 1 alteração/i }));

    expect(mutateMock).toHaveBeenCalledWith([
      {
        tenantId: 'tenant-1',
        allocationId: 'allocation-2',
        hours: 44,
      },
    ]);
  });

  it('exibe estado vazio acionável sem NaN para pessoa sem alocação no mês', () => {
    const emptyEmployee = employee(160);
    availabilityCapacity = 160;
    emptyEmployee.cells['2026-10'] = {
      ...emptyEmployee.cells['2026-10'],
      plannedHours: 0,
      actualProjectHours: 0,
      totalHours: 0,
      capacityHours: 160,
      utilization: 0,
      status: 'unallocated',
    };
    panelData = {
      employee: emptyEmployee,
      months: months.map((month) => ({
        month,
        plannedHours: 0,
        actualHours: 0,
        projects: [],
      })),
    };

    renderPanel(emptyEmployee);

    expect(screen.getByText('0% (Mínimo 40%)')).toBeInTheDocument();
    expect(screen.getByText('0h / 160h cap.')).toBeInTheDocument();
    expect(screen.getByText('Sem Atividade Registrada')).toBeInTheDocument();
    expect(screen.getByText('Disponível para novos projetos')).toBeInTheDocument();
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();
  });
});
