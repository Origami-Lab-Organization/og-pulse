import { addDays, differenceInMinutes, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { PositionedEvent } from '@/types/agenda';
import type { CalendarEvent } from '@/types/microsoftGraph';

/** Duração mínima desenhada, para um evento curto continuar clicável. */
const MIN_BLOCK_MINUTES = 20;

const MINUTES_PER_DAY = 24 * 60;

/** Dia inteiro, ou atravessa a meia-noite de mais de um dia: vai para a faixa do topo. */
export function isBannerEvent(event: CalendarEvent): boolean {
  if (event.isAllDay) return true;
  if (!event.start || !event.end) return false;
  return differenceInMinutes(parseISO(event.end), parseISO(event.start)) >= MINUTES_PER_DAY;
}

/** Eventos de faixa que cobrem o dia. O fim do Graph é exclusivo (dia inteiro termina 00:00 do dia seguinte). */
export function bannerEventsOfDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return events.filter((event) => {
    if (!isBannerEvent(event) || !event.start) return false;
    const start = parseISO(event.start);
    const end = event.end ? parseISO(event.end) : start;
    return start < dayEnd && (end > dayStart || isSameDay(start, day));
  });
}

/** Trecho do evento dentro do dia, em minutos — eventos que cruzam a meia-noite são cortados. */
function clipToDay(event: CalendarEvent, day: Date): { startMinute: number; endMinute: number } | null {
  if (!event.start) return null;
  const dayStart = startOfDay(day);
  const start = parseISO(event.start);
  const end = event.end ? parseISO(event.end) : start;

  const rawStart = differenceInMinutes(start, dayStart);
  const rawEnd = differenceInMinutes(end, dayStart);
  // Começa depois do dia, ou começou antes e terminou até 00:00 dele.
  if (rawStart >= MINUTES_PER_DAY || (rawStart < 0 && rawEnd <= 0)) return null;

  const startMinute = Math.max(0, rawStart);
  return {
    startMinute,
    endMinute: Math.min(MINUTES_PER_DAY, Math.max(rawEnd, startMinute + MIN_BLOCK_MINUTES)),
  };
}

/** Distribui um grupo de eventos que se sobrepõem em colunas, primeira coluna livre. */
function assignColumns(cluster: PositionedEvent[]): void {
  const columnEnds: number[] = [];
  for (const item of cluster) {
    const free = columnEnds.findIndex((end) => end <= item.startMinute);
    const column = free === -1 ? columnEnds.length : free;
    columnEnds[column] = item.endMinute;
    item.column = column;
  }
  for (const item of cluster) item.columns = columnEnds.length;
}

/**
 * Eventos com horário de um dia, prontos para desenhar: quem se sobrepõe divide
 * a largura em colunas, como no Outlook.
 */
export function layoutDayEvents(events: CalendarEvent[], day: Date): PositionedEvent[] {
  const items = events
    .filter((event) => !isBannerEvent(event))
    .map((event) => {
      const span = clipToDay(event, day);
      return span ? { event, ...span, column: 0, columns: 1 } : null;
    })
    .filter((item): item is PositionedEvent => item !== null)
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

  let cluster: PositionedEvent[] = [];
  let clusterEnd = -1;
  for (const item of items) {
    if (cluster.length > 0 && item.startMinute >= clusterEnd) {
      assignColumns(cluster);
      cluster = [];
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMinute);
  }
  assignColumns(cluster);

  return items;
}
