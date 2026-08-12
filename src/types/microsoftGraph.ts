/** Contratos de leitura do Microsoft Graph (agenda e caixa de entrada). */

/** Códigos canônicos de falha do Graph — compare sempre pelo membro nomeado. */
export const GRAPH_ERROR_CODE = {
  /** Token do provedor expirou (401) — exige reconexão. */
  EXPIRED: 'expired',
  /** Escopo/consentimento insuficiente (403). */
  FORBIDDEN: 'forbidden',
  /** Item não existe mais (404) — ex.: evento removido ao recusar. */
  NOT_FOUND: 'not_found',
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
  /** Faz parte de uma série recorrente. */
  isRecurring: boolean;
  /** Minha resposta ao convite — dirige o destaque na grade, como no Outlook. */
  myResponse: string;
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

/**
 * Classificação de importância que a própria Microsoft calcula — é o que
 * alimenta as abas "Prioritários" e "Outros" da Caixa de Entrada Destaques do
 * Outlook. Não é heurística nossa.
 */
export const MAIL_CLASSIFICATION = {
  FOCUSED: 'focused',
  OTHER: 'other',
} as const;

export type MailClassification =
  (typeof MAIL_CLASSIFICATION)[keyof typeof MAIL_CLASSIFICATION];

/** Tipos de e-mail de reunião que a UI trata (subconjunto do Graph). */
export const MEETING_MESSAGE_TYPE = {
  REQUEST: 'meetingRequest',
  CANCELLED: 'meetingCancelled',
} as const;

/** Respostas possíveis a um convite, nos nomes das ações do Graph. */
export const INVITE_RESPONSE = {
  ACCEPT: 'accept',
  TENTATIVE: 'tentativelyAccept',
  DECLINE: 'decline',
} as const;

export type InviteResponse =
  (typeof INVITE_RESPONSE)[keyof typeof INVITE_RESPONSE];

/** Convite de reunião embutido num e-mail (`eventMessage` do Graph). */
export interface MeetingInvite {
  eventId: string;
  meetingMessageType: string;
  /** Minha resposta atual — destaca o botão ativo. */
  myResponse: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location: string | null;
  organizer: string | null;
}

/**
 * Mensagem completa, carregada ao abrir.
 *
 * O corpo vem como o remetente enviou — quase sempre HTML. Ele NUNCA é inserido
 * na nossa página: renderiza dentro de um iframe restrito (ver MessageBody), que
 * é o que permite mostrar formatação e imagem sem abrir porta para XSS.
 */
export interface MailMessageDetail extends MailMessage {
  to: string[];
  cc: string[];
  body: string;
  bodyIsHtml: boolean;
  hasAttachments: boolean;
  /** Referências `cid:` sem anexo correspondente — alimenta o diagnóstico em dev. */
  unresolvedImageRefs: string[];
  /** Chaves que os anexos oferecem — o outro lado da comparação, para o diagnóstico. */
  inlineAttachmentKeys: string[];
  /** Presente quando o e-mail é um convite de reunião respondível. */
  meetingInvite: MeetingInvite | null;
}

export interface MailMessage {
  id: string;
  subject: string;
  from: string;
  preview: string;
  receivedAt: string;
  isRead: boolean;
  webLink: string | null;
  classification: MailClassification;
}

// ─── OneDrive / SharePoint (ADR-0019) ─────────────────────────────────────────

/** Pasta do OneDrive como o Pulse precisa dela: identidade + rótulo. */
export interface DriveFolder {
  /** driveItem id. */
  id: string;
  /** Drive onde o item vive — precisa ser guardado junto: id sozinho não resolve. */
  driveId: string;
  name: string;
  /** Caminho legível para mostrar ao GP (ex.: "/Documentos/Clientes"). */
  path: string;
  childFolderCount: number;
}

/** Vínculo do projeto com a pasta raiz escolhida no OneDrive. */
export interface ProjectDriveLink {
  driveId: string;
  rootItemId: string;
  rootPath: string;
  linkedAt: string;
}

export interface LinkProjectDriveInput {
  projectId: string;
  driveId: string;
  rootItemId: string;
  rootPath: string;
  linkedBy?: string | null;
}

/** Item dentro da pasta raiz do projeto: pasta ou arquivo. */
export interface DriveEntry {
  id: string;
  driveId: string;
  name: string;
  isFolder: boolean;
  /** Bytes. 0 para pasta. */
  size: number;
  lastModifiedAt: string;
  /** Nome de quem alterou por último, como o OneDrive exibe. */
  lastModifiedBy: string | null;
  /** Link para abrir no OneDrive; null quando o Graph não devolve. */
  webUrl: string | null;
  childCount: number;
}

/** Nó da varredura da árvore do projeto, achatado com o vínculo de pai. */
export interface DriveTreeNode {
  externalId: string;
  name: string;
  parentExternalId: string | null;
}

export type DrivePermissionRole = 'read' | 'write' | 'owner';

/** Quem tem acesso a um item, como o Pulse precisa exibir. */
export interface DrivePermission {
  id: string;
  /** Nome de quem recebeu; para link de compartilhamento, descreve o escopo. */
  displayName: string;
  email: string | null;
  role: DrivePermissionRole;
  /** Texto fiel do papel — usa o valor cru quando o vocabulário é desconhecido. */
  roleLabel: string;
  /** Veio de um link de compartilhamento, não de concessão nominal. */
  isLink: boolean;
  /** Herdado da pasta acima — só pode ser removido na pasta de origem. */
  isInherited: boolean;
  /** Falso quando remover exigiria apagar o link inteiro ou é dono/herdado. */
  isRevocable: boolean;
}
