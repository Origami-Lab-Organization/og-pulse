import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WeekDay, TimesheetEntry } from '@/hooks/useTimesheetData';
import { useUpsertTimesheet } from '@/hooks/useProjectTimesheets';
import { cn } from '@/lib/utils';
import { Holiday } from '@/types/holiday';
import { isHoliday } from '@/hooks/useHolidays';
import { parseISO } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimesheetWeekRowProps {
  label: string;
  subLabel?: string;
  avatarUrl?: string | null;
  projectId: string;
  memberId: string;
  weekDays: WeekDay[];
  existingEntries: TimesheetEntry[];
  holidays?: Holiday[];
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

  // Update hours when existingEntries change
  useEffect(() => {
    setHours(getInitialHours());
  }, [getInitialHours]);

  const handleHoursChange = (date: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 24) return;
    
    setHours((prev) => ({ ...prev, [date]: numValue }));
    setPendingSaves((prev) => new Set(prev).add(date));
  };

  const handleBlur = async (date: string) => {
    if (!pendingSaves.has(date)) return;
    
    const value = hours[date] ?? 0;
    
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
    } catch (error) {
      console.error('Error saving timesheet:', error);
    }
  };

  const totalHours = Object.values(hours).reduce((sum, h) => sum + (h || 0), 0);

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
    <div className="grid grid-cols-[1fr_repeat(5,60px)_80px] gap-2 items-center py-2 px-3 hover:bg-muted/50 rounded-md">
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

        return (
          <Input
            key={day.date}
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={hours[day.date] || ''}
            onChange={(e) => handleHoursChange(day.date, e.target.value)}
            onBlur={() => handleBlur(day.date)}
            className={cn(
              "h-8 text-center text-sm px-1",
              pendingSaves.has(day.date) && "border-primary"
            )}
            placeholder="0"
          />
        );
      })}
      
      <div className="text-right font-medium text-sm pr-2">
        {totalHours.toFixed(1)}h
      </div>
    </div>
  );
}
