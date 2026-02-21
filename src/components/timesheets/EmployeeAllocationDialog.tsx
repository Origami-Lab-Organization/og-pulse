import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { addMonths, format, startOfMonth, endOfMonth, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmployeeAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  cargo: string;
  jornadaMensal: number;
  selectedMonth: string; // "yyyy-MM"
  dataAdmissao?: string;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function EmployeeAllocationDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  cargo,
  jornadaMensal,
  selectedMonth,
  dataAdmissao,
}: EmployeeAllocationDialogProps) {
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = endOfMonth(monthStart);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  const isBeforeAdmission = useMemo(() => {
    if (!dataAdmissao) return false;
    const admDate = startOfMonth(parseLocalDate(dataAdmissao));
    return isBefore(monthStart, admDate);
  }, [dataAdmissao, monthStart]);

  const { data, isLoading } = useQuery({
    queryKey: ['employee-allocation-detail', employeeId, selectedMonth],
    queryFn: async () => {
      // Get project members for this employee
      const { data: members, error: membersErr } = await supabase
        .from('project_members')
        .select(`
          id,
          role,
          project_id,
          projects!inner (id, name, start_date, duration_months, clients (company_name))
        `)
        .eq('employee_id', employeeId)
        .or('status.eq.active,portfolio_stage.neq.planning', { referencedTable: 'projects' })
        .neq('projects.portfolio_stage', 'completed');

      if (membersErr) throw membersErr;
      if (!members || members.length === 0) return [];

      const memberIds = members.map((m: any) => m.id);

      const [monthsRes, timesheetsRes] = await Promise.all([
        supabase
          .from('project_member_months')
          .select('project_member_id, month_number, hours')
          .in('project_member_id', memberIds),
        supabase
          .from('project_timesheets')
          .select('project_member_id, work_date, hours')
          .in('project_member_id', memberIds)
          .gte('work_date', monthStartStr)
          .lte('work_date', monthEndStr),
      ]);

      if (monthsRes.error) throw monthsRes.error;
      if (timesheetsRes.error) throw timesheetsRes.error;

      return members.map((member: any) => {
        const project = member.projects;
        const projectStartDate = parseLocalDate(project.start_date);

        // Calculate which month_number corresponds to selectedMonth
        const diffMonths = (year - projectStartDate.getFullYear()) * 12 + (month - 1 - projectStartDate.getMonth());
        const monthNumber = diffMonths + 1;

        const plannedHours = (monthsRes.data || [])
          .filter((mm: any) => mm.project_member_id === member.id && mm.month_number === monthNumber)
          .reduce((sum: number, mm: any) => sum + Number(mm.hours), 0);

        const actualHours = (timesheetsRes.data || [])
          .filter((ts: any) => ts.project_member_id === member.id)
          .reduce((sum: number, ts: any) => sum + Number(ts.hours), 0);

        return {
          projectId: project.id,
          projectName: project.name,
          clientName: project.clients?.company_name || '',
          role: member.role,
          plannedHours,
          actualHours,
        };
      });
    },
    enabled: open && !!employeeId,
  });

  const projects = data || [];
  const totalPlanned = projects.reduce((s, p) => s + p.plannedHours, 0);
  const totalActual = projects.reduce((s, p) => s + p.actualHours, 0);

  const monthLabel = format(monthStart, "MMMM yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employeeName}</DialogTitle>
          <DialogDescription>
            {cargo} · Jornada: {jornadaMensal}h/mês · <span className="capitalize">{monthLabel}</span>
          </DialogDescription>
        </DialogHeader>

        {isBeforeAdmission ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Funcionário ainda não admitido neste período.
            {dataAdmissao && (
              <p className="mt-1">Data de admissão: {format(parseLocalDate(dataAdmissao), 'dd/MM/yyyy')}</p>
            )}
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Nenhum projeto alocado neste mês.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Planejado</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="min-w-[120px]">Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => {
                    const pct = p.plannedHours > 0 ? (p.actualHours / p.plannedHours) * 100 : 0;
                    return (
                      <TableRow key={p.projectId}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{p.projectName}</span>
                            <span className="text-xs text-muted-foreground block">{p.clientName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.role}</TableCell>
                        <TableCell className="text-right">{p.plannedHours}h</TableCell>
                        <TableCell className="text-right">{p.actualHours}h</TableCell>
                        <TableCell>
                          <div className="h-2 w-full rounded-full bg-muted flex overflow-hidden">
                            <div
                              className="bg-green-700 h-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {pct.toFixed(0)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-sm">
              <span className="text-muted-foreground">Total</span>
              <div className="flex gap-4">
                <span>Plan: <strong>{totalPlanned}h</strong></span>
                <span>Real: <strong>{totalActual}h</strong></span>
                <span>Jornada: <strong>{jornadaMensal}h</strong></span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
