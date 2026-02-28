import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WeekDay, TimesheetEntry } from '@/hooks/useTimesheetData';
import { useUpsertTimesheet } from '@/hooks/useProjectTimesheets';
import { cn } from '@/lib/utils';
import { Holiday } from '@/types/holiday';
import { isHoliday } from '@/hooks/useHolidays';
import { parseISO, isAfter, startOfDay } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import { ReactNode } from 'react';
import { toast } from 'sonner';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
export interface SaveStatusInfo {
  status: SaveStatus;
  lastSavedAt?: Date;
}

interface TimesheetWeekRowProps {
  label: string;
  subLabel?: string;
  avatarUrl?: string | null;
  projectId: string;
  projectName?: string;
  memberId: string;
  weekDays: WeekDay[];
  existingEntries: TimesheetEntry[];
  holidays?: Holiday[];
  isLocked?: boolean;
  isAdmin?: boolean;
  actionSlot?: ReactNode;
  statusSlot?: ReactNode;
  /** Total hours per date from ALL projects (server-side entries) */
  allDailyTotals?: Record<string, number>;
  /** Employee daily work hours (jornada_diaria) for soft limit */
  dailyWorkHours?: number;
  /** Callback reporting this row's current total hours (local state) */
  onLocalTotalChange?: (memberId: string, total: number) => void;
  /** Callback reporting save status changes */
  onSaveStatusChange?: (memberId: string, info: SaveStatusInfo) => void;
}

