import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TimesheetWeekSelector } from './TimesheetWeekSelector';
import { getWeekStart, getWeekEnd, getWeekDays, WeekDay } from '@/hooks/useTimesheetData';
import { useHolidays, isHoliday } from '@/hooks/useHolidays';
import { useAllocationActualEdits, ActualChangeEntry } from '@/hooks/useAllocationActualEdits';
import { Holiday } from '@/types/holiday';
import { cn } from '@/lib/utils';
import { format, parseISO, isAfter, startOfDay, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const REASON_OPTIONS = [
  { value: 'wrong_hours', label: 'Horas incorretas' },
  { value: 'wrong_item', label: 'Item incorreto' },
  { value: 'post_approval_fix', label: 'Correção pós-aprovação' },
  { value: 'employee_request', label: 'Pedido do colaborador' },
  { value: 'other', label: 'Outro' },
] as const;

interface CorrectionItem {
  type: 'project' | 'internal_activity';
  id: string;
  referenceId: string; // project_member_id or activity_type_id
  projectId?: string;
  title: string;
  subtitle: string;
}

interface AllocationCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  tenantId: string;
}

interface TimesheetRecord {
  id: string;
  project_member_id?: string;
  activity_type_id?: string;
  work_date: string;
  hours: number;
}

export function AllocationCorrectionDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  tenantId,
}: AllocationCorrectionDialogProps) {
  const { data: holidaysData } = useHolidays();
  const holidays = useMemo(() => holidaysData ?? [], [holidaysData]);
  const actualEditsMutation = useAllocationActualEdits(holidays);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [originals, setOriginals] = useState<Record<string, number>>({});
  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Fetch employee's projects and activities
  const { data: items } = useQuery({
    queryKey: ['correction-items', employeeId, tenantId],
    queryFn: async () => {
      const [membersRes, activitiesRes] = await Promise.all([
        supabase
          .from('project_members')
          .select('id, employee_id, project_id, projects(id, name, manager:employees!projects_manager_id_fkey(nome))')
          .eq('employee_id', employeeId),
        supabase
          .from('activity_types')
          .select('id, name, applies_to_all, activity_type_employees(employee_id)')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
      ]);

      const projectItems: CorrectionItem[] = (membersRes.data ?? []).map((m: any) => ({
        type: 'project' as const,
        id: m.project_id,
        referenceId: m.id,
        projectId: m.project_id,
        title: m.projects?.name || 'Projeto',
        subtitle: m.projects?.manager?.nome ? `Gerente: ${m.projects.manager.nome}` : '',
      }));

      const activityItems: CorrectionItem[] = (activitiesRes.data ?? [])
        .filter((a: any) => a.applies_to_all || (a.activity_type_employees ?? []).some((e: any) => e.employee_id === employeeId))
        .map((a: any) => ({
          type: 'internal_activity' as const,
          id: a.id,
          referenceId: a.id,
          title: a.name,
          subtitle: 'Atividade interna',
        }));

      return [...projectItems, ...activityItems];
    },
    enabled: open && !!employeeId,
  });

  // Fetch timesheet data for the selected week
  const { data: weekData, isLoading: isLoadingWeek } = useQuery({
    queryKey: ['correction-week-data', employeeId, weekStartStr, weekEndStr],
    queryFn: async () => {
      const memberIds = (items ?? []).filter((i) => i.type === 'project').map((i) => i.referenceId);
      const activityIds = (items ?? []).filter((i) => i.type === 'internal_activity').map((i) => i.referenceId);

      const [projectRes, activityRes] = await Promise.all([
        memberIds.length > 0
          ? supabase
              .from('project_timesheets')
              .select('id, project_member_id, work_date, hours')
              .in('project_member_id', memberIds)
              .gte('work_date', weekStartStr)
              .lte('work_date', weekEndStr)
          : Promise.resolve({ data: [], error: null }),
        activityIds.length > 0
          ? supabase
              .from('activity_timesheets')
              .select('id, activity_type_id, work_date, hours')
              .eq('employee_id', employeeId)
              .in('activity_type_id', activityIds)
              .gte('work_date', weekStartStr)
              .lte('work_date', weekEndStr)
          : Promise.resolve({ data: [], error: null }),
      ]);

      return {
        projectTimesheets: (projectRes.data ?? []) as any[],
        activityTimesheets: (activityRes.data ?? []) as any[],
      };
    },
    enabled: open && !!items && items.length > 0,
  });

  // Initialize drafts when week data loads
  useEffect(() => {
    if (!weekData || !items) return;
    const next: Record<string, number> = {};

    items.forEach((item) => {
      weekDays.forEach((day) => {
        const key = `${item.type}:${item.id}:${day.date}`;
        let hours = 0;
        if (item.type === 'project') {
          const entry = weekData.projectTimesheets.find(
            (t: any) => t.project_member_id === item.referenceId && t.work_date === day.date
          );
          hours = entry?.hours ?? 0;
        } else {
          const entry = weekData.activityTimesheets.find(
            (t: any) => t.activity_type_id === item.referenceId && t.work_date === day.date
          );
          hours = entry?.hours ?? 0;
        }
        next[key] = hours;
      });
    });

    setDrafts(next);
    setOriginals(next);
  }, [weekData, items, weekDays]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReasonCode('');
      setJustification('');
      setSelectedDate(new Date());
      setViewMonth(new Date());
    }
  }, [open]);

  const getHolidayForDate = useCallback(
    (dateStr: string): Holiday | null => {
      const date = parseISO(dateStr);
      return isHoliday(date, holidays);
    },
    [holidays]
  );

  const isDayDisabled = useCallback(
    (dateStr: string): boolean => {
      const date = parseISO(dateStr);
      if (isWeekend(date)) return true;
      if (isHoliday(date, holidays)) return true;
      return false;
    },
    [holidays]
  );

  const handleHoursChange = (key: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setDrafts((prev) => ({ ...prev, [key]: Math.min(12, Math.round(num * 10) / 10) }));
  };

  const pendingChanges = useMemo(() => {
    const changes: { key: string; item: CorrectionItem; date: string; from: number; to: number }[] = [];
    if (!items) return changes;

    items.forEach((item) => {
      weekDays.forEach((day) => {
        const key = `${item.type}:${item.id}:${day.date}`;
        const from = originals[key] ?? 0;
        const to = drafts[key] ?? 0;
        if (Math.round(from * 10) !== Math.round(to * 10)) {
          changes.push({ key, item, date: day.date, from, to });
        }
      });
    });

    return changes;
  }, [items, weekDays, drafts, originals]);

  const canSave = pendingChanges.length > 0 && reasonCode.length > 0 && justification.trim().length >= 10;

  const handleSave = async () => {
    if (!canSave) return;

    const actualChanges: ActualChangeEntry[] = pendingChanges.map((c) => ({
      type: c.item.type,
      referenceId: c.item.referenceId,
      projectId: c.item.projectId,
      employeeId,
      month: parseInt(c.date.substring(5, 7)),
      year: parseInt(c.date.substring(0, 4)),
      fromHours: c.from,
      toHours: c.to,
      itemTitle: c.item.title,
      monthLabel: format(parseISO(c.date), 'dd/MM', { locale: ptBR }),
      workDate: c.date,
    }));

    await actualEditsMutation.mutateAsync({
      changes: actualChanges,
      reasonCode,
      justification: justification.trim(),
    });

    onOpenChange(false);
  };

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    weekDays.forEach((day) => {
      let sum = 0;
      (items ?? []).forEach((item) => {
        const key = `${item.type}:${item.id}:${day.date}`;
        sum += drafts[key] ?? 0;
      });
      totals[day.date] = sum;
    });
    return totals;
  }, [weekDays, items, drafts]);

  const weekTotal = Object.values(dayTotals).reduce((s, v) => s + v, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Corrigir lançamentos — {employeeName}</DialogTitle>
          <DialogDescription>
            Ajuste as horas lançadas pelo funcionário. Todas as alterações serão registradas no log de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          {/* Week selector */}
          <TimesheetWeekSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            viewMonth={viewMonth}
            onViewMonthChange={setViewMonth}
          />

          {/* Timesheet grid */}
          <div className="overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sticky left-0 z-10 bg-background">Item</TableHead>
                  {weekDays.map((day) => {
                    const holiday = getHolidayForDate(day.date);
                    const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                    const dayLabel = format(parseISO(day.date), 'EEE', { locale: ptBR });
                    const dayNum = format(parseISO(day.date), 'dd/MM');

                    return (
                      <TableHead
                        key={day.date}
                        className={cn(
                          'text-center min-w-[80px]',
                          isToday && 'bg-primary/5',
                          holiday && 'bg-destructive/5'
                        )}
                      >
                        <div className="capitalize text-xs">{dayLabel}</div>
                        <div className="text-[10px] text-muted-foreground">{dayNum}</div>
                        {holiday && (
                          <div className="text-[9px] text-destructive truncate max-w-[80px]">{holiday.name}</div>
                        )}
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-center min-w-[60px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).map((item) => {
                  const rowTotal = weekDays.reduce((s, day) => {
                    const key = `${item.type}:${item.id}:${day.date}`;
                    return s + (drafts[key] ?? 0);
                  }, 0);

                  return (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell className="sticky left-0 z-10 bg-background">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {item.type === 'project' ? 'Projeto' : 'Atividade'}
                          </Badge>
                        </div>
                      </TableCell>
                      {weekDays.map((day) => {
                        const key = `${item.type}:${item.id}:${day.date}`;
                        const disabled = isDayDisabled(day.date);
                        const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
                        const original = originals[key] ?? 0;
                        const current = drafts[key] ?? 0;
                        const changed = Math.round(original * 10) !== Math.round(current * 10);

                        if (disabled) {
                          return (
                            <TableCell key={day.date} className="text-center">
                              <div className="h-8 flex items-center justify-center text-muted-foreground bg-destructive/10 rounded-md text-sm">
                                --
                              </div>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell key={day.date} className={cn('text-center', isToday && 'bg-primary/5')}>
                            <Input
                              type="number"
                              min={0}
                              max={12}
                              step={0.5}
                              value={current || ''}
                              onChange={(e) => handleHoursChange(key, e.target.value)}
                              placeholder="0"
                              className={cn(
                                'h-8 w-[68px] mx-auto text-center text-sm',
                                changed && 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                              )}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-medium text-sm">
                        {rowTotal > 0 ? `${rowTotal.toFixed(1)}h` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Totals row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell className="sticky left-0 z-10 bg-muted/30 text-sm">Total do dia</TableCell>
                  {weekDays.map((day) => (
                    <TableCell key={day.date} className="text-center text-sm">
                      {dayTotals[day.date] > 0 ? `${dayTotals[day.date].toFixed(1)}h` : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-center text-sm font-semibold">
                    {weekTotal > 0 ? `${weekTotal.toFixed(1)}h` : '—'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Audit fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Motivo da correção *</label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Justificativa *{' '}
                <span className="text-muted-foreground font-normal">(mín. 10 caracteres)</span>
              </label>
              <Textarea
                placeholder="Descreva o motivo da correção..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Changes summary */}
          {pendingChanges.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {pendingChanges.length} correção(ões) pendente(s)
              </span>{' '}
              · Delta total:{' '}
              {(() => {
                const delta = pendingChanges.reduce((s, c) => s + (c.to - c.from), 0);
                return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}h`;
              })()}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={actualEditsMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || actualEditsMutation.isPending}>
            {actualEditsMutation.isPending ? 'Salvando...' : 'Salvar correções'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
