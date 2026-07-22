import { ReactNode, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { WeekDay } from '@/hooks/useTimesheetData';
import { useCellAutosave, SaveStatusInfo } from '@/hooks/useCellAutosave';
import { GridTimeCell, CellMode } from './GridTimeCell';

interface WeeklyGridRowProps {
  /** Id único de navegação/persistência (memberId ou `act:activityTypeId`). */
  rowId: string;
  rowIndex: number;
  name: string;
  subtitle: string;
  weekDays: WeekDay[];
  weekdayLabels: string[];
  dateLabels: string[];
  gridCols: string;
  isOnline: boolean;
  trackSuggestions: boolean;
  /** Sugestão inteira por data (hints adaptativos vindos da página). */
  suggestions?: Record<string, number>;
  /** Horas salvas por data (objeto estável, memoizado pela página). */
  entryHours: Record<string, number>;
  persist: (date: string, hours: number) => Promise<unknown>;
  cellMode: (date: string) => CellMode;
  holidayName: (date: string) => string | undefined;
  overByDate: Record<string, boolean>;
  statusContent: ReactNode;
  onExceedMax: (max: number) => void;
  onOfflineBlocked?: () => void;
  onRealValuesChange: (id: string, real: Record<string, number>) => void;
  onSaveStatusChange: (id: string, info: SaveStatusInfo) => void;
  registerRef: (rowIndex: number, dayIndex: number, el: HTMLInputElement | null) => void;
  onArrowNavigate: (rowIndex: number, dayIndex: number, dRow: number, dCol: number) => void;
}

function fmt(value: number): string {
  return String(value);
}

export function WeeklyGridRow({
  rowId,
  rowIndex,
  name,
  subtitle,
  weekDays,
  weekdayLabels,
  dateLabels,
  gridCols,
  isOnline,
  trackSuggestions,
  suggestions = {},
  entryHours,
  persist,
  cellMode,
  holidayName,
  overByDate,
  statusContent,
  onExceedMax,
  onOfflineBlocked,
  onRealValuesChange,
  onSaveStatusChange,
  registerRef,
  onArrowNavigate,
}: WeeklyGridRowProps) {
  const dates = weekDays.map((d) => d.date);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  const { hours, handleHoursChange, handleBlur, isSuggested, isReal } = useCellAutosave({
    id: rowId,
    dates,
    entryHours,
    suggestions,
    persist,
    isOnline,
    maxHours: 12,
    onExceedMax,
    onOfflineBlocked,
    trackSuggestions,
    onRealValuesChange,
    onSaveStatusChange,
  });

  // Total exibido = só valores REAIS (sugestões são placeholder, não contam).
  const realTotal = dates.reduce((sum, date) => (isReal(date) ? sum + (hours[date] || 0) : sum), 0);

  const makeKeyDown = useCallback(
    (date: string, dayIndex: number, hint: number | undefined) =>
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!isReal(date) && hint) handleHoursChange(date, String(hint));
          onArrowNavigate(rowIndex, dayIndex, 1, 0);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onArrowNavigate(rowIndex, dayIndex, 1, 0);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          onArrowNavigate(rowIndex, dayIndex, -1, 0);
        } else if (e.key === 'ArrowLeft') {
          if (input.selectionStart === 0) {
            e.preventDefault();
            onArrowNavigate(rowIndex, dayIndex, 0, -1);
          }
        } else if (e.key === 'ArrowRight') {
          if (input.selectionEnd === input.value.length) {
            e.preventDefault();
            onArrowNavigate(rowIndex, dayIndex, 0, 1);
          }
        }
      },
    [isReal, handleHoursChange, onArrowNavigate, rowIndex]
  );

  return (
    <div className="grid items-center py-1.5" style={{ gridTemplateColumns: gridCols, columnGap: 14 }}>
      <div className="flex flex-col justify-center py-1.5">
        <span className="text-sm font-semibold text-foreground">{name}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>

      {weekDays.map((day, dayIndex) => {
        const date = day.date;
        const mode = cellMode(date);
        const real = isReal(date);
        const value = real ? hours[date] ?? 0 : null;
        const hint = isSuggested(date) ? suggestions[date] : undefined;
        const current = real ? hours[date] ?? 0 : 0;

        return (
          <GridTimeCell
            key={date}
            mode={mode}
            value={value}
            hint={hint}
            over={!!overByDate[date]}
            isFocused={focusedDay === dayIndex}
            disabledOffline={!isOnline}
            label={`${name} – ${weekdayLabels[dayIndex]} ${dateLabels[dayIndex]}`}
            holidayName={holidayName(date)}
            onChange={(v) => handleHoursChange(date, v)}
            onStep={(delta) => {
              const next =
                delta > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1;
              handleHoursChange(date, String(Math.max(0, next)));
            }}
            onFocus={() => setFocusedDay(dayIndex)}
            onBlur={() => {
              setFocusedDay((d) => (d === dayIndex ? null : d));
              handleBlur(date);
            }}
            onKeyDown={makeKeyDown(date, dayIndex, hint)}
            inputRef={(el) => registerRef(rowIndex, dayIndex, el)}
          />
        );
      })}

      <div className="text-center text-sm font-bold tabular-nums text-foreground">
        {realTotal > 0 ? `${fmt(realTotal)}h` : <span className="font-normal text-muted-foreground">—</span>}
      </div>
      <div className="flex justify-center">{statusContent}</div>
    </div>
  );
}
