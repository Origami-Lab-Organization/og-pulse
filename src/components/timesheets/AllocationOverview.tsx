import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface EmployeeAllocation {
  employeeId: string;
  employeeName: string;
  cargo: string;
  jornadaMensal: number;
  months: Map<number, number>; // monthNumber -> total hours across all projects
}

function getAllocationStatus(percent: number, hours: number) {
  if (hours === 0) return { label: 'Ocioso', className: 'bg-muted text-muted-foreground' };
  if (percent > 100) return { label: 'Sobrealocado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
  if (percent >= 80) return { label: 'Adequado', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
  return { label: 'Subalocado', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
}

function getProgressColor(percent: number, hours: number): string {
  if (hours === 0) return 'bg-muted-foreground/30';
  if (percent > 100) return 'bg-red-500';
  if (percent >= 80) return 'bg-green-500';
  return 'bg-yellow-500';
}

interface AllocationOverviewProps {
  searchQuery?: string;
}

export function AllocationOverview({ searchQuery = '' }: AllocationOverviewProps) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['allocation-overview', tenantId, isAdmin, currentEmployeeId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // Fetch active projects with members and their monthly allocations
      let projectsQuery = supabase
        .from('projects')
        .select(`
          id, name, duration_months, start_date,
          clients (company_name),
          project_members (
            id,
            employee_id,
            role,
            employees (id, nome, cargo, jornada_mensal)
          )
        `)
        .eq('tenant_id', tenantId)
        .or('status.eq.active,portfolio_stage.neq.planning')
        .neq('portfolio_stage', 'completed');

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;

      if (!projects || projects.length === 0) return { employees: [] as EmployeeAllocation[], maxMonth: 0, projects: [] };

      // Collect all member IDs
      const allMemberIds: string[] = [];
      projects.forEach((p: any) => {
        (p.project_members || []).forEach((m: any) => {
          allMemberIds.push(m.id);
        });
      });

      if (allMemberIds.length === 0) return { employees: [] as EmployeeAllocation[], maxMonth: 0, projects: [] };

      // Fetch member months in batches (supabase limit)
      const { data: memberMonths, error: mmErr } = await supabase
        .from('project_member_months')
        .select('project_member_id, month_number, hours')
        .in('project_member_id', allMemberIds);

      if (mmErr) throw mmErr;

      // Build employee allocation map
      const employeeMap = new Map<string, EmployeeAllocation>();
      let maxMonth = 0;

      // Map member_id -> employee
      const memberToEmployee = new Map<string, any>();
      projects.forEach((p: any) => {
        (p.project_members || []).forEach((m: any) => {
          if (m.employees) {
            memberToEmployee.set(m.id, m.employees);
          }
        });
      });

      // Process member months
      (memberMonths || []).forEach((mm: any) => {
        const emp = memberToEmployee.get(mm.project_member_id);
        if (!emp) return;

        if (mm.month_number > maxMonth) maxMonth = mm.month_number;

        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, {
            employeeId: emp.id,
            employeeName: emp.nome,
            cargo: emp.cargo,
            jornadaMensal: Number(emp.jornada_mensal) || 176,
            months: new Map(),
          });
        }

        const allocation = employeeMap.get(emp.id)!;
        const current = allocation.months.get(mm.month_number) || 0;
        allocation.months.set(mm.month_number, current + Number(mm.hours));
      });

      // Also add employees with 0 hours allocated
      projects.forEach((p: any) => {
        (p.project_members || []).forEach((m: any) => {
          if (m.employees && !employeeMap.has(m.employees.id)) {
            employeeMap.set(m.employees.id, {
              employeeId: m.employees.id,
              employeeName: m.employees.nome,
              cargo: m.employees.cargo,
              jornadaMensal: Number(m.employees.jornada_mensal) || 176,
              months: new Map(),
            });
          }
        });
      });

      // If no months found, default to showing at least month 1
      if (maxMonth === 0) maxMonth = 1;

      const employees = Array.from(employeeMap.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName)
      );

      const projectList = projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        clientName: (p.clients as any)?.company_name || '',
      }));

      return { employees, maxMonth, projects: projectList };
    },
    enabled: !!tenantId,
  });

  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    if (!searchQuery) return data.employees;
    const q = searchQuery.toLowerCase();
    return data.employees.filter(e =>
      e.employeeName.toLowerCase().includes(q) ||
      e.cargo.toLowerCase().includes(q)
    );
  }, [data?.employees, searchQuery]);

  const maxMonth = data?.maxMonth || 1;
  const monthColumns = Array.from({ length: Math.min(maxMonth, 12) }, (_, i) => i + 1);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (filteredEmployees.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum funcionário alocado nos projetos ativos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visão de Alocação por Funcionário</CardTitle>
        <p className="text-sm text-muted-foreground">
          Horas planejadas vs capacidade mensal de cada funcionário em todos os projetos ativos
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Funcionário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Jornada</TableHead>
                {monthColumns.map((m) => (
                  <TableHead key={m} className="text-center min-w-[120px]">
                    Mês {m}
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[100px]">Status Geral</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => {
                // Calculate overall allocation
                const totalAllocated = monthColumns.reduce((sum, m) => sum + (emp.months.get(m) || 0), 0);
                const totalCapacity = emp.jornadaMensal * monthColumns.length;
                const overallPercent = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
                const overallStatus = getAllocationStatus(overallPercent, totalAllocated);

                return (
                  <TableRow key={emp.employeeId}>
                    <TableCell className="font-medium">{emp.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.cargo}</TableCell>
                    <TableCell className="text-right">{emp.jornadaMensal}h</TableCell>
                    {monthColumns.map((m) => {
                      const hours = emp.months.get(m) || 0;
                      const percent = emp.jornadaMensal > 0 ? (hours / emp.jornadaMensal) * 100 : 0;
                      const colorClass = getProgressColor(percent, hours);

                      return (
                        <TableCell key={m} className="text-center">
                          <div className="space-y-1">
                            <span className="text-xs font-medium">
                              {hours}h / {emp.jornadaMensal}h
                            </span>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${colorClass}`}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {percent.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Badge className={overallStatus.className}>{overallStatus.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
