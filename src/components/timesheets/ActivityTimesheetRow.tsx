import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { WeekDay } from '@/hooks/useTimesheetData';
import { useUpsertActivityTimesheet } from '@/hooks/useActivityTimesheets';
import { ActivityTimesheetEntry } from '@/hooks/useActivityTimesheets';
import { cn } from '@/lib/utils';
import { Holiday } from '@/types/holiday';
import { isHoliday } from '@/hooks/useHolidays';
import { parseISO, isAfter, startOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Briefcase, Check, Loader2, Circle, AlertCircle } from 'lucide-react';
import type { SaveStatus, SaveStatusInfo } from './TimesheetWeekRow';
import { usePwaEnvironment } from '@/hooks/use-pwa-environment';

interface ActivityTimesheetRowProps {
  activityTypeId: string;
  activityName: string;
  employeeId: string;
  weekDays: WeekDay[];
  existingEntries: ActivityTimesheetEntry[];
  holidays?: Holiday[];
  allDailyTotals?: Record<string, number>;
  dailyWorkHours?: number;
  onLocalTotalChange?: (activityTypeId: string, total: number) => void;
  onLocalDayHoursChange?: (activityTypeId: string, dayHours: Record<string, number>) => void;
  onSaveStatusChange?: (activityTypeId: string, info: SaveStatusInfo) => void;
}

