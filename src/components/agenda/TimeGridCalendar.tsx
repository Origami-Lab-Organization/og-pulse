import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { addMinutes, differenceInMinutes, format, isToday, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Repeat, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PositionedEvent } from '@/types/agenda';
import type { CalendarEvent } from '@/types/microsoftGraph';
import { useCategoryStripe } from './categoryColors';
import { eventResponseStyle } from './eventStyle';
import { bannerEventsOfDay, layoutDayEvents } from './timeGridLayout';

/** Altura de uma hora na grade, em px (h-12). */
const HOUR_HEIGHT = 48;

/** Clique na grade arredonda para o slot de 30 min, como no Outlook. */
const SLOT_MINUTES = 30;

/** Ao abrir, a grade já rola até o começo do expediente. */
const SCROLL_TO_HOUR = 7;

/** Abaixo disso o bloco tem uma linha só: "10:00 daily". */
const SINGLE_LINE_MINUTES = 45;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function columnsTemplate(days: number): CSSProperties {
  return { gridTemplateColumns: `3.5rem repeat(${days}, minmax(0, 1fr))` };
}

/** Minuto atual, atualizado a cada minuto, para a linha de "agora". */
function useNowMinute(): number {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return differenceInMinutes(now, startOfDay(now));
}

function EventIcons({ event }: { event: CalendarEvent }) {
  return (
    <>
      {event.onlineMeetingUrl && (
        <Video className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      {event.isRecurring && (
        <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
    </>
  );
}

function BannerChip({ event, onSelect }: { event: CalendarEvent; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={event.subject}
      className={cn(
        'flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        eventResponseStyle(event),
      )}
    >
      <span className="min-w-0 flex-1 truncate">{event.subject}</span>
      <EventIcons event={event} />
    </button>
  );
}

function blockPosition(item: PositionedEvent): CSSProperties {
  const width = 100 / item.columns;
  return {
    top: (item.startMinute / 60) * HOUR_HEIGHT,
    height: Math.max(((item.endMinute - item.startMinute) / 60) * HOUR_HEIGHT - 2, 18),
    left: `calc(${item.column * width}% + 2px)`,
    width: `calc(${width}% - 4px)`,
  };
}

function EventBlock({ item, onSelect }: { item: PositionedEvent; onSelect: () => void }) {
  const { event } = item;
  const start = parseISO(event.start);
  const end = event.end ? parseISO(event.end) : start;
  const singleLine = item.endMinute - item.startMinute < SINGLE_LINE_MINUTES;
  const timeRange = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  // Com categoria, a faixa lateral ganha a cor dela, como no Outlook.
  const stripe = useCategoryStripe(event);

  return (
    <div className="absolute overflow-hidden rounded bg-background" style={blockPosition(item)}>
      <button
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onSelect();
        }}
        title={`${timeRange} · ${event.subject}`}
        style={stripe.style}
        className={cn(
          'flex h-full w-full flex-col items-stretch overflow-hidden rounded border-l-[3px] border-l-primary',
          'px-1.5 py-0.5 text-left text-xs text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          eventResponseStyle(event),
        )}
      >
        <span className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1 truncate">
            {singleLine && (
              <span className="font-medium tabular-nums">{format(start, 'HH:mm')} </span>
            )}
            <span className={cn(!singleLine && 'font-medium')}>{event.subject}</span>
          </span>
          <EventIcons event={event} />
        </span>
        {!singleLine && (
          <span className="truncate tabular-nums text-muted-foreground">{timeRange}</span>
        )}
        {!singleLine && event.location && (
          <span className="truncate text-muted-foreground">{event.location}</span>
        )}
      </button>
    </div>
  );
}

interface DayColumnProps {
  day: Date;
  events: CalendarEvent[];
  nowMinute: number;
  onSelectEvent: (eventId: string) => void;
  onSelectSlot: (start: Date) => void;
}

function DayColumn(props: DayColumnProps) {
  const { day, events, nowMinute, onSelectEvent, onSelectSlot } = props;

  const handleClick = (clickEvent: MouseEvent<HTMLDivElement>) => {
    const offset = clickEvent.clientY - clickEvent.currentTarget.getBoundingClientRect().top;
    const minute = Math.floor((offset / HOUR_HEIGHT) * 60 / SLOT_MINUTES) * SLOT_MINUTES;
    onSelectSlot(addMinutes(startOfDay(day), minute));
  };

  return (
    // Clique no vazio é atalho de mouse; pelo teclado, "Novo compromisso" faz o mesmo.
    <div
      className={cn('relative cursor-pointer border-r border-border', isToday(day) && 'bg-primary/[0.03]')}
      onClick={handleClick}
    >
      {HOURS.map((hour) => (
        <div key={hour} className="h-12 border-b border-border/60" />
      ))}

      {layoutDayEvents(events, day).map((item) => (
        <EventBlock key={item.event.id} item={item} onSelect={() => onSelectEvent(item.event.id)} />
      ))}

      {isToday(day) && (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-primary"
          style={{ top: (nowMinute / 60) * HOUR_HEIGHT }}
          aria-hidden="true"
        >
          <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}

interface DayHeaderProps {
  day: Date;
  onSelectDay?: (day: Date) => void;
}

function DayHeader(props: DayHeaderProps) {
  const { day, onSelectDay } = props;
  const content = (
    <>
      <span className="ol-label text-muted-foreground">
        {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
      </span>
      <span
        className={cn(
          'rounded px-1.5 text-base tabular-nums text-foreground',
          isToday(day) && 'bg-primary text-primary-foreground font-semibold',
        )}
      >
        {format(day, 'd')}
      </span>
    </>
  );

  const className = 'flex items-center gap-2 border-b border-r border-border bg-muted/50 px-2 py-1.5';
  if (!onSelectDay) return <div className={className}>{content}</div>;

  return (
    <button
      type="button"
      onClick={() => onSelectDay(day)}
      aria-label={`Ver o dia ${format(day, "d 'de' MMMM", { locale: ptBR })}`}
      className={cn(
        className,
        'text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      )}
    >
      {content}
    </button>
  );
}

interface TimeGridCalendarProps {
  /** Um dia (visão Dia) ou sete (visão Semana). */
  days: Date[];
  events: CalendarEvent[];
  onSelectEvent: (eventId: string) => void;
  /** Clique num horário vazio: abre "Novo compromisso" naquele início. */
  onSelectSlot: (start: Date) => void;
  /** Clique no cabeçalho do dia — na semana, abre a visão Dia. */
  onSelectDay?: (day: Date) => void;
}

/** Grade por horário das visões Dia e Semana, como no Outlook. */
export function TimeGridCalendar(props: TimeGridCalendarProps) {
  const { days, events, onSelectEvent, onSelectSlot, onSelectDay } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowMinute = useNowMinute();
  const template = columnsTemplate(days.length);
  const banners = days.map((day) => bannerEventsOfDay(events, day));
  const hasBanners = banners.some((list) => list.length > 0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * HOUR_HEIGHT });
  }, []);

  return (
    <div className="overflow-x-auto">
      <div
        className={cn(
          'overflow-hidden rounded-lg border-l border-t border-border',
          days.length > 1 && 'min-w-[44rem]',
        )}
      >
        <div className="grid" style={template}>
          <div className="border-b border-r border-border bg-muted/50" />
          {days.map((day) => (
            <DayHeader key={day.toISOString()} day={day} onSelectDay={onSelectDay} />
          ))}
        </div>

        {hasBanners && (
          <div className="grid" style={template}>
            <div className="border-b border-r border-border px-1 py-1 text-right text-[11px] text-muted-foreground">
              Dia todo
            </div>
            {days.map((day, index) => (
              <div key={day.toISOString()} className="flex flex-col gap-1 border-b border-r border-border p-1">
                {banners[index].map((event) => (
                  <BannerChip key={event.id} event={event} onSelect={() => onSelectEvent(event.id)} />
                ))}
              </div>
            ))}
          </div>
        )}

        <div ref={scrollRef} className="max-h-[36rem] overflow-y-auto">
          <div className="grid" style={template}>
            <div className="relative border-r border-border">
              {HOURS.map((hour) => (
                <div key={hour} className="relative h-12">
                  {hour > 0 && (
                    <span className="absolute -top-2 right-1.5 text-[11px] tabular-nums text-muted-foreground">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  )}
                </div>
              ))}
            </div>
            {days.map((day) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                events={events}
                nowMinute={nowMinute}
                onSelectEvent={onSelectEvent}
                onSelectSlot={onSelectSlot}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
