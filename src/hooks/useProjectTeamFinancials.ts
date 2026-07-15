import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchSuppliersWithActualsAndPlanned, fetchMaterials } from '@/services/projectCostsService';
import { ProjectAllocation } from '@/types/equipe.types';
import { calculatePlannedLaborCost, EmployeeFallbackCost } from '@/lib/roleAllocationCosts';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import { holidayService } from '@/services/holidayService';

/**
 * Financeiro PLANEJADO da equipe de um projeto, a partir do modelo novo
 * (project_role_allocations). Mostra, na aba Equipe:
 *  - custo planejado de cada colaborador (horas planejadas × custo/hora);
 *  - custo de mão de obra total + custos planejados de fornecedores/materiais;
 *  - margem planejada do projeto (receita de contrato − custos) / receita.
 *
 * Custo/hora vem do snapshot mensal em `project_role_allocations.cost_per_hour`.
 * O fallback (jornada diária × dias úteis do mês em questão) existe apenas para
 * registros antigos ou incompletos, sem snapshot.
 */

export interface ProjectTeamFinancials {
  revenue: number;
  laborCost: number;
  otherPlannedCost: number;
  totalCost: number;
  marginValue: number | null;
  marginPercent: number | null;
  /** custo planejado total por colaborador (employeeId → custo). */
  costByEmployee: Record<string, number>;
  /** custo/hora estimado por colaborador (employeeId → R$/h). */
  hourlyByEmployee: Record<string, number>;
}

interface EmployeeCostRow {
  id: string;
  total_monthly_cost_estimated: number | null;
  jornada_diaria: number | null;
}

function sumPlanned(rows: { value: number }[] | null | undefined) {
  return (rows ?? []).reduce((sum, row) => sum + Number(row.value || 0), 0);
}

export function useProjectTeamFinancials({
  project,
  allocations,
  enabled = true,
}: {
  project: { id: string; total_value: number | null };
  allocations: ProjectAllocation[];
  enabled?: boolean;
}) {
  const employeeIds = Array.from(new Set(allocations.map((a) => a.employeeId))).sort();
  const allocationSignature = allocations
    .flatMap((allocation) =>
      allocation.monthlyHours.map((month) =>
        `${allocation.employeeId}:${month.year}-${month.month}:${month.plannedHours}:${month.costPerHour ?? 'fallback'}`,
      ),
    )
    .sort();

  return useQuery({
    queryKey: ['project-team-financials', project.id, employeeIds, allocationSignature, project.total_value],
    enabled: enabled && employeeIds.length >= 0,
    queryFn: async (): Promise<ProjectTeamFinancials> => {
      const [employeesRes, suppliers, materials, holidays] = await Promise.all([
        employeeIds.length
          ? supabase
              .from('employees')
              .select('id, total_monthly_cost_estimated, jornada_diaria')
              .in('id', employeeIds)
          : Promise.resolve({ data: [] as EmployeeCostRow[], error: null }),
        fetchSuppliersWithActualsAndPlanned([project.id]),
        fetchMaterials([project.id]),
        holidayService.getAll(),
      ]);

      if ((employeesRes as { error?: unknown }).error) throw (employeesRes as { error: Error }).error;

      const fallbackByEmployee: Record<string, EmployeeFallbackCost> = {};
      const hourlyByEmployee: Record<string, number> = {};
      const today = new Date();
      ((employeesRes.data ?? []) as EmployeeCostRow[]).forEach((emp) => {
        const jornadaDiaria = Number(emp.jornada_diaria) || 8;
        const monthlyCostEstimated = Number(emp.total_monthly_cost_estimated) || 0;
        fallbackByEmployee[emp.id] = { jornadaDiaria, monthlyCostEstimated };
        // Valor exibido de referência (mês atual) — o cálculo real do custo usa o mês de cada alocação.
        hourlyByEmployee[emp.id] = getFallbackHourlyCost(monthlyCostEstimated, jornadaDiaria, today.getFullYear(), today.getMonth(), holidays);
      });

      const { laborCost, costByEmployee } = calculatePlannedLaborCost(allocations, fallbackByEmployee, holidays);

      const suppliersPlanned = (suppliers ?? []).reduce((sum, s) => sum + sumPlanned(s.plannedMonths), 0);
      const materialsPlanned = sumPlanned(materials as { value: number }[]);
      const otherPlannedCost = suppliersPlanned + materialsPlanned;

      const revenue = Number(project.total_value || 0);
      const totalCost = laborCost + otherPlannedCost;
      const marginValue = revenue > 0 ? revenue - totalCost : null;
      const marginPercent = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : null;

      return {
        revenue,
        laborCost,
        otherPlannedCost,
        totalCost,
        marginValue,
        marginPercent,
        costByEmployee,
        hourlyByEmployee,
      };
    },
  });
}
