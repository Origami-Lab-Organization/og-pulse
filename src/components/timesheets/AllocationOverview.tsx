import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format, startOfMonth, isBefore, eachDayOfInterval, isWeekend, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHolidays, isHoliday } from '@/hooks/useHolidays';
import { Holiday } from '@/types/holiday';
import { Info } from 'lucide-react';

interface EmployeeAllocation {
  employeeId: string;
  employeeName: string;
  cargo: string;
  jornadaMensal: number;
  jornadaDiaria: number;
  dataAdmissao?: string;
  status: string;
  terminationDate?: string; // yyyy-MM-dd from employee_terminations
  months: Map<string, number>;
  actualMonths: Map<string, number>;
}

function isExcludedForMonth(emp: EmployeeAllocation, selectedMonth: string): boolean {
  const currentMonth = format(new Date(), 'yyyy-MM');
  if (emp.status === 'bloqueado' || emp.status === 'arquivado') {
    // No explicit exit date — exclude from current month onwards
    return selectedMonth >= currentMonth;
  }
  if (emp.status === 'em_desligamento' || emp.status === 'desligado') {
    const exitMonth = emp.terminationDate
      ? emp.terminationDate.substring(0, 7)
      : currentMonth;
    // em_desligamento: still active until termination month (exclusive after)
    // desligado: exclude from the month after termination
    return selectedMonth > exitMonth;
  }
  return false;
}

type StatusLabel = 'Sobrealocado' | 'Subalocado' | 'Ocioso' | 'Adequado';

const STATUS_ORDER: Record<StatusLabel, number> = {
  Sobrealocado: 0,
  Subalocado: 1,
  Ocioso: 2,
  Adequado: 3,
};

const STATUS_STYLES: Record<StatusLabel, { badge: string; chip: string }> = {
  Sobrealocado: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    chip: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300',
  },
  Subalocado: {
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    chip: 'border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300',
  },
  Ocioso: {
    badge: 'bg-muted text-muted-foreground',
    chip: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
  },
  Adequado: {
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    chip: 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300',
  },
};

function getAllocationStatus(actualHours: number, capacity: number): StatusLabel {
  if (actualHours === 0) return 'Ocioso';
  const pct = capacity > 0 ? (actualHours / capacity) * 100 : 0;
  if (pct > 100) return 'Sobrealocado';
  if (pct >= 80) return 'Adequado';
  return 'Subalocado';
}

function countWorkingDays(start: Date, end: Date, holidays: Holiday[]): number {
  const days = eachDayOfInterval({ start, end });
  let count = 0;
  for (const day of days) {
    if (isWeekend(day)) continue;
    if (isHoliday(day, holidays)) continue;
    count++;
  }
  return count;
}

