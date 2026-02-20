import { useMemo, useState } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmployeeAllocation {
  employeeId: string;
  employeeName: string;
  cargo: string;
  jornadaMensal: number;
  months: Map<string, number>;
  actualMonths: Map<string, number>;
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
  const [periodFilter, setPeriodFilter] = useState<'month' | 'year'>('month');

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

      if (!projects || projects.length === 0) return { employees: [] as EmployeeAllocation[], monthKeys: [] as string[] };

      const allMemberIds: string[] = [];
      const memberToProject = new Map<string, { startDate: string }>();

      projects.forEach((p: any) => {
        (p.project_members || []).forEach((m: any) => {
          allMemberIds.push(m.id);
          memberToProject.set(m.id, { startDate: p.start_date });
        });
      });

      if (allMemberIds.length === 0) return { employees: [] as EmployeeAllocation[], monthKeys: [] as string[] };

      // Fetch planned and actual hours in parallel
      const [memberMonthsRes, timesheetsRes] = await Promise.all([
        supabase
          .from('project_member_months')
          .select('project_member_id, month_number, hours')
          .in('project_member_id', allMemberIds),
        supabase
          .from('project_timesheets')
          .select('project_member_id, work_date, hours')
          .in('project_member_id', allMemberIds),
      ]);

      if (memberMonthsRes.error) throw memberMonthsRes.error;
      if (timesheetsRes.error) throw timesheetsRes.error;

      const memberMonths = memberMonthsRes.data;
      const timesheets = timesheetsRes.data;

      const employeeMap = new Map<string, EmployeeAllocation>();
      const allMonthKeys = new Set<string>();

      const memberToEmployee = new Map<string, any>();
      projects.forEach((p: any) => {
        (p.project_members || []).forEach((m: any) => {
          if (m.employees) {
            memberToEmployee.set(m.id, m.employees);
          }
        });
      });

      const getOrCreateEmployee = (emp: any): EmployeeAllocation => {
        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, {
            employeeId: emp.id,
            employeeName: emp.nome,
            cargo: emp.cargo,
            jornadaMensal: Number(emp.jornada_mensal) || 176,
            months: new Map(),
            actualMonths: new Map(),
          });
        }
        return employeeMap.get(emp.id)!;
      };

      // Process planned hours
      (memberMonths || []).forEach((mm: any) => {
        const emp = memberToEmployee.get(mm.project_member_id);
        const proj = memberToProject.get(mm.project_member_id);
        if (!emp || !proj) return;

        const startDate = parseLocalDate(proj.startDate);
        const calendarDate = addMonths(startDate, mm.month_number - 1);
        const monthKey = format(calendarDate, 'yyyy-MM');
        allMonthKeys.add(monthKey);

        const allocation = getOrCreateEmployee(emp);
        const current = allocation.months.get(monthKey) || 0;
        allocation.months.set(monthKey, current + Number(mm.hours));
      });

      // Process actual (timesheet) hours
      (timesheets || []).forEach((ts: any) => {
        const emp = memberToEmployee.get(ts.project_member_id);
        if (!emp) return;

        const monthKey = ts.work_date.substring(0, 7);
        allMonthKeys.add(monthKey);

        const allocation = getOrCreateEmployee(emp);
        const current = allocation.actualMonths.get(monthKey) || 0;
        allocation.actualMonths.set(monthKey, current + Number(ts.hours));
      });

      // Add employees with 0 hours
      projects.forEach((p: any) => {
        (p.project_members || []).forEach((m: any) => {
          if (m.employees) getOrCreateEmployee(m.employees);
        });
      });

      const sortedMonthKeys = Array.from(allMonthKeys).sort();
      const employees = Array.from(employeeMap.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName)
      );

      return { employees, monthKeys: sortedMonthKeys };
    },
    enabled: !!tenantId,
  });

  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const currentYear = new Date().getFullYear();
  const allMonthKeys = data?.monthKeys || [];

  const visibleMonthKeys = useMemo(() => {
    if (periodFilter === 'month') {
      return allMonthKeys.filter(k => k === currentMonthKey);
    }
    return allMonthKeys.filter(k => k.startsWith(String(currentYear)));
  }, [allMonthKeys, periodFilter, currentMonthKey, currentYear]);

  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    if (!searchQuery) return data.employees;
    const q = searchQuery.toLowerCase();
    return data.employees.filter(e =>
      e.employeeName.toLowerCase().includes(q) ||
      e.cargo.toLowerCase().includes(q)
    );
  }, [data?.employees, searchQuery]);

  const monthLabels = useMemo(() => {
    return visibleMonthKeys.map(key => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return format(d, "MMM/yy", { locale: ptBR });
    });
  }, [visibleMonthKeys]);

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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Visão de Alocação por Funcionário</CardTitle>
            <p className="text-sm text-muted-foreground">
              Horas realizadas e planejadas vs capacidade mensal
            </p>
          </div>
          <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as 'month' | 'year')}>
            <TabsList>
              <TabsTrigger value="month">Mês Atual</TabsTrigger>
              <TabsTrigger value="year">Ano Todo</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {visibleMonthKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma alocação encontrada para o período selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Funcionário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Jornada</TableHead>
                  {visibleMonthKeys.map((key, i) => (
                    <TableHead key={key} className="text-center min-w-[140px] capitalize">
                      {monthLabels[i]}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px]">Status Geral</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const totalPlanned = visibleMonthKeys.reduce((sum, k) => sum + (emp.months.get(k) || 0), 0);
                  const totalActual = visibleMonthKeys.reduce((sum, k) => sum + (emp.actualMonths.get(k) || 0), 0);
                  const totalCapacity = emp.jornadaMensal * visibleMonthKeys.length;
                  const overallPercent = totalCapacity > 0 ? (totalPlanned / totalCapacity) * 100 : 0;
                  const overallStatus = getAllocationStatus(overallPercent, totalPlanned);

                  return (
                    <TableRow key={emp.employeeId}>
                      <TableCell className="font-medium">{emp.employeeName}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.cargo}</TableCell>
                      <TableCell className="text-right">{emp.jornadaMensal}h</TableCell>
                      {visibleMonthKeys.map((key) => {
                        const planned = emp.months.get(key) || 0;
                        const actual = emp.actualMonths.get(key) || 0;
                        const allocPercent = emp.jornadaMensal > 0 ? (planned / emp.jornadaMensal) * 100 : 0;
                        const realizedPercent = planned > 0 ? (actual / planned) * 100 : 0;
                        const allocColor = getProgressColor(allocPercent, planned);

                        return (
                          <TableCell key={key} className="text-center">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Real.</span>
                                <span className="font-medium">{actual}h</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Plan.</span>
                                <span className="font-medium">{planned}h / {emp.jornadaMensal}h</span>
                              </div>
                              {/* Allocation bar (planned vs capacity) */}
                              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full transition-all ${allocColor}`}
                                  style={{ width: `${Math.min(allocPercent, 100)}%` }}
                                />
                              </div>
                              {/* Realized bar (actual vs planned) */}
                              {planned > 0 && (
                                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full transition-all bg-blue-500"
                                    style={{ width: `${Math.min(realizedPercent, 100)}%` }}
                                  />
                                </div>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {allocPercent.toFixed(0)}% aloc. {planned > 0 ? `· ${realizedPercent.toFixed(0)}% real.` : ''}
                              </span>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <Badge className={overallStatus.className}>{overallStatus.label}</Badge>
                          <div className="text-[10px] text-muted-foreground">
                            {totalActual}h / {totalPlanned}h
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
