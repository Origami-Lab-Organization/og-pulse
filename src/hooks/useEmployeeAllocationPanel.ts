import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { allocationService } from '@/services/allocationService';
import { AllocationMonth, AllocationPanelData, AllocationPerson } from '@/types/allocation';
import { useToast } from '@/hooks/use-toast';

export interface PlannedHoursChange {
  tenantId: string;
  allocationId: string;
  hours: number;
}

function allocationPanelKey(tenantId: string | undefined, employeeId: string | undefined, monthKeys: string[], projectId: string) {
  return ['allocation-panel', tenantId, employeeId, monthKeys, projectId] as const;
}

function applyPlannedChanges(data: AllocationPanelData | undefined, changes: PlannedHoursChange[]) {
  if (!data) return data;

  const changesByKey = new Map(changes.map((change) => [change.allocationId, change.hours]));

  return {
    ...data,
    months: data.months.map((monthData) => {
      const projects = monthData.projects.map((project) => {
        const nextHours = project.allocationId ? changesByKey.get(project.allocationId) : undefined;
        return nextHours === undefined ? project : { ...project, plannedHours: nextHours };
      });

      return {
        ...monthData,
        projects,
        plannedHours: projects.reduce((sum, project) => sum + project.plannedHours, 0),
      };
    }),
  };
}

export function useEmployeeAllocationPanel({
  tenantId,
  employee,
  months,
  projectId,
  enabled,
}: {
  tenantId: string | undefined;
  employee: AllocationPerson | null;
  months: AllocationMonth[];
  projectId: string;
  enabled: boolean;
}) {
  const monthKeys = months.map((month) => month.key);

  return useQuery({
    queryKey: allocationPanelKey(tenantId, employee?.id, monthKeys, projectId),
    queryFn: () => {
      if (!tenantId || !employee) {
        return Promise.resolve(null);
      }

      return allocationService.getEmployeePanel({
        tenantId,
        employee,
        months,
        projectId,
      });
    },
    enabled: enabled && !!tenantId && !!employee && months.length > 0,
  });
}

function invalidateAllocationQueries(queryClient: ReturnType<typeof useQueryClient>, tenantId: string | undefined, employeeId: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ['allocation-panel', tenantId, employeeId] });
  queryClient.invalidateQueries({ queryKey: ['allocation-grid', tenantId] });
  queryClient.invalidateQueries({ queryKey: ['project-allocations'] });
}

export function useAllocateEmployeeToProject({
  tenantId,
  employeeId,
}: {
  tenantId: string | undefined;
  employeeId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { tenantId: string; projectId: string; employeeId: string; role: string; year: number; month: number; plannedHours: number }) =>
      allocationService.allocateToProject(input),
    onSuccess: () => {
      toast({
        title: 'Colaborador alocado',
        description: 'A alocação foi criada e a grade será recalculada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível alocar',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => invalidateAllocationQueries(queryClient, tenantId, employeeId),
  });
}

export function useDeallocateEmployeeFromProject({
  tenantId,
  employeeId,
}: {
  tenantId: string | undefined;
  employeeId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: { tenantId: string; projectId: string; employeeId: string }) => allocationService.deallocateFromProject(input),
    onSuccess: () => {
      toast({
        title: 'Colaborador desalocado',
        description: 'A alocação foi removida do projeto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível desalocar',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => invalidateAllocationQueries(queryClient, tenantId, employeeId),
  });
}

export function useSaveEmployeeAllocationPanel({
  tenantId,
  employeeId,
}: {
  tenantId: string | undefined;
  employeeId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (changes: PlannedHoursChange[]) => {
      await Promise.all(changes.map((change) => allocationService.updatePlannedHours(change)));
    },
    onMutate: async (changes) => {
      const queryKey = ['allocation-panel', tenantId, employeeId];
      await queryClient.cancelQueries({ queryKey });
      const previousPanelQueries = queryClient.getQueriesData<AllocationPanelData | null>({ queryKey });

      previousPanelQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data ? applyPlannedChanges(data, changes) : data);
      });

      return { previousPanelQueries };
    },
    onError: (error: Error, _changes, context) => {
      context?.previousPanelQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast({
        title: 'Não foi possível salvar o planejado',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Planejamento atualizado',
        description: 'As horas planejadas foram salvas e a grade será recalculada.',
      });
    },
    onSettled: () => invalidateAllocationQueries(queryClient, tenantId, employeeId),
  });
}
