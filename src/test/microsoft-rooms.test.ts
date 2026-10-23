import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCalendarEvent,
  getCalendarEvent,
  getRoomsAvailability,
  listCalendarEvents,
  listMeetingRooms,
  listOutlookCategories,
  toRoomAvailability,
  updateCalendarEvent,
} from '@/services/microsoftGraphService';
import { ROOM_AVAILABILITY } from '@/types/microsoftGraph';
import type { CalendarEventInput } from '@/types/microsoftGraph';

function mockGraph(...bodies: unknown[]) {
  const fetchMock = vi.fn();
  bodies.forEach((body) =>
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 })),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string);
}

const RAW_EVENT = {
  id: 'evt-1',
  subject: 'Planning',
  isAllDay: false,
  type: 'singleInstance',
  responseStatus: { response: 'organizer' },
  start: { dateTime: '2026-10-21T15:30:00' },
  end: { dateTime: '2026-10-21T16:30:00' },
  location: null,
  organizer: null,
  onlineMeeting: null,
  iCalUId: 'ical-1',
};

const BASE_INPUT: CalendarEventInput = {
  subject: 'Planning',
  start: '2026-10-21T15:30:00',
  end: '2026-10-21T16:30:00',
  attendees: ['aline@origamilab.com.br'],
  location: '',
  room: null,
  reminderMinutes: 15,
  categories: [],
  withTeamsMeeting: false,
  notes: '',
  recurrence: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listMeetingRooms', () => {
  it('normaliza, descarta sala sem e-mail e ordena por nome', async () => {
    mockGraph({
      value: [
        { emailAddress: 'Sala.Ipe@origamilab.com.br', displayName: 'Sala Ipê', capacity: 8, building: 'Sede', floorLabel: '' },
        { emailAddress: null, displayName: 'Sem caixa', capacity: null, building: null, floorLabel: null },
        { emailAddress: 'aquario@origamilab.com.br', displayName: 'Aquário', capacity: null, building: null, floorLabel: '2º' },
      ],
    });

    const rooms = await listMeetingRooms('token');

    expect(rooms.map((room) => room.name)).toEqual(['Aquário', 'Sala Ipê']);
    expect(rooms[1]).toEqual({
      email: 'sala.ipe@origamilab.com.br',
      name: 'Sala Ipê',
      capacity: 8,
      building: 'Sede',
      floorLabel: null,
    });
  });
});

describe('disponibilidade das salas', () => {
  it('qualquer compromisso não-livre na janela ocupa a sala', () => {
    expect(toRoomAvailability({ scheduleId: 'a', scheduleItems: [] })).toBe(ROOM_AVAILABILITY.FREE);
    expect(toRoomAvailability({ scheduleId: 'a', scheduleItems: [{ status: 'busy' }] })).toBe(
      ROOM_AVAILABILITY.BUSY,
    );
    expect(toRoomAvailability({ scheduleId: 'a', scheduleItems: [{ status: 'tentative' }] })).toBe(
      ROOM_AVAILABILITY.BUSY,
    );
    expect(toRoomAvailability({ scheduleId: 'a', error: { message: 'x' } })).toBe(
      ROOM_AVAILABILITY.UNKNOWN,
    );
  });

  it('pede o horário no fuso de São Paulo e indexa por e-mail minúsculo', async () => {
    const fetchMock = mockGraph({
      value: [
        { scheduleId: 'Sala.Ipe@origamilab.com.br', scheduleItems: [{ status: 'busy' }] },
        { scheduleId: 'aquario@origamilab.com.br', scheduleItems: [] },
      ],
    });

    const result = await getRoomsAvailability(
      'token',
      ['sala.ipe@origamilab.com.br', 'aquario@origamilab.com.br'],
      '2026-10-21T15:30:00',
      '2026-10-21T16:30:00',
    );

    expect(result).toEqual({
      'sala.ipe@origamilab.com.br': ROOM_AVAILABILITY.BUSY,
      'aquario@origamilab.com.br': ROOM_AVAILABILITY.FREE,
    });
    expect(sentBody(fetchMock).startTime).toEqual({
      dateTime: '2026-10-21T15:30:00',
      timeZone: 'America/Sao_Paulo',
    });
  });

  it('divide muitas salas em lotes', async () => {
    const emails = Array.from({ length: 25 }, (_, index) => `sala${index}@origamilab.com.br`);
    const fetchMock = mockGraph({ value: [] }, { value: [] });

    await getRoomsAvailability('token', emails, '2026-10-21T10:00:00', '2026-10-21T11:00:00');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBody(fetchMock, 0).schedules).toHaveLength(20);
    expect(sentBody(fetchMock, 1).schedules).toHaveLength(5);
  });
});

