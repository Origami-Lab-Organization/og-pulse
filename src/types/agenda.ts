import type { CalendarEvent, EventRoom } from '@/types/microsoftGraph';

/** Local do compromisso: sala reservada OU texto livre (endereço, "online"). */
export interface LocationValue {
  location: string;
  room: EventRoom | null;
}

/** Visões da Minha Agenda, como no Outlook. */
export const CALENDAR_VIEW = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export type CalendarView = (typeof CALENDAR_VIEW)[keyof typeof CALENDAR_VIEW];

/** Evento posicionado na coluna de um dia: minutos desde 00:00 e coluna lado a lado. */
export interface PositionedEvent {
  event: CalendarEvent;
  startMinute: number;
  endMinute: number;
  column: number;
  columns: number;
}
