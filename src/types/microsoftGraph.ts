/** Contratos de leitura do Microsoft Graph (agenda e caixa de entrada). */

/** Códigos canônicos de falha do Graph — compare sempre pelo membro nomeado. */
export const GRAPH_ERROR_CODE = {
  /** Token do provedor expirou (401) — exige reconexão. */
  EXPIRED: 'expired',
  /** Escopo/consentimento insuficiente (403). */
  FORBIDDEN: 'forbidden',
  UNKNOWN: 'unknown',
} as const;

export type GraphErrorCode =
  (typeof GRAPH_ERROR_CODE)[keyof typeof GRAPH_ERROR_CODE];

export interface CalendarEvent {
  id: string;
  subject: string;
  /** ISO local já convertido para o fuso pedido ao Graph. */
  start: string;
  end: string;
  isAllDay: boolean;
  location: string | null;
  organizer: string | null;
  onlineMeetingUrl: string | null;
}

/** Resposta do convidado ao convite, como o Graph reporta. */
export const ATTENDEE_RESPONSE = {
  ORGANIZER: 'organizer',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  TENTATIVE: 'tentativelyAccepted',
  NOT_RESPONDED: 'notResponded',
  NONE: 'none',
} as const;

export type AttendeeResponse =
  (typeof ATTENDEE_RESPONSE)[keyof typeof ATTENDEE_RESPONSE];

/** Papel do convidado no evento. `resource` é sala/recurso. */
export const ATTENDEE_TYPE = {
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  RESOURCE: 'resource',
} as const;

export interface EventAttendee {
  name: string;
  email: string;
  isRequired: boolean;
  response: AttendeeResponse;
}

/** Evento com os dados completos, carregado ao abrir o detalhe. */
export interface CalendarEventDetail extends CalendarEvent {
  /**
   * Identidade da reunião entre caixas de correio distintas. É por aqui que o
   * vínculo de rito reconhece a mesma reunião na agenda de outra pessoa — o
   * `id` do Graph é por caixa e não serve. Ver ADR-0011.
   */
  icalUid: string;
  organizerEmail: string | null;
  attendees: EventAttendee[];
  eventType: EventType;
  /** Id da série, quando este evento é uma ocorrência dentro dela. */
  seriesMasterId: string | null;
  /** O usuário logado organiza este evento (define quais ações são possíveis). */
  isOrganizer: boolean;
  isCancelled: boolean;
  /** Texto puro da descrição. O HTML do corpo não é renderizado, por segurança. */
  preview: string;
}

/** Ações possíveis sobre um evento existente. */
export const EVENT_ACTION = {
  /** Organizador cancela e avisa os convidados. */
  CANCEL: 'cancel',
  /** Remove da própria agenda (evento sem convidados). */
  DELETE: 'delete',
  /** Convidado recusa e responde ao organizador. */
  DECLINE: 'decline',
} as const;

export type EventAction = (typeof EVENT_ACTION)[keyof typeof EVENT_ACTION];

/** Frequência da repetição, na nomenclatura do nosso formulário. */
export const RECURRENCE_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export type RecurrenceFrequency =
  (typeof RECURRENCE_FREQUENCY)[keyof typeof RECURRENCE_FREQUENCY];

/** Como a série termina. */
export const RECURRENCE_END = {
  ON_DATE: 'onDate',
  NEVER: 'never',
} as const;

export type RecurrenceEnd = (typeof RECURRENCE_END)[keyof typeof RECURRENCE_END];

/** Dias da semana na ordem do Graph (índice = getDay() do JavaScript). */
export const GRAPH_WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type GraphWeekday = (typeof GRAPH_WEEKDAYS)[number];

export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  /** Repetir a cada N dias/semanas/meses/anos. */
  interval: number;
  /** Só usado em `weekly`. */
  daysOfWeek: GraphWeekday[];
  end: RecurrenceEnd;
  /** Data final (yyyy-MM-dd) quando `end` é `onDate`. */
  endDate: string;
}

/** Tipo do evento dentro de uma série, como o Graph classifica. */
export const EVENT_TYPE = {
  SINGLE: 'singleInstance',
  OCCURRENCE: 'occurrence',
  EXCEPTION: 'exception',
  SERIES_MASTER: 'seriesMaster',
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

/**
 * Dados para criar um compromisso. `start`/`end` são horários locais no fuso
 * do usuário (sem sufixo Z) — o fuso vai declarado à parte para o Graph.
 */
export interface CalendarEventInput {
  subject: string;
  start: string;
  end: string;
  /** E-mails dos convidados; opcional. */
  attendees: string[];
  /** Local livre — sala, endereço ou "online". Opcional. */
  location: string;
  /** Cria a reunião do Teams e devolve o link de entrada. */
  withTeamsMeeting: boolean;
  notes: string;
  /** Série recorrente; `null` cria compromisso único. */
  recurrence: RecurrenceInput | null;
}

/**
 * Evento recém-criado. Carrega o `icalUid` porque é ele que permite vincular um
 * rito logo após a criação — a identidade só existe depois que o Graph cria.
 */
export interface CalendarEventCreated extends CalendarEvent {
  icalUid: string;
}

/**
 * Alteração de um compromisso existente. `notes` vazio significa "manter a
 * descrição atual" — enviar vazio apagaria o corpo do evento, que numa reunião
 * do Teams carrega o bloco de ingresso.
 */
export interface CalendarEventUpdate {
  subject: string;
  start: string;
  end: string;
  attendees: string[];
  location: string;
  notes: string;
}

/** Estado bruto da MSAL, exibido em tela durante a investigação da conexão. */
export interface MicrosoftDiagnostics {
  configured: boolean;
  accounts: number;
  hasActiveAccount: boolean;
  msalKeys: number;
  sampleKeys: string[];
}

export interface MailMessage {
  id: string;
  subject: string;
  from: string;
  preview: string;
  receivedAt: string;
  isRead: boolean;
  webLink: string | null;
}
