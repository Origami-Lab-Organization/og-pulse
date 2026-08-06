/**
 * Cliente de leitura do Microsoft Graph.
 *
 * O access token vem da MSAL (ver integrations/microsoft/msalClient), que o
 * renova em silêncio. Este módulo só recebe o token como argumento — não o
 * obtém, não o guarda e não o registra em log.
 */

import {
  ATTENDEE_RESPONSE,
  ATTENDEE_TYPE,
  EVENT_TYPE,
  GRAPH_ERROR_CODE,
  GRAPH_WEEKDAYS,
  RECURRENCE_END,
  RECURRENCE_FREQUENCY,
} from '@/types/microsoftGraph';
import type {
  AttendeeResponse,
  CalendarEvent,
  CalendarEventCreated,
  CalendarEventDetail,
  CalendarEventInput,
  CalendarEventUpdate,
  EventAttendee,
  EventType,
  GraphErrorCode,
  MailMessage,
  RecurrenceFrequency,
  RecurrenceInput,
} from '@/types/microsoftGraph';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/**
 * Escopos delegados pedidos no consentimento. `Calendars.ReadWrite` cobre a
 * leitura e a criação de compromissos; o e-mail segue somente leitura. Os
 * escopos reservados (openid/profile/offline_access) são adicionados pela
 * própria MSAL e não devem ser repetidos aqui.
 */
export const GRAPH_SCOPES = ['Calendars.ReadWrite', 'Mail.Read'];

/** Fuso usado para o Graph devolver horários já convertidos. */
const GRAPH_TIMEZONE = 'America/Sao_Paulo';

export class GraphError extends Error {
  constructor(
    public readonly code: GraphErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GraphError';
  }
}

function mapStatusToCode(status: number): GraphErrorCode {
  if (status === 401) return GRAPH_ERROR_CODE.EXPIRED;
  if (status === 403) return GRAPH_ERROR_CODE.FORBIDDEN;
  return GRAPH_ERROR_CODE.UNKNOWN;
}

/**
 * Monta a query preservando as chaves OData (`$select`, `$orderby`) literais.
 * `URLSearchParams` escaparia o `$` para `%24`, que é fonte conhecida de
 * `ErrorInvalidUrlQuery` em alguns endpoints do Graph.
 */
function buildQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Código de erro que o Graph devolve (`error.code`), útil para diagnóstico.
 * Só o código e a mensagem da API são lidos — nunca o restante do corpo, que
 * pode conter dados do usuário.
 */
async function readGraphErrorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { code?: string } };
    return body.error?.code ?? String(response.status);
  } catch {
    return String(response.status);
  }
}

async function graphFetch<T>(
  token: string,
  url: string,
  init?: { method: string; body: unknown },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: `outlook.timezone="${GRAPH_TIMEZONE}"`,
      ...(init ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    const graphCode = await readGraphErrorCode(response);
    // Sem token e sem corpo no log — só o que identifica a falha da API.
    console.error(
      `[microsoft] Graph ${response.status} (${graphCode}) em ${new URL(url).pathname}`,
    );
    throw new GraphError(
      mapStatusToCode(response.status),
      `Microsoft Graph respondeu ${response.status} (${graphCode})`,
    );
  }

  // DELETE e as ações de cancelar/recusar respondem 204 sem corpo; chamar
  // json() aqui estouraria com "Unexpected end of JSON input".
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

function graphGet<T>(token: string, path: string): Promise<T> {
  return graphFetch<T>(token, `${GRAPH_BASE}${path}`);
}

interface GraphList<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

/** Páginas seguidas no máximo, para uma agenda absurdamente cheia não travar a tela. */
const MAX_PAGES = 10;

/**
 * Percorre todas as páginas do Graph. Sem isso, uma agenda movimentada é
 * truncada em silêncio no primeiro lote e a grade mostra um mês incompleto —
 * o que parece "o evento não foi criado".
 */
async function graphGetAll<T>(token: string, path: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | undefined = `${GRAPH_BASE}${path}`;
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const page: GraphList<T> = await graphFetch<GraphList<T>>(token, url);
    items.push(...page.value);
    url = page['@odata.nextLink'];
    pages += 1;
  }

  if (url) {
    console.warn(
      `[microsoft] intervalo com mais de ${MAX_PAGES} páginas — resultado truncado em ${items.length} itens`,
    );
  }

  return items;
}

interface RawEvent {
  id: string;
  subject: string | null;
  isAllDay: boolean;
  start: { dateTime: string } | null;
  end: { dateTime: string } | null;
  location: { displayName: string | null } | null;
  organizer: { emailAddress: { name: string | null } | null } | null;
  onlineMeeting: { joinUrl: string | null } | null;
}

interface RawMessage {
  id: string;
  subject: string | null;
  bodyPreview: string | null;
  receivedDateTime: string;
  isRead: boolean;
  webLink: string | null;
  from: { emailAddress: { name: string | null; address: string | null } | null } | null;
}