export function TimesheetWeekRow({
  label,
  subLabel,
  avatarUrl,
  projectId,
  memberId,
  weekDays,
  existingEntries,
  holidays = [],
  isLocked = false,
  isAdmin = false,
  actionSlot,
  statusSlot,
  allDailyTotals = {},
  dailyWorkHours = 8,
  onLocalTotalChange,
  onSaveStatusChange,
}: TimesheetWeekRowProps) {
  const upsertTimesheet = useUpsertTimesheet();
  
  // Initialize hours from existing entries
  const getInitialHours = useCallback(() => {
    const hours: Record<string, number> = {};
    weekDays.forEach((day) => {
      const entry = existingEntries.find(
        (e) => e.projectMemberId === memberId && e.workDate === day.date
      );
      hours[day.date] = entry?.hours ?? 0;
    });
    return hours;
  }, [weekDays, existingEntries, memberId]);

  const [hours, setHours] = useState<Record<string, number>>(getInitialHours);
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  
  // Ref to track pending saves for use in effects (avoids stale closure)
  const pendingSavesRef = useRef<Set<string>>(new Set());
  const hoursRef = useRef<Record<string, number>>(hours);
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    pendingSavesRef.current = pendingSaves;
  }, [pendingSaves]);

  useEffect(() => {
    hoursRef.current = hours;
  }, [hours]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach(t => clearTimeout(t));
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Update hours when existingEntries change, preserving fields with pending saves
  useEffect(() => {
    setHours(prev => {
      const serverHours: Record<string, number> = {};
      weekDays.forEach((day) => {
        const entry = existingEntries.find(
          (e) => e.projectMemberId === memberId && e.workDate === day.date
        );
        serverHours[day.date] = entry?.hours ?? 0;
      });
      
      // Preserve values for fields with pending saves
      const merged = { ...serverHours };
      pendingSavesRef.current.forEach(date => {
        if (prev[date] !== undefined) {
          merged[date] = prev[date];
        }
      });
      return merged;
    });
  }, [existingEntries, weekDays, memberId]);

  const MAX_HOURS_PER_DAY = 12;

  const saveDate = useCallback(async (date: string) => {
    const value = hoursRef.current[date] ?? 0;
    onSaveStatusChange?.(memberId, { status: 'saving' });
    
    try {
      await upsertTimesheet.mutateAsync({
        projectId,
        projectMemberId: memberId,
        workDate: date,
        hours: value,
      });
      setPendingSaves((prev) => {
        const next = new Set(prev);
        next.delete(date);
        return next;
      });
      // Check if all saves done
      const remaining = new Set(pendingSavesRef.current);
      remaining.delete(date);
      if (remaining.size === 0) {
        onSaveStatusChange?.(memberId, { status: 'saved', lastSavedAt: new Date() });
      }
    } catch (error) {
      console.error('Error saving timesheet:', error);
      onSaveStatusChange?.(memberId, { status: 'error' });
      // Retry after 5 seconds
      retryTimerRef.current = setTimeout(() => saveDate(date), 5000);
    }
  }, [projectId, memberId, upsertTimesheet, onSaveStatusChange]);

  const scheduleSave = useCallback((date: string) => {
    // Clear existing timer for this date
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
    
    if (numValue > MAX_HOURS_PER_DAY) {
      numValue = MAX_HOURS_PER_DAY;
      toast.error('O máximo permitido por dia é 12h', { duration: 3000 });
    }
    
    setHours((prev) => ({ ...prev, [date]: numValue }));
    setPendingSaves((prev) => new Set(prev).add(date));
    onSaveStatusChange?.(memberId, { status: 'unsaved' });
    scheduleSave(date);
  };

  /** Compute effective daily total for a given date, adjusting server totals with local state */
  const getEffectiveDailyTotal = (date: string): number => {
    const serverTotal = allDailyTotals[date] ?? 0;
    const serverHoursForThisRow = existingEntries.find(
      (e) => e.projectMemberId === memberId && e.workDate === date
    )?.hours ?? 0;
    const localHoursForThisRow = hours[date] ?? 0;
    return serverTotal - serverHoursForThisRow + localHoursForThisRow;
  };

  const handleBlur = async (date: string) => {
    // Flush any pending debounce for this date immediately
    const existing = debounceTimersRef.current.get(date);
    if (existing) {
      clearTimeout(existing);
      debounceTimersRef.current.delete(date);
    }
    if (!pendingSavesRef.current.has(date)) return;
    saveDate(date);
  };

  const totalHours = Object.values(hours).reduce((sum, h) => sum + (h || 0), 0);

  // Report local total to parent for real-time footer updates
  useEffect(() => {
    onLocalTotalChange?.(memberId, totalHours);
  }, [totalHours, memberId, onLocalTotalChange]);

  const initials = label
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const getHolidayForDate = (dateStr: string): Holiday | null => {
    const date = parseISO(dateStr);
    return isHoliday(date, holidays);
  };

  return (
    <div className={cn(
      "grid gap-2 items-center py-2 px-3 hover:bg-muted/50 rounded-md",
      (statusSlot || actionSlot) ? "grid-cols-[1fr_repeat(5,60px)_80px_120px]" : "grid-cols-[1fr_repeat(5,60px)_80px]"
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {avatarUrl !== undefined && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={avatarUrl || undefined} alt={label} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          {subLabel && (
            <p className="text-xs text-muted-foreground truncate">{subLabel}</p>
          )}
        </div>
      </div>
      
      {weekDays.map((day) => {
        const holiday = getHolidayForDate(day.date);
        const isHolidayDay = !!holiday;
        const isFutureDay = isAfter(startOfDay(parseISO(day.date)), startOfDay(new Date()));

        // Holiday cell - always disabled
        if (isHolidayDay) {
          return (
            <TooltipProvider key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-8 flex items-center justify-center text-sm text-muted-foreground bg-destructive/10 rounded-md border border-destructive/20 cursor-not-allowed">
                    --
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{holiday.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        // Future day cell - disabled
        if (isFutureDay) {
          return (
            <TooltipProvider key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-8 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-md border cursor-not-allowed">
                    —
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Não é possível lançar horas em dias futuros</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        // Locked cell for non-admins and admins (now just display, no click)
        if (isLocked) {
          return (
            <TooltipProvider key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-8 flex items-center justify-center text-sm bg-muted/50 rounded-md border cursor-not-allowed gap-1">
                    <span>{hours[day.date] || 0}</span>
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Semana enviada - valores travados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        // Normal editable cell
        const effectiveTotal = getEffectiveDailyTotal(day.date);
        const isOverWorkday = effectiveTotal > dailyWorkHours;

        const input = (
          <Input
            key={day.date}
            type="number"
            min={0}
            max={12}
            step={0.1}
            value={hours[day.date] || ''}
            onChange={(e) => handleHoursChange(day.date, e.target.value)}
            onBlur={() => handleBlur(day.date)}
            className={cn(
              "h-8 text-center text-sm px-1",
              pendingSaves.has(day.date) && "border-primary",
              isOverWorkday && "border-amber-500 focus-visible:ring-amber-500"
            )}
            placeholder="0"
          />
        );

        if (isOverWorkday) {
          return (
            <TooltipProvider key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {input}
                </TooltipTrigger>
                <TooltipContent>
                  <p>Volume acima da jornada diária. Tem certeza?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return input;
      })}
      
      <div className="text-right font-medium text-sm pr-2">
        {totalHours.toFixed(1)}h
      </div>
      {(statusSlot || actionSlot) && (
        <div className="flex items-center justify-center gap-1">
          {statusSlot}
          {actionSlot}
        </div>
      )}
    </div>
  );
}
