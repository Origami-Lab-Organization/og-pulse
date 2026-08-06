import {
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getMonthGridRange } from './calendarGrid';
import type { CalendarEvent } from '@/types/microsoftGraph';

/** Quantos eventos cabem por célula antes de virar "+N". */
const EVENTS_PER_DAY = 3;

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function eventStart(event: CalendarEvent): Date | null {
  return event.start ? parseISO(event.start) : null;
}

function eventsOfDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => {
    const start = eventStart(event);
    return start ? isSameDay(start, day) : false;
  });
}

function EventChip({ event, onSelect }: { event: CalendarEvent; onSelect: () => void }) {
  const start = eventStart(event);
  const time = start && !event.isAllDay ? format(start, 'HH:mm') : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={event.subject}
      className="w-full truncate rounded px-1.5 py-0.5 text-left text-xs
                 bg-primary/10 text-foreground hover:bg-primary/20
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {time && <span className="font-medium tabular-nums">{time} </span>}
      {event.subject}
    </button>
  );
}

interface DayCellProps {
  day: Date;
  month: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (eventId: string) => void;
}

function DayCell({ day, month, events, onSelectDay, onSelectEvent }: DayCellProps) {
  const visible = events.slice(0, EVENTS_PER_DAY);
  const hidden = events.length - visible.length;
  const outsideMonth = !isSameMonth(day, month);

  return (
    <div
      className={cn(
        'flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5',
        outsideMonth && 'bg-muted/40',
      )}
    >
      <button
        type="button"
        onClick={() => onSelectDay(day)}
        aria-label={`Ver compromissos de ${format(day, "d 'de' MMMM", { locale: ptBR })}`}
        className={cn(
          'self-start rounded px-1.5 text-xs tabular-nums',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          outsideMonth ? 'text-muted-foreground' : 'text-foreground',
          isToday(day) && 'bg-primary text-primary-foreground font-semibold',
        )}
      >
        {format(day, 'd')}
      </button>

      {visible.map((event) => (
        <EventChip key={event.id} event={event} onSelect={() => onSelectEvent(event.id)} />
      ))}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => onSelectDay(day)}
          className="self-start px-1.5 text-xs text-muted-foreground hover:text-foreground
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          +{hidden}
        </button>
      )}
    </div>
  );
}

interface MonthCalendarProps {
  month: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (eventId: string) => void;
}

export function MonthCalendar({
  month,
  events,
  onSelectDay,
  onSelectEvent,
}: MonthCalendarProps) {
  const { start, end } = getMonthGridRange(month);
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem] overflow-hidden rounded-lg border-l border-t border-border">
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="border-b border-r border-border bg-muted/50 px-2 py-1.5
                         ol-label text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => (
            <DayCell
              key={day.toISOString()}
              day={day}
              month={month}
              events={eventsOfDay(events, day)}
              onSelectDay={onSelectDay}
              onSelectEvent={onSelectEvent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