function toCalendarEvent(raw: RawEvent): CalendarEvent {
  return {
    id: raw.id,
    subject: raw.subject?.trim() || '(sem título)',
    start: raw.start?.dateTime ?? '',
    end: raw.end?.dateTime ?? '',
    isAllDay: raw.isAllDay,
    location: raw.location?.displayName || null,
    organizer: raw.organizer?.emailAddress?.name || null,
    onlineMeetingUrl: raw.onlineMeeting?.joinUrl || null,
  };
}

function toMailMessage(raw: RawMessage): MailMessage {
  const sender = raw.from?.emailAddress;
  return {
    id: raw.id,
    subject: raw.subject?.trim() || '(sem assunto)',
    from: sender?.name || sender?.address || 'Remetente desconhecido',
    preview: raw.bodyPreview?.trim() ?? '',
    receivedAt: raw.receivedDateTime,
    isRead: raw.isRead,
    webLink: raw.webLink,
  };
}

/** Eventos do calendário do próprio usuário dentro da janela informada. */
export async function listCalendarEvents(
  token: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalendarEvent[]> {
  const query = buildQuery({
    startDateTime: rangeStart.toISOString(),
    endDateTime: rangeEnd.toISOString(),
    $orderby: 'start/dateTime',
    $top: '100',
    $select: 'id,subject,start,end,isAllDay,location,organizer,onlineMeeting',
  });

  const events = await graphGetAll<RawEvent>(token, `/me/calendarView?${query}`);

  return events.map(toCalendarEvent);
}

/** Tipo de padrão do Graph para cada frequência do nosso formulário. */
const GRAPH_PATTERN_TYPE: Record<RecurrenceFrequency, string> = {
  [RECURRENCE_FREQUENCY.DAILY]: 'daily',
  [RECURRENCE_FREQUENCY.WEEKLY]: 'weekly',
  [RECURRENCE_FREQUENCY.MONTHLY]: 'absoluteMonthly',
  [RECURRENCE_FREQUENCY.YEARLY]: 'absoluteYearly',
};

/**
 * Traduz a recorrência do formulário para o formato do Graph.
 *
 * `startDate` é a data da primeira ocorrência e precisa acompanhar o padrão:
 * mensal usa o dia do mês dessa data, anual usa dia e mês. Semanal exige os
 * dias marcados, senão o Graph recusa com `ErrorInvalidRecurrencePattern`.
 */
function buildRecurrence(recurrence: RecurrenceInput, startDate: string) {
  const [, month, day] = startDate.split('-').map(Number);

  const pattern: Record<string, unknown> = {
    type: GRAPH_PATTERN_TYPE[recurrence.frequency],
    interval: recurrence.interval,
  };

  if (recurrence.frequency === RECURRENCE_FREQUENCY.WEEKLY) {
    pattern.daysOfWeek = recurrence.daysOfWeek;
    pattern.firstDayOfWeek = GRAPH_WEEKDAYS[0];
  }
  if (recurrence.frequency === RECURRENCE_FREQUENCY.MONTHLY) {
    pattern.dayOfMonth = day;
  }
  if (recurrence.frequency === RECURRENCE_FREQUENCY.YEARLY) {
    pattern.dayOfMonth = day;
    pattern.month = month;
  }

  const range =
    recurrence.end === RECURRENCE_END.ON_DATE
      ? { type: 'endDate', startDate, endDate: recurrence.endDate }
      : { type: 'noEnd', startDate };

  return {
    pattern,
    range: { ...range, recurrenceTimeZone: GRAPH_TIMEZONE },
  };
}

/**
 * Cria um compromisso na agenda do próprio usuário. O Graph devolve o evento
 * criado, já com o link do Teams quando a reunião online foi pedida.
 */
export async function createCalendarEvent(
  token: string,
  input: CalendarEventInput,
): Promise<CalendarEventCreated> {
  const body = {
    subject: input.subject,
    start: { dateTime: input.start, timeZone: GRAPH_TIMEZONE },
    end: { dateTime: input.end, timeZone: GRAPH_TIMEZONE },
    attendees: input.attendees.map((address) => ({
      emailAddress: { address },
      type: ATTENDEE_TYPE.REQUIRED,
    })),
    ...(input.location ? { location: { displayName: input.location } } : {}),
    isOnlineMeeting: input.withTeamsMeeting,
    ...(input.withTeamsMeeting ? { onlineMeetingProvider: 'teamsForBusiness' } : {}),
    ...(input.notes ? { body: { contentType: 'text', content: input.notes } } : {}),
    ...(input.recurrence
      ? { recurrence: buildRecurrence(input.recurrence, input.start.slice(0, 10)) }
      : {}),
  };

  const created = await graphFetch<RawEvent & { iCalUId: string | null }>(
    token,
    `${GRAPH_BASE}/me/events`,
    { method: 'POST', body },
  );

  return { ...toCalendarEvent(created), icalUid: created.iCalUId ?? '' };
}

interface RawEventDetail extends RawEvent {
  iCalUId: string | null;
  bodyPreview: string | null;
  isOrganizer: boolean;
  isCancelled: boolean;
  type: string | null;
  seriesMasterId: string | null;
  organizer: {
    emailAddress: { name: string | null; address: string | null } | null;
  } | null;
  attendees: {
    type: string;
    status: { response: string } | null;
    emailAddress: { name: string | null; address: string | null } | null;
  }[];
}

function toAttendee(raw: RawEventDetail['attendees'][number]): EventAttendee {
  const contact = raw.emailAddress;
  return {
    name: contact?.name || contact?.address || 'Convidado',
    email: contact?.address ?? '',
    isRequired: raw.type === ATTENDEE_TYPE.REQUIRED,
    response: (raw.status?.response as AttendeeResponse) ?? ATTENDEE_RESPONSE.NONE,
  };
}

/**
 * Separador que o Outlook insere antes do bloco automático da reunião do Teams
 * ("____...", seguido de link, ID e senha).
 */
const TEAMS_BOILERPLATE_SEPARATOR = /_{10,}/;

/**
 * Descrição sem o bloco automático do Teams. Além de ser ruído — o link de
 * entrada já vira botão próprio na UI —, a régua de sublinhados não tem ponto
 * de quebra e estoura a largura do container onde for renderizada.
 */
function cleanEventPreview(bodyPreview: string | null): string {
  const [humanPart] = (bodyPreview ?? '').split(TEAMS_BOILERPLATE_SEPARATOR);
  return humanPart.replace(/\n{3,}/g, '\n\n').trim();
}

/** Detalhe completo de um evento, carregado só quando a pessoa abre o card. */
export async function getCalendarEvent(
  token: string,
  eventId: string,
): Promise<CalendarEventDetail> {
  const query = buildQuery({
    $select:
      'id,iCalUId,subject,start,end,isAllDay,location,organizer,onlineMeeting,bodyPreview,isOrganizer,isCancelled,attendees,type,seriesMasterId',
  });

  const raw = await graphGet<RawEventDetail>(
    token,
    `/me/events/${encodeURIComponent(eventId)}?${query}`,
  );

  return {
    ...toCalendarEvent(raw),
    icalUid: raw.iCalUId ?? '',
    organizerEmail: raw.organizer?.emailAddress?.address ?? null,
    attendees: (raw.attendees ?? []).map(toAttendee),
    isOrganizer: raw.isOrganizer,
    isCancelled: raw.isCancelled,
    eventType: (raw.type as EventType) ?? EVENT_TYPE.SINGLE,
    seriesMasterId: raw.seriesMasterId ?? null,
    preview: cleanEventPreview(raw.bodyPreview),
  };
}

/**
 * Altera um compromisso existente. Só o organizador pode; os convidados
 * recebem a atualização automaticamente.
 *
 * `notes` vazio omite o corpo do PATCH de propósito: enviar string vazia
 * apagaria a descrição, e numa reunião do Teams isso destruiria o bloco com o
 * link de ingresso. A recorrência não é alterada aqui — mudar padrão de série
 * segue no Outlook.
 */
export async function updateCalendarEvent(
  token: string,
  eventId: string,
  input: CalendarEventUpdate,
): Promise<CalendarEvent> {
  const body = {
    subject: input.subject,
    start: { dateTime: input.start, timeZone: GRAPH_TIMEZONE },
    end: { dateTime: input.end, timeZone: GRAPH_TIMEZONE },
    location: { displayName: input.location },
    attendees: input.attendees.map((address) => ({
      emailAddress: { address },
      type: ATTENDEE_TYPE.REQUIRED,
    })),
    ...(input.notes ? { body: { contentType: 'text', content: input.notes } } : {}),
  };

  const updated = await graphFetch<RawEvent>(
    token,
    `${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', body },
  );

  return toCalendarEvent(updated);
}

/**
 * Cancela a reunião e envia o aviso aos convidados. Só o organizador pode.
 * O evento sai da agenda de todos.
 */
export async function cancelCalendarEvent(
  token: string,
  eventId: string,
  comment: string,
): Promise<void> {
  await graphFetch<void>(
    token,
    `${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}/cancel`,
    { method: 'POST', body: { comment } },
  );
}

/** Remove o compromisso da própria agenda. Usado quando não há convidados. */
export async function deleteCalendarEvent(token: string, eventId: string): Promise<void> {
  await graphFetch<void>(
    token,
    `${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE', body: undefined },
  );
}

/** Recusa um convite recebido e responde ao organizador. */
export async function declineCalendarEvent(
  token: string,
  eventId: string,
  comment: string,
): Promise<void> {
  await graphFetch<void>(
    token,
    `${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}/decline`,
    { method: 'POST', body: { comment, sendResponse: true } },
  );
}

/** Mensagens mais recentes da caixa de entrada do próprio usuário. */
export async function listRecentMessages(
  token: string,
  top = 15,
): Promise<MailMessage[]> {
  const params = new URLSearchParams({
    $orderby: 'receivedDateTime desc',
    $top: String(top),
    $select: 'id,subject,bodyPreview,receivedDateTime,isRead,webLink,from',
  });

  const data = await graphGet<GraphList<RawMessage>>(
    token,
    `/me/mailFolders/inbox/messages?${params.toString()}`,
  );

  return data.value.map(toMailMessage);
}
