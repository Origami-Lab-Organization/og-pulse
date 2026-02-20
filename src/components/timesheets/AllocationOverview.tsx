import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { addMonths, format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmployeeAllocation {
  employeeId: string;
  employeeName: string;
  cargo: string;
  jornadaMensal: number;
  months: Map<string, number>; // "YYYY-MM" -> total hours across all projects
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

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
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

      if (!projects || projects.length === 0) return { employees: [] as EmployeeAllocation[], monthKeys: [] as string[], projects: [] };

      const allMemberIds: string[] = [];
      const memberToProject = new Map<string, { startDate: string }>();

      projects.forEach((p: any) => {
        (p.project_members || []).forEach((m: any) => {
          allMemberIds.push(m.id);
          memberToProject.set(m.id, { startDate: p.start_date });
        });
      });

      if (allMemberIds.length === 0) return { employees: [] as EmployeeAllocation[], monthKeys: [] as string[], projects: [] };

      const { data: memberMonths, error: mmErr } = await supabase
        .from('project_member_months')
        .select('project_member_id, month_number, hours')
        .in('project_member_id', allMemberIds);

      if (mmErr) throw mmErr;

      const employeeMap = new Map<string, EmployeeAllocation>();
      const allMonthKeys = new Set<string>();

      // Map member_id -> employee
      const memberToEmployee = new Map<string, any>();
      projects.forEach((p: any) => {
        (p.project_members || []).forEach((m: any) => {
          if (m.employees) {
            memberToEmployee.set(m.id, m.employees);
          }
        });
      });

      // Process member months – convert month_number to calendar key
      (memberMonths || []).forEach((mm: any) => {
        const emp = memberToEmployee.get(mm.project_member_id);
        const proj = memberToProject.get(mm.project_member_id);
        if (!emp || !proj) return;

        const startDate = parseLocalDate(proj.startDate);
        const calendarDate = addMonths(startDate, mm.month_number - 1);
        const monthKey = format(calendarDate, 'yyyy-MM');
        allMonthKeys.add(monthKey);

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
        const current = allocation.months.get(monthKey) || 0;
        allocation.months.set(monthKey, current + Number(mm.hours));
      });

      // Add employees with 0 hours
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

      const sortedMonthKeys = Array.from(allMonthKeys).sort();

      const employees = Array.from(employeeMap.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName)
      );

      const projectList = projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        clientName: (p.clients as any)?.company_name || '',
      }));

      return { employees, monthKeys: sortedMonthKeys, projects: projectList };
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

  const monthKeys = data?.monthKeys || [];

  const monthLabels = useMemo(() => {
    return monthKeys.map(key => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return format(d, "MMM/yy", { locale: ptBR });
    });
  }, [monthKeys]);

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
                {monthKeys.map((key, i) => (
                  <TableHead key={key} className="text-center min-w-[120px] capitalize">
                    {monthLabels[i]}
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[100px]">Status Geral</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => {
                const totalAllocated = monthKeys.reduce((sum, k) => sum + (emp.months.get(k) || 0), 0);
                const totalCapacity = emp.jornadaMensal * monthKeys.length;
                const overallPercent = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
                const overallStatus = getAllocationStatus(overallPercent, totalAllocated);

                return (
                  <TableRow key={emp.employeeId}>
                    <TableCell className="font-medium">{emp.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.cargo}</TableCell>
                    <TableCell className="text-right">{emp.jornadaMensal}h</TableCell>
                    {monthKeys.map((key) => {
                      const hours = emp.months.get(key) || 0;
                      const percent = emp.jornadaMensal > 0 ? (hours / emp.jornadaMensal) * 100 : 0;
                      const colorClass = getProgressColor(percent, hours);

                      return (
                        <TableCell key={key} className="text-center">
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
