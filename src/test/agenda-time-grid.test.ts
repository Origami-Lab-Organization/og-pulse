import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import {
  formatViewTitle,
  getViewRange,
  shiftViewDate,
} from '@/components/agenda/calendarGrid';
import { bannerEventsOfDay, isBannerEvent, layoutDayEvents } from '@/components/agenda/timeGridLayout';
import { CALENDAR_VIEW } from '@/types/agenda';
import type { CalendarEvent } from '@/types/microsoftGraph';

function event(id: string, start: string, end: string, isAllDay = false): CalendarEvent {
  return {
    id,
    subject: id,
    start,
    end,
    isAllDay,
    location: null,
    organizer: null,
    onlineMeetingUrl: null,
    isRecurring: false,
    myResponse: 'accepted',
    categories: [],
  };
}

const DAY = new Date(2026, 9, 21); // quarta, 21/10/2026

describe('getViewRange', () => {
  it('semana vai de domingo a sábado', () => {
    const { start, end } = getViewRange(CALENDAR_VIEW.WEEK, DAY);
    expect(format(start, 'yyyy-MM-dd')).toBe('2026-10-18');
    expect(format(end, 'yyyy-MM-dd HH:mm')).toBe('2026-10-24 23:59');
  });

  it('dia cobre só o próprio dia', () => {
    const { start, end } = getViewRange(CALENDAR_VIEW.DAY, DAY);
    expect(format(start, 'yyyy-MM-dd HH:mm')).toBe('2026-10-21 00:00');
    expect(format(end, 'yyyy-MM-dd HH:mm')).toBe('2026-10-21 23:59');
  });

  it('mês mantém a grade de semanas completas', () => {
    const { start, end } = getViewRange(CALENDAR_VIEW.MONTH, DAY);
    expect(format(start, 'yyyy-MM-dd')).toBe('2026-09-27');
    expect(format(end, 'yyyy-MM-dd')).toBe('2026-10-31');
  });
});

describe('shiftViewDate / formatViewTitle', () => {
  it('avança um período de cada visão', () => {
    expect(format(shiftViewDate(CALENDAR_VIEW.DAY, DAY, 1), 'yyyy-MM-dd')).toBe('2026-10-22');
    expect(format(shiftViewDate(CALENDAR_VIEW.WEEK, DAY, -1), 'yyyy-MM-dd')).toBe('2026-10-14');
    expect(format(shiftViewDate(CALENDAR_VIEW.MONTH, DAY, 1), 'yyyy-MM')).toBe('2026-11');
  });

  it('título da semana junta o mês quando cabe num só', () => {
    expect(formatViewTitle(CALENDAR_VIEW.WEEK, DAY)).toBe('18 – 24 de outubro de 2026');
    expect(formatViewTitle(CALENDAR_VIEW.WEEK, new Date(2026, 9, 1))).toBe('27 de set – 3 de out de 2026');
  });
});

describe('layoutDayEvents', () => {
  it('posiciona em minutos desde 00:00', () => {
    const [item] = layoutDayEvents([event('daily', '2026-10-21T10:00:00', '2026-10-21T10:30:00')], DAY);
    expect(item).toMatchObject({ startMinute: 600, endMinute: 630, column: 0, columns: 1 });
  });

  it('eventos sobrepostos dividem a largura; os seguintes voltam a ocupar tudo', () => {
    const items = layoutDayEvents(
      [
        event('a', '2026-10-21T10:00:00', '2026-10-21T11:00:00'),
        event('b', '2026-10-21T10:30:00', '2026-10-21T11:30:00'),
        event('c', '2026-10-21T14:00:00', '2026-10-21T15:00:00'),
      ],
      DAY,
    );
    const byId = Object.fromEntries(items.map((item) => [item.event.id, item]));
    expect(byId.a).toMatchObject({ column: 0, columns: 2 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    expect(byId.c).toMatchObject({ column: 0, columns: 1 });
  });

  it('reaproveita a coluna livre dentro do mesmo grupo', () => {
    const items = layoutDayEvents(
      [
        event('longo', '2026-10-21T09:00:00', '2026-10-21T12:00:00'),
        event('cedo', '2026-10-21T09:00:00', '2026-10-21T10:00:00'),
        event('tarde', '2026-10-21T10:00:00', '2026-10-21T11:00:00'),
      ],
      DAY,
    );
    const byId = Object.fromEntries(items.map((item) => [item.event.id, item]));
    expect(byId.tarde.column).toBe(byId.cedo.column);
    expect(byId.longo.columns).toBe(2);
  });

  it('corta evento que cruza a meia-noite e garante altura mínima', () => {
    const overnight = event('plantao', '2026-10-20T22:00:00', '2026-10-21T02:00:00');
    expect(layoutDayEvents([overnight], DAY)[0]).toMatchObject({ startMinute: 0, endMinute: 120 });

    const instant = event('lembrete', '2026-10-21T08:00:00', '2026-10-21T08:00:00');
    expect(layoutDayEvents([instant], DAY)[0].endMinute).toBe(500);
  });

  it('ignora evento que terminou exatamente à meia-noite do dia anterior', () => {
    const ended = event('ontem', '2026-10-20T23:00:00', '2026-10-21T00:00:00');
    expect(layoutDayEvents([ended], DAY)).toHaveLength(0);
  });
});

describe('faixa de dia inteiro', () => {
  const allDay = event('feriado', '2026-10-21T00:00:00', '2026-10-22T00:00:00', true);

  it('dia inteiro vai para a faixa, não para a grade', () => {
    expect(isBannerEvent(allDay)).toBe(true);
    expect(layoutDayEvents([allDay], DAY)).toHaveLength(0);
  });

  it('fim exclusivo: não aparece no dia seguinte', () => {
    expect(bannerEventsOfDay([allDay], DAY)).toHaveLength(1);
    expect(bannerEventsOfDay([allDay], new Date(2026, 9, 22))).toHaveLength(0);
  });
});