function calculateMonthlyCapacity(monthKey: string, jornada_diaria: number, holidays: Holiday[]): number {
  const monthStart = parseISO(`${monthKey}-01`);
  return countWorkingDays(monthStart, endOfMonth(monthStart), holidays) * jornada_diaria;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmt(h: number) { return `${Math.round(h * 10) / 10}h`; }

interface AllocationOverviewProps {
  searchQuery?: string;
  selectedMonth: string; // "yyyy-MM"
  onStatusCountsChange?: (counts: Record<StatusLabel, number>) => void;
}

export function AllocationOverview({ searchQuery = '', selectedMonth, onStatusCountsChange }: AllocationOverviewProps) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const { data: holidaysData } = useHolidays();
  const holidays = holidaysData ?? [];
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;
  const navigate = useNavigate();

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
            employees (id, nome, cargo, jornada_mensal, jornada_diaria, data_admissao, status, employee_terminations!termination_id (termination_date))
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
            jornadaDiaria: Number(emp.jornada_diaria) || 8,
            dataAdmissao: emp.data_admissao,
            status: emp.status ?? 'ativo',
            terminationDate: emp.employee_terminations?.termination_date ?? undefined,
            months: new Map(),
            actualMonths: new Map(),
          });
        }
        return employeeMap.get(emp.id)!;
      };

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

      (timesheets || []).forEach((ts: any) => {
        const emp = memberToEmployee.get(ts.project_member_id);
        if (!emp) return;

        const monthKey = ts.work_date.substring(0, 7);
        allMonthKeys.add(monthKey);

        const allocation = getOrCreateEmployee(emp);
        const current = allocation.actualMonths.get(monthKey) || 0;
        allocation.actualMonths.set(monthKey, current + Number(ts.hours));
      });

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

  const visibleMonthKeys = useMemo(() => {
    const allMonthKeys = data?.monthKeys || [];
    return allMonthKeys.filter(k => k === selectedMonth);
  }, [data?.monthKeys, selectedMonth]);

  // Compute per-employee status and sort by severity (problems first)
  const employeesWithStatus = useMemo(() => {
    if (!data?.employees) return [];
    let list = data.employees.filter(e => !isExcludedForMonth(e, selectedMonth));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.employeeName.toLowerCase().includes(q) ||
        e.cargo.toLowerCase().includes(q)
      );
    }
    return list.map(emp => {
      const totalActual = visibleMonthKeys.reduce((sum, k) => sum + (emp.actualMonths?.get(k) || 0), 0);
      const totalCapacity = visibleMonthKeys.reduce((sum, k) => sum + calculateMonthlyCapacity(k, emp.jornadaDiaria, holidays), 0);
      const status = getAllocationStatus(totalActual, totalCapacity);
      return { emp, totalActual, totalCapacity, status };
    }).sort((a, b) => {
      const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (diff !== 0) return diff;
      return a.emp.employeeName.localeCompare(b.emp.employeeName);
    });
  }, [data?.employees, searchQuery, visibleMonthKeys, holidays]);

  // Status counts for summary chips
  const statusCounts = useMemo(() => {
    const counts: Record<StatusLabel, number> = { Sobrealocado: 0, Subalocado: 0, Ocioso: 0, Adequado: 0 };
    employeesWithStatus.forEach(({ status }) => counts[status]++);
    return counts;
  }, [employeesWithStatus]);

  useEffect(() => {
    onStatusCountsChange?.(statusCounts);
  }, [statusCounts, onStatusCountsChange]);

  const filteredEmployees = employeesWithStatus;

  const monthLabels = useMemo(() => {
    return visibleMonthKeys.map(key => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return format(d, "MMMM", { locale: ptBR });
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

  const isMonthBeforeAdmission = (emp: EmployeeAllocation, monthKey: string): boolean => {
    if (!emp.dataAdmissao) return false;
    const admMonth = startOfMonth(parseLocalDate(emp.dataAdmissao));
    const [y, m] = monthKey.split('-').map(Number);
    const cellMonth = new Date(y, m - 1, 1);
    return isBefore(cellMonth, admMonth);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">Visão de Alocação por Funcionário</CardTitle>
          <p className="text-sm text-muted-foreground">
            Clique em um funcionário para gerenciar horas.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleMonthKeys.length === 0 || filteredEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {visibleMonthKeys.length === 0
              ? 'Nenhuma alocação encontrada para o período selecionado.'
              : 'Nenhum funcionário corresponde ao filtro selecionado.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Funcionário</TableHead>
                  <TableHead>Cargo</TableHead>
                  {visibleMonthKeys.map((key, i) => (
                    <TableHead key={key} className="text-center min-w-[140px] capitalize">
                      {monthLabels[i]}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(({ emp, status }) => {
                  return (
                    <TableRow
                      key={emp.employeeId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/alocacao/${emp.employeeId}?month=${selectedMonth}`)}
                    >
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{emp.employeeName}</span>
                              <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-0.5">
                              <div>Jornada: {emp.jornadaDiaria}h/dia</div>
                              <div>Capacidade mensal: {calculateMonthlyCapacity(selectedMonth, emp.jornadaDiaria, holidays)}h</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.cargo}</TableCell>
                      {visibleMonthKeys.map((key) => {
                        if (isMonthBeforeAdmission(emp, key)) {
                          return (
                            <TableCell key={key} className="text-center">
                              <span className="text-xs text-muted-foreground">N/A</span>
                            </TableCell>
                          );
                        }

                        const planned = emp.months?.get(key) || 0;
                        const actual = emp.actualMonths?.get(key) || 0;
                        const capacity = calculateMonthlyCapacity(key, emp.jornadaDiaria, holidays);

                        return (
                          <TableCell key={key} className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="space-y-1.5">
                                  <div className="h-2 w-full rounded-full bg-muted flex overflow-hidden">
                                    <div
                                      className="bg-green-700 h-full transition-all"
                                      style={{ width: `${Math.min(capacity > 0 ? (actual / capacity) * 100 : 0, 100)}%` }}
                                    />
                                    <div
                                      className="bg-green-300 h-full transition-all"
                                      style={{ width: `${Math.min(capacity > 0 ? (Math.max(planned - actual, 0) / capacity) * 100 : 0, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {planned > 0 ? `${fmt(planned)} plan` : '—'}
                                    {actual > 0 ? ` · ${fmt(actual)} real` : ''}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <div>Realizado: {fmt(actual)}</div>
                                  <div>Planejado: {fmt(planned)}</div>
                                  <div>Capacidade: {fmt(capacity)}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <Badge className={STATUS_STYLES[status].badge}>{status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
