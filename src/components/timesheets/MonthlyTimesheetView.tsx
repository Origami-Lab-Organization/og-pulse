import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addMonths, parseISO, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHolidays, isHoliday } from '@/hooks/useHolidays';
import { Holiday } from '@/types/holiday';

interface MonthlyTimesheetViewProps {
  employeeId: string;
}

const ALL_MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];

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

function calculateMonthlyCapacity(monthKey: string, jornadaDiaria: number, holidays: Holiday[]): number {
  const monthStart = parseISO(`${monthKey}-01`);
  return countWorkingDays(monthStart, endOfMonth(monthStart), holidays) * jornadaDiaria;
}

function totalColorClass(actual: number, capacity: number): string {
  if (actual === 0 || capacity === 0) return 'text-muted-foreground font-normal';
  const pct = actual / capacity;
  if (pct > 1) return 'text-red-600 dark:text-red-400';
  if (pct >= 0.8) return 'text-green-600 dark:text-green-400';
  return 'text-yellow-600 dark:text-yellow-400';
}

function fmt(h: number) { return `${Math.round(h * 10) / 10}h`; }

export function MonthlyTimesheetView({ employeeId }: MonthlyTimesheetViewProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [dataFilter, setDataFilter] = useState<'real' | 'planejado'>('real');

  const { data: holidaysData } = useHolidays();
  const holidays = holidaysData ?? [];

  const { data: empData } = useQuery({
    queryKey: ['employee-jornada', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('jornada_diaria')
        .eq('id', employeeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
  const jornadaDiaria = Number(empData?.jornada_diaria) || 8;

  const { data: actualData, isLoading: loadingActual } = useQuery({
    queryKey: ['monthly-actual', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_timesheets')
        .select(`
          work_date,
          hours,
          project_members!inner (
            employee_id,
            projects (id, name, clients (company_name))
          )
        `)
        .eq('project_members.employee_id', employeeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!employeeId,
  });

  const { data: plannedData, isLoading: loadingPlanned } = useQuery({
    queryKey: ['monthly-planned', employeeId],
    queryFn: async () => {
      const { data: members, error: membErr } = await supabase
        .from('project_members')
        .select('id, projects (id, name, start_date, clients (company_name))')
        .eq('employee_id', employeeId);
      if (membErr) throw membErr;
      if (!members || members.length === 0) return [];

      const memberIds = members.map(m => m.id);
      const { data: monthRows, error: monthErr } = await supabase
        .from('project_member_months')
        .select('project_member_id, month_number, hours')
        .in('project_member_id', memberIds);
      if (monthErr) throw monthErr;

      const memberToProject = new Map<string, any>();
      members.forEach(m => { if (m.projects) memberToProject.set(m.id, m.projects); });

      return (monthRows ?? []).map(row => {
        const project = memberToProject.get(row.project_member_id);
        if (!project?.start_date) return null;
        const calendarMonth = format(
          addMonths(parseISO(`${project.start_date.substring(0, 7)}-01`), row.month_number - 1),
          'yyyy-MM'
        );
        return {
          projectId: project.id as string,
          projectName: project.name as string,
          clientName: (project.clients as any)?.company_name ?? '',
          monthKey: calendarMonth,
          hours: Number(row.hours),
        };
      }).filter(Boolean);
    },
    enabled: !!employeeId,
  });

  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const months = useMemo(() => ALL_MONTHS.map(m => `${year}-${m}`), [year]);

  const monthLabels = useMemo(() =>
    months.map(key => {
      const [y, m] = key.split('-').map(Number);
      return format(new Date(y, m - 1, 1), "MMM", { locale: ptBR });
    }),
    [months]
  );

  const projects = useMemo(() => {
    const projectMap = new Map<string, {
      name: string;
      client: string;
      actual: Map<string, number>;
      planned: Map<string, number>;
    }>();

    const ensure = (id: string, name: string, client: string) => {
      if (!projectMap.has(id)) {
        projectMap.set(id, { name, client, actual: new Map(), planned: new Map() });
      }
      return projectMap.get(id)!;
    };

    for (const entry of (actualData ?? [])) {
      const member = entry.project_members as any;
      const project = member?.projects;
      if (!project) continue;
      const monthKey = (entry.work_date as string).substring(0, 7);
      const p = ensure(project.id, project.name, (project.clients as any)?.company_name ?? '');
      p.actual.set(monthKey, (p.actual.get(monthKey) ?? 0) + Number(entry.hours));
    }

    for (const row of (plannedData ?? [])) {
      if (!row) continue;
      const p = ensure(row.projectId, row.projectName, row.clientName);
      p.planned.set(row.monthKey, (p.planned.get(row.monthKey) ?? 0) + row.hours);
    }

    return Array.from(projectMap.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [actualData, plannedData]);

  const isLoading = loadingActual || loadingPlanned;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">Horas por Projeto e Mês</CardTitle>
          <div className="flex items-center gap-3">
            {/* Real / Planejado filter */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={dataFilter === 'real' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDataFilter('real')}
              >
                Real
              </Button>
              <Button
                variant={dataFilter === 'planejado' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDataFilter('planejado')}
              >
                Planejado
              </Button>
            </div>
            {/* Year navigator */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setYear(y => y - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{year}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setYear(y => y + 1)}
                disabled={year >= currentYear}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum lançamento encontrado para este funcionário.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Projeto</TableHead>
                  <TableHead>Cliente</TableHead>
                  {monthLabels.map((label, i) => {
                    const isCurrent = months[i] === currentMonthKey;
                    return (
                      <TableHead key={months[i]} className={`text-right capitalize min-w-[64px] ${isCurrent ? 'font-bold text-foreground' : ''}`}>
                        {label}
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-right font-semibold min-w-[64px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map(([projectId, proj]) => {
                  const rowValue = months.reduce((s, k) =>
                    s + (dataFilter === 'real' ? (proj.actual.get(k) ?? 0) : (proj.planned.get(k) ?? 0)), 0);
                  return (
                    <TableRow key={projectId}>
                      <TableCell className="font-medium">{proj.name}</TableCell>
                      <TableCell className="text-muted-foreground">{proj.client}</TableCell>
                      {months.map(monthKey => {
                        const val = dataFilter === 'real'
                          ? (proj.actual.get(monthKey) ?? 0)
                          : (proj.planned.get(monthKey) ?? 0);
                        const isCurrent = monthKey === currentMonthKey;
                        return (
                          <TableCell key={monthKey} className={`text-right ${isCurrent ? 'bg-muted/40' : ''}`}>
                            {val > 0
                              ? fmt(val)
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-semibold">
                        {rowValue > 0
                          ? fmt(rowValue)
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Totals row — colored by actual vs capacity */}
                <TableRow className="border-t-2 bg-muted/30">
                  <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                  {months.map(monthKey => {
                    const colActual = projects.reduce((s, [, p]) => s + (p.actual.get(monthKey) ?? 0), 0);
                    const colDisplay = dataFilter === 'real'
                      ? colActual
                      : projects.reduce((s, [, p]) => s + (p.planned.get(monthKey) ?? 0), 0);
                    const capacity = calculateMonthlyCapacity(monthKey, jornadaDiaria, holidays);
                    const colorClass = totalColorClass(colActual, capacity);
                    const isCurrent = monthKey === currentMonthKey;
                    return (
                      <TableCell key={monthKey} className={`text-right font-semibold ${colorClass} ${isCurrent ? 'bg-muted/40' : ''}`}>
                        {colDisplay > 0 ? fmt(colDisplay) : <span className="text-muted-foreground font-normal">—</span>}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-semibold">
                    {(() => {
                      const grandActual = projects.reduce((s, [, p]) =>
                        s + months.reduce((ss, k) => ss + (p.actual.get(k) ?? 0), 0), 0);
                      const grandDisplay = dataFilter === 'real'
                        ? grandActual
                        : projects.reduce((s, [, p]) =>
                            s + months.reduce((ss, k) => ss + (p.planned.get(k) ?? 0), 0), 0);
                      const yearCapacity = months.reduce((s, k) =>
                        s + calculateMonthlyCapacity(k, jornadaDiaria, holidays), 0);
                      const colorClass = totalColorClass(grandActual, yearCapacity);
                      return grandDisplay > 0
                        ? <span className={colorClass}>{fmt(grandDisplay)}</span>
                        : <span className="text-muted-foreground font-normal">—</span>;
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