export function ActivityTimesheetRow({
  activityTypeId,
  activityName,
  employeeId,
  weekDays,
  existingEntries,
  holidays = [],
  allDailyTotals = {},
  dailyWorkHours = 8,
  onLocalTotalChange,
  onLocalDayHoursChange,
  onSaveStatusChange,
}: ActivityTimesheetRowProps) {
  const upsert = useUpsertActivityTimesheet();
  const { isOnline } = usePwaEnvironment();
  const hasExistingEntries = weekDays.some(day =>
    existingEntries.some(e => e.activity_type_id === activityTypeId && e.work_date === day.date && e.hours > 0)
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(hasExistingEntries ? 'saved' : 'idle');

  const getInitialHours = useCallback(() => {
    const hours: Record<string, number> = {};
    weekDays.forEach(day => {
      const entry = existingEntries.find(
        e => e.activity_type_id === activityTypeId && e.work_date === day.date,
      );
      hours[day.date] = entry?.hours ?? 0;
    });
    return hours;
  }, [weekDays, existingEntries, activityTypeId]);

  const [hours, setHours] = useState<Record<string, number>>(getInitialHours);
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

  const pendingSavesRef = useRef<Set<string>>(new Set());
  const hoursRef = useRef<Record<string, number>>(hours);
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { pendingSavesRef.current = pendingSaves; }, [pendingSaves]);
  useEffect(() => { hoursRef.current = hours; }, [hours]);

  useEffect(() => () => {
    debounceTimersRef.current.forEach(t => clearTimeout(t));
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  useEffect(() => {
    setHours(prev => {
      const serverHours: Record<string, number> = {};
      weekDays.forEach(day => {
        const entry = existingEntries.find(
          e => e.activity_type_id === activityTypeId && e.work_date === day.date,
        );
        serverHours[day.date] = entry?.hours ?? 0;
      });
      const merged = { ...serverHours };
      pendingSavesRef.current.forEach(date => {
        if (prev[date] !== undefined) merged[date] = prev[date];
      });
      return merged;
    });
    const hasEntries = weekDays.some(day =>
      existingEntries.some(e => e.activity_type_id === activityTypeId && e.work_date === day.date && e.hours > 0)
    );
    setSaveStatus(prev => prev === 'idle' ? (hasEntries ? 'saved' : 'idle') : prev);
  }, [existingEntries, weekDays, activityTypeId]);

  const MAX_HOURS = 12;

  const reportStatus = useCallback((info: SaveStatusInfo) => {
    setSaveStatus(info.status);
    onSaveStatusChange?.(activityTypeId, info);
  }, [activityTypeId, onSaveStatusChange]);

  const saveDate = useCallback(async (date: string) => {
    const value = hoursRef.current[date] ?? 0;
    reportStatus({ status: 'saving' });
    try {
      await upsert.mutateAsync({ employeeId, activityTypeId, workDate: date, hours: value });
      setPendingSaves(prev => { const next = new Set(prev); next.delete(date); return next; });
      const remaining = new Set(pendingSavesRef.current);
      remaining.delete(date);
      if (remaining.size === 0) {
        reportStatus({ status: 'saved', lastSavedAt: new Date() });
      }
    } catch {
      reportStatus({ status: 'error' });
      retryTimerRef.current = setTimeout(() => saveDate(date), 5000);
    }
  }, [employeeId, activityTypeId, upsert, reportStatus]);

  const scheduleSave = useCallback((date: string) => {
    const existing = debounceTimersRef.current.get(date);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      debounceTimersRef.current.delete(date);
      saveDate(date);
    }, 2000);
    debounceTimersRef.current.set(date, timer);
  }, [saveDate]);

  const handleHoursChange = (date: string, value: string) => {
    const raw = value === '' ? 0 : parseFloat(value);
    if (isNaN(raw) || raw < 0) return;
    let numValue = Math.round(raw * 10) / 10;
    if (numValue > MAX_HOURS) {
      numValue = MAX_HOURS;
      toast.error('O máximo permitido por dia é 12h', { duration: 3000 });
    }
    setHours(prev => ({ ...prev, [date]: numValue }));
    setPendingSaves(prev => new Set(prev).add(date));
    reportStatus({ status: 'unsaved' });
    scheduleSave(date);
  };

  const handleBlur = (date: string) => {
    const existing = debounceTimersRef.current.get(date);
    if (existing) { clearTimeout(existing); debounceTimersRef.current.delete(date); }
    if (!pendingSavesRef.current.has(date)) return;
    saveDate(date);
  };

  const getEffectiveDailyTotal = (date: string): number => {
    const serverTotal = allDailyTotals[date] ?? 0;
    const serverHoursForThisRow = existingEntries.find(
      e => e.activity_type_id === activityTypeId && e.work_date === date,
    )?.hours ?? 0;
    return serverTotal - serverHoursForThisRow + (hours[date] ?? 0);
  };

  const totalHours = Object.values(hours).reduce((sum, h) => sum + (h || 0), 0);

  useEffect(() => { onLocalTotalChange?.(activityTypeId, totalHours); }, [totalHours, activityTypeId, onLocalTotalChange]);
  useEffect(() => { onLocalDayHoursChange?.(activityTypeId, hours); }, [hours, activityTypeId, onLocalDayHoursChange]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="grid min-w-[520px] grid-cols-[minmax(0,1.5fr)_repeat(5,68px)_72px_90px] gap-2 items-center py-2 px-3 hover:bg-muted/50 rounded-md md:min-w-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-sm font-medium truncate">{activityName}</p>
        </div>
        <p className="text-xs text-muted-foreground">Atividade interna</p>
      </div>

      {weekDays.map(day => {
        const holiday = isHoliday(parseISO(day.date), holidays);
        const isToday = day.date === todayStr;
        const dayName = format(parseISO(day.date), 'EEEE', { locale: ptBR });

        if (holiday) {
          return (
            <TooltipProvider key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-8 flex items-center justify-center text-sm text-muted-foreground bg-destructive/10 rounded-md border border-destructive/20 cursor-not-allowed"
                    aria-label={`Feriado: ${holiday.name}`}
                    tabIndex={-1}
                  >
                    --
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>{holiday.name}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        const isFuture = isAfter(startOfDay(parseISO(day.date)), startOfDay(new Date()));
        if (isFuture) {
          return (
            <TooltipProvider key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-8 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-md border cursor-not-allowed"
                    aria-label={`${dayName}: dia futuro, lançamento não permitido`}
                    aria-disabled="true"
                    tabIndex={-1}
                  >
                    —
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Não é possível lançar horas em dias futuros</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        const effectiveTotal = getEffectiveDailyTotal(day.date);
        const isOverWorkday = effectiveTotal > dailyWorkHours;

        const input = (
          <Input
            key={day.date}
            type="number"
            disabled={!isOnline}
            min={0}
            max={12}
            step={0.1}
            value={hours[day.date] || ''}
            onChange={e => handleHoursChange(day.date, e.target.value)}
            onBlur={() => handleBlur(day.date)}
            aria-label={`Horas ${dayName}, atividade ${activityName}`}
            className={cn(
              'h-8 text-center text-sm px-1',
              isToday && 'bg-primary/5 ring-1 ring-primary/20',
              pendingSaves.has(day.date) && 'border-primary',
              isOverWorkday && 'border-amber-500 focus-visible:ring-amber-500',
            )}
            placeholder="0"
          />
        );

        if (isOverWorkday) {
          return (
            <TooltipProvider key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>{input}</TooltipTrigger>
                <TooltipContent><p>Volume acima da jornada diária. Tem certeza?</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return input;
      })}

      <div className="text-right font-medium text-sm pr-2">
        {totalHours.toFixed(1)}h
      </div>

      <div className="flex items-center justify-center">
        {saveStatus === 'saved' && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
            <Check className="h-3 w-3" />
            Salvo
          </span>
        )}
        {saveStatus === 'saving' && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Salvando...
          </span>
        )}
        {saveStatus === 'unsaved' && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            <Circle className="h-3 w-3" />
            Pendente
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            Erro ao salvar
          </span>
        )}
      </div>
    </div>
  );
}