describe('reserva de sala no compromisso', () => {
  const room = { email: 'sala.ipe@origamilab.com.br', name: 'Sala Ipê' };

  it('na criação, a sala vai como convidado resource e como local de sala', async () => {
    const fetchMock = mockGraph(RAW_EVENT);

    await createCalendarEvent('token', { ...BASE_INPUT, room });

    const body = sentBody(fetchMock);
    expect(body.attendees).toEqual([
      { emailAddress: { address: 'aline@origamilab.com.br' }, type: 'required' },
      { emailAddress: { address: room.email, name: room.name }, type: 'resource' },
    ]);
    expect(body.location).toEqual({
      displayName: 'Sala Ipê',
      locationEmailAddress: room.email,
      locationType: 'conferenceRoom',
    });
  });

  it('sem sala e sem local, não envia location', async () => {
    const fetchMock = mockGraph(RAW_EVENT);

    await createCalendarEvent('token', BASE_INPUT);

    const body = sentBody(fetchMock);
    expect(body.location).toBeUndefined();
    expect(body.attendees).toHaveLength(1);
  });

  it('na edição, trocar sala por texto livre tira a sala dos convidados', async () => {
    const fetchMock = mockGraph(RAW_EVENT);

    await updateCalendarEvent('token', 'evt-1', {
      subject: 'Planning',
      start: BASE_INPUT.start,
      end: BASE_INPUT.end,
      attendees: [],
      location: 'Cliente — Av. Paulista',
      room: null,
      reminderMinutes: null,
      categories: [],
      notes: '',
    });

    const body = sentBody(fetchMock);
    expect(body.attendees).toEqual([]);
    expect(body.location).toEqual({ displayName: 'Cliente — Av. Paulista' });
    // Lembrete `null` desliga, sem mandar minutos.
    expect(body.isReminderOn).toBe(false);
    expect(body.reminderMinutesBeforeStart).toBeUndefined();
  });
});

describe('lembrete e categorias', () => {
  it('na criação, envia lembrete em minutos e as categorias pelo nome', async () => {
    const fetchMock = mockGraph(RAW_EVENT);

    await createCalendarEvent('token', {
      ...BASE_INPUT,
      reminderMinutes: 0,
      categories: ['Red category', 'Cliente'],
    });

    const body = sentBody(fetchMock);
    expect(body.isReminderOn).toBe(true);
    expect(body.reminderMinutesBeforeStart).toBe(0);
    expect(body.categories).toEqual(['Red category', 'Cliente']);
  });

  it('lê as categorias de cada evento da agenda', async () => {
    mockGraph({ value: [{ ...RAW_EVENT, categories: ['Red category'] }, RAW_EVENT] });

    const events = await listCalendarEvents('token', new Date(2026, 9, 1), new Date(2026, 9, 31));

    expect(events.map((event) => event.categories)).toEqual([['Red category'], []]);
  });

  it('no detalhe, lembrete desligado vira null e ligado traz os minutos', async () => {
    const detail = { ...RAW_EVENT, attendees: [], bodyPreview: '', isOrganizer: true, isCancelled: false, seriesMasterId: null };
    mockGraph(
      { ...detail, isReminderOn: false, reminderMinutesBeforeStart: 15 },
      { ...detail, isReminderOn: true, reminderMinutesBeforeStart: 30 },
    );

    expect((await getCalendarEvent('token', 'evt-1')).reminderMinutes).toBeNull();
    expect((await getCalendarEvent('token', 'evt-1')).reminderMinutes).toBe(30);
  });

  it('lista as categorias do Outlook em ordem, com "none" quando não há cor', async () => {
    mockGraph({
      value: [
        { id: '2', displayName: 'Red category', color: 'preset0' },
        { id: '1', displayName: 'Cliente', color: null },
      ],
    });

    expect(await listOutlookCategories('token')).toEqual([
      { id: '1', name: 'Cliente', color: 'none' },
      { id: '2', name: 'Red category', color: 'preset0' },
    ]);
  });
});
