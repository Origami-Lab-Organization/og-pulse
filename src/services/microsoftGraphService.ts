/**
 * Cliente de leitura do Microsoft Graph.
 *
 * O access token vem da MSAL (ver integrations/microsoft/msalClient), que o
 * renova em silêncio. Este módulo só recebe o token como argumento — não o
 * obtém, não o guarda e não o registra em log.
 */

import {
  ATTENDEE_RESPONSE,
  MAIL_CLASSIFICATION,
  ATTENDEE_TYPE,
  EVENT_TYPE,
  GRAPH_ERROR_CODE,
  GRAPH_WEEKDAYS,
  RECURRENCE_END,
  RECURRENCE_FREQUENCY,
} from '@/types/microsoftGraph';
import type {
  AttendeeResponse,
  MailClassification,
  CalendarEvent,
  CalendarEventCreated,
  CalendarEventDetail,
  CalendarEventInput,
  CalendarEventUpdate,
  EventAttendee,
  EventType,
  GraphErrorCode,
  InviteResponse,
  MailMessage,
  MailMessageDetail,
  MeetingInvite,
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
  if (status === 404) return GRAPH_ERROR_CODE.NOT_FOUND;
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

interface GraphRequestInit {
  method?: string;
  body?: unknown;
  /** Valores extra do header `Prefer`, somados ao fuso. */
  prefer?: string[];
}

async function graphFetch<T>(
  token: string,
  url: string,
  init?: GraphRequestInit,
): Promise<T> {
  const method = init?.method || 'GET';
  const sendsBody = method !== 'GET' && init?.body !== undefined;
  const prefer = [`outlook.timezone="${GRAPH_TIMEZONE}"`, ...(init?.prefer ?? [])];

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: prefer.join(', '),
      ...(sendsBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: sendsBody ? JSON.stringify(init.body) : undefined,
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

  // Ações (aceitar/recusar/cancelar) respondem 202/204 SEM corpo. Fazer parse
  // de JSON do vazio estoura DEPOIS do sucesso — o clássico "enviou mas deu
  // erro". Corpo vazio em sucesso é resultado, não falha.
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
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
  type: string | null;
  responseStatus: { response: string | null } | null;
  start: { dateTime: string } | null;
  end: { dateTime: string } | null;
  location: { displayName: string | null } | null;
  organizer: { emailAddress: { name: string | null } | null } | null;
  onlineMeeting: { joinUrl: string | null } | null;
}

interface RawMessage {
  id: string;
  inferenceClassification: string | null;
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
    isRecurring:
      raw.type === EVENT_TYPE.OCCURRENCE ||
      raw.type === EVENT_TYPE.EXCEPTION ||
      raw.type === EVENT_TYPE.SERIES_MASTER,
    myResponse: raw.responseStatus?.response ?? ATTENDEE_RESPONSE.NONE,
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
    classification:
      raw.inferenceClassification === MAIL_CLASSIFICATION.OTHER
        ? MAIL_CLASSIFICATION.OTHER
        : MAIL_CLASSIFICATION.FOCUSED,
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
    $select:
      'id,subject,start,end,isAllDay,location,organizer,onlineMeeting,type,responseStatus',
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
      'id,iCalUId,subject,start,end,isAllDay,location,organizer,onlineMeeting,bodyPreview,isOrganizer,isCancelled,attendees,type,seriesMasterId,responseStatus',
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
    { method: 'DELETE' },
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

/** Uma página de mensagens, com o ponteiro para a próxima. */
export interface MailPage {
  messages: MailMessage[];
  /** URL opaca do Graph para a página seguinte; ausente no fim da lista. */
  nextLink: string | null;
}

/**
 * Página da caixa de entrada, da mais recente para a mais antiga.
 *
 * NÃO filtra por classificação de propósito. O Graph recusa `$filter` de
 * `inferenceClassification` junto com `$orderby` de `receivedDateTime`, e sem a
 * ordenação a primeira página vem do começo da caixa — ou seja, os e-mails mais
 * ANTIGOS. Ordenar depois no cliente não resolve: os recentes ficariam na última
 * página. Entre ter ordem correta e ter paginação por aba, a ordem importa mais;
 * a separação Prioritários/Outros é feita no cliente sobre o que já veio.
 */
export async function listInboxPage(
  token: string,
  options: { top: number; nextLink?: string | null },
): Promise<MailPage> {
  const url =
    options.nextLink ??
    `${GRAPH_BASE}/me/mailFolders/inbox/messages?${buildQuery({
      $orderby: 'receivedDateTime desc',
      $top: String(options.top),
      $select:
        'id,subject,bodyPreview,receivedDateTime,isRead,webLink,from,inferenceClassification',
    })}`;

  const data = await graphFetch<GraphList<RawMessage>>(token, url);

  return {
    messages: data.value.map(toMailMessage),
    nextLink: data['@odata.nextLink'] ?? null,
  };
}

/**
 * Busca na caixa de entrada, no mesmo espírito da barra do Outlook: procura em
 * remetente, assunto e corpo.
 *
 * O Graph **não aceita `$search` junto com `$filter` nem com `$orderby`** em
 * mensagens. Por isso a busca ignora a separação Prioritários/Outros e vem por
 * relevância, não por data — que é também como o Outlook se comporta ao buscar.
 */
export async function searchInboxPage(
  token: string,
  query: string,
  options: { top: number; nextLink?: string | null },
): Promise<MailPage> {
  // Aspas quebrariam a expressão KQL de `$search="..."`.
  const term = query.replace(/"/g, ' ').trim();

  const url =
    options.nextLink ??
    `${GRAPH_BASE}/me/mailFolders/inbox/messages?${buildQuery({
      $search: `"${term}"`,
      $top: String(options.top),
      $select:
        'id,subject,bodyPreview,receivedDateTime,isRead,webLink,from,inferenceClassification',
    })}`;

  const data = await graphFetch<GraphList<RawMessage>>(token, url);

  return {
    messages: data.value.map(toMailMessage),
    nextLink: data['@odata.nextLink'] ?? null,
  };
}

interface RawMessageDetail extends RawMessage {
  '@odata.type'?: string;
  body: { contentType: string; content: string } | null;
  hasAttachments: boolean;
  toRecipients: { emailAddress: { name: string | null; address: string | null } | null }[];
  ccRecipients: { emailAddress: { name: string | null; address: string | null } | null }[];
}

function recipientNames(
  list: RawMessageDetail['toRecipients'] | undefined,
): string[] {
  return (list ?? [])
    .map((item) => item.emailAddress?.name || item.emailAddress?.address || '')
    .filter(Boolean);
}

interface RawAttachment {
  id: string;
  contentId: string | null;
  contentType: string | null;
  contentBytes?: string;
  size: number;
}

/** Anexo embutido acima disso não vira data URI — inflaria o HTML sem ganho. */
const MAX_INLINE_ATTACHMENT_BYTES = 2 * 1024 * 1024;

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * O `contentId` às vezes vem entre sinais de menor/maior (`<abc@host>`) e o HTML
 * referencia sem eles (`cid:abc@host`). Comparar sem normalizar é o motivo
 * clássico de "algumas imagens aparecem e outras não".
 */
function normalizeContentId(contentId: string): string {
  return contentId.replace(/^<|>$/g, '').trim();
}

/** Todas as referências `cid:` do corpo, como aparecem, sem duplicatas. */
function extractCidRefs(html: string): string[] {
  const refs = new Set<string>();
  const pattern = /cid:([^"'\s>)]+)/gi;
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(html)) !== null) {
    refs.add(found[1]);
  }
  return [...refs];
}

interface InlineImageAttachment extends RawAttachment {
  name: string | null;
  contentLocation: string | null;
  isInline: boolean;
}

/**
 * Chaves pelas quais o corpo pode referenciar este anexo. O caso óbvio é o
 * `contentId`, mas há remetente (Apple Mail, assinaturas geradas) que usa o
 * NOME do arquivo ou o `contentLocation` no `cid:` — só o contentId perde essas,
 * e é a causa recorrente de "a assinatura não aparece".
 */
function attachmentKeys(attachment: InlineImageAttachment): string[] {
  const keys: string[] = [];
  if (attachment.contentId) {
    const id = normalizeContentId(attachment.contentId);
    keys.push(id);
    // O Outlook grava `uuid@sufixo` no anexo e referencia só `uuid` no HTML —
    // a parte local precisa contar como chave, senão o caso mais comum falha.
    const localPart = id.split('@')[0];
    if (localPart && localPart !== id) keys.push(localPart);
  }
  if (attachment.name) keys.push(attachment.name.trim());
  if (attachment.contentLocation) {
    keys.push(attachment.contentLocation.trim());
    const basename = attachment.contentLocation.split('/').pop();
    if (basename) keys.push(basename.trim());
  }
  return keys.filter(Boolean).map((key) => key.toLowerCase());
}

/** A referência pode vir URL-encodada (`%40` no lugar de `@`) e com sufixo `@`. */
function refCandidates(ref: string): string[] {
  const forms = [ref];
  try {
    forms.push(decodeURIComponent(ref));
  } catch {
    // Referência com % solto não decodifica — segue só a forma crua.
  }

  const candidates = new Set<string>();
  for (const form of forms) {
    const lower = form.toLowerCase();
    candidates.add(lower);
    const localPart = lower.split('@')[0];
    if (localPart) candidates.add(localPart);
  }
  return [...candidates];
}

interface InlineImagesResult {
  html: string;
  /** Referências `cid:` que nenhum anexo cobriu — vai para o diagnóstico em dev. */
  unresolvedRefs: string[];
  /** Chaves oferecidas pelos anexos — o outro lado da comparação, para o diagnóstico. */
  attachmentKeys: string[];
}

/**
 * Troca as referências `cid:` do corpo por data URIs.
 *
 * Imagem colada no e-mail (logo de assinatura, print) viaja como anexo e é
 * referenciada por `cid:`, que o navegador não resolve — sem esta substituição
 * ela não aparece, com qualquer CSP. Dois passos de propósito: lista barata sem
 * bytes, download só do que o corpo cita. Falha aqui não impede exibir o
 * e-mail; ele abre sem as imagens embutidas.
 */
async function resolveInlineImages(
  token: string,
  messageId: string,
  html: string,
): Promise<InlineImagesResult> {
  const refs = extractCidRefs(html);
  if (!refs.length) return { html, unresolvedRefs: [], attachmentKeys: [] };

  try {
    // $select só com propriedades do tipo base `attachment`: contentId e
    // contentLocation são do derivado fileAttachment e derrubam a listagem
    // inteira ("lista de anexos vazia"). Eles vêm na busca individual abaixo.
    const listQuery = buildQuery({ $select: 'id,name,contentType,size,isInline' });
    const list = await graphFetch<GraphList<InlineImageAttachment>>(
      token,
      `${GRAPH_BASE}/me/messages/${encodeURIComponent(messageId)}/attachments?${listQuery}`,
    );

    const candidates = list.value.filter(
      (item) =>
        item.size <= MAX_INLINE_ATTACHMENT_BYTES &&
        (item.isInline || (item.contentType ?? '').toLowerCase().startsWith('image/')),
    );

    const fullAttachments = await Promise.all(
      candidates.map((item) =>
        graphFetch<InlineImageAttachment>(
          token,
          `${GRAPH_BASE}/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(item.id)}`,
        ),
      ),
    );

    let resolvedHtml = html;
    const unresolvedRefs: string[] = [];
    for (const ref of refs) {
      const match = fullAttachments.find((attachment) =>
        refCandidates(ref).some((candidate) =>
          attachmentKeys(attachment).includes(candidate),
        ),
      );
      if (!match?.contentBytes || !match.contentType) {
        unresolvedRefs.push(ref);
        continue;
      }
      const dataUri = `data:${match.contentType};base64,${match.contentBytes}`;
      resolvedHtml = resolvedHtml.replace(
        new RegExp(`cid:${escapeForRegExp(ref)}`, 'gi'),
        dataUri,
      );
    }

    const attachmentKeysFound = fullAttachments.flatMap(attachmentKeys);
    return { html: resolvedHtml, unresolvedRefs, attachmentKeys: attachmentKeysFound };
  } catch (error) {
    const code = error instanceof GraphError ? error.message : 'erro inesperado';
    console.error('[microsoft] falha ao carregar imagens embutidas:', code);
    if (!(error instanceof GraphError)) throw error;
    // O código do erro vai como "chave" para o diagnóstico em dev distinguir
    // consulta que FALHOU de mensagem que realmente não tem anexos.
    return { html, unresolvedRefs: refs, attachmentKeys: [`(erro: ${code})`] };
  }
}

/** Anexo visível para download (embutidos ficam fora: já aparecem no corpo). */
export interface MailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

interface RawAttachmentMeta extends RawAttachment {
  name: string | null;
  isInline: boolean;
}

/** Anexos da mensagem, sem baixar conteúdo — só o suficiente para listar. */
export async function listMessageAttachments(
  token: string,
  messageId: string,
): Promise<MailAttachment[]> {
  const query = buildQuery({ $select: 'id,name,contentType,size,isInline' });

  const data = await graphFetch<GraphList<RawAttachmentMeta>>(
    token,
    `${GRAPH_BASE}/me/messages/${encodeURIComponent(messageId)}/attachments?${query}`,
  );

  return data.value
    .filter((item) => !item.isInline)
    .map((item) => ({
      id: item.id,
      name: item.name?.trim() || 'anexo',
      contentType: item.contentType ?? 'application/octet-stream',
      size: item.size,
    }));
}

/** Conteúdo de um anexo, em base64 como o Graph devolve. */
export async function fetchAttachmentContent(
  token: string,
  messageId: string,
  attachmentId: string,
): Promise<{ name: string; contentType: string; contentBytes: string }> {
  const raw = await graphFetch<RawAttachmentMeta>(
    token,
    `${GRAPH_BASE}/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );

  if (!raw.contentBytes) {
    throw new GraphError(
      GRAPH_ERROR_CODE.UNKNOWN,
      'Este anexo não tem conteúdo baixável (pode ser um item do Outlook ou link).',
    );
  }

  return {
    name: raw.name?.trim() || 'anexo',
    contentType: raw.contentType ?? 'application/octet-stream',
    contentBytes: raw.contentBytes,
  };
}

interface RawEventMessage {
  meetingMessageType: string | null;
  event: {
    id: string;
    start: { dateTime: string } | null;
    end: { dateTime: string } | null;
    isAllDay: boolean;
    location: { displayName: string | null } | null;
    organizer: { emailAddress: { name: string | null } | null } | null;
    responseStatus: { response: string | null } | null;
  } | null;
}

/**
 * Dados do convite quando o e-mail é um `eventMessage`. Segunda chamada de
 * propósito: `meetingMessageType` é do tipo derivado, e pedi-lo no GET de uma
 * mensagem comum derruba a consulta — mesma armadilha dos anexos. Falha aqui é
 * não-fatal: o e-mail abre sem o cartão de convite.
 */
async function fetchMeetingInvite(
  token: string,
  messageId: string,
): Promise<MeetingInvite | null> {
  try {
    const query = buildQuery({
      $select: 'meetingMessageType',
      $expand: 'event($select=id,start,end,isAllDay,location,organizer,responseStatus)',
    });
    const raw = await graphFetch<RawEventMessage>(
      token,
      `${GRAPH_BASE}/me/messages/${encodeURIComponent(messageId)}?${query}`,
    );

    if (!raw.event || !raw.meetingMessageType) return null;

    return {
      eventId: raw.event.id,
      meetingMessageType: raw.meetingMessageType,
      start: raw.event.start?.dateTime ?? '',
      end: raw.event.end?.dateTime ?? '',
      isAllDay: raw.event.isAllDay,
      location: raw.event.location?.displayName || null,
      organizer: raw.event.organizer?.emailAddress?.name || null,
      myResponse: raw.event.responseStatus?.response ?? ATTENDEE_RESPONSE.NONE,
    };
  } catch (error) {
    if (!(error instanceof GraphError)) throw error;
    console.error('[microsoft] falha ao carregar dados do convite');
    return null;
  }
}

/**
 * Responde a um convite de reunião. Age sobre o EVENTO vinculado (não sobre o
 * e-mail) e avisa o organizador — mesmo efeito dos botões do Outlook.
 */
export async function respondToInvite(
  token: string,
  eventId: string,
  response: InviteResponse,
  comment = '',
): Promise<void> {
  await graphFetch<void>(
    token,
    `${GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}/${response}`,
    { method: 'POST', body: { sendResponse: true, comment } },
  );
}

/**
 * Remove o evento da própria agenda ignorando "já não existe".
 *
 * Usado depois de cancelar ou recusar: nesses fluxos o Graph pode ter removido
 * o item por conta, e um 404 aqui é o resultado desejado, não falha.
 */
export async function deleteEventIfPresent(
  token: string,
  eventId: string,
): Promise<void> {
  try {
    await deleteCalendarEvent(token, eventId);
  } catch (error) {
    const alreadyGone =
      error instanceof GraphError && error.code === GRAPH_ERROR_CODE.NOT_FOUND;
    if (!alreadyGone) throw error;
  }
}

/**
 * Mensagem completa, com o corpo como o remetente enviou. A segurança fica na
 * renderização isolada (iframe restrito), não em converter para texto — assim o
 * e-mail aparece com formatação e imagens.
 */
export async function getMailMessage(
  token: string,
  messageId: string,
): Promise<MailMessageDetail> {
  const query = buildQuery({
    $select:
      'id,subject,body,receivedDateTime,isRead,webLink,from,toRecipients,ccRecipients,hasAttachments,inferenceClassification,bodyPreview',
  });

  const raw = await graphFetch<RawMessageDetail>(
    token,
    `${GRAPH_BASE}/me/messages/${encodeURIComponent(messageId)}?${query}`,
  );

  const isHtml = raw.body?.contentType?.toLowerCase() === 'html';
  let body = raw.body?.content?.trim() ?? '';

  // `hasAttachments` NÃO conta anexo embutido — vem `false` numa mensagem que só
  // tem a imagem da assinatura. Usar essa propriedade como porta impedia
  // justamente o caso mais comum, então o gatilho é o `cid:` no corpo.
  const isInviteMessage = Boolean(raw['@odata.type']?.includes('eventMessage'));
  const meetingInvite = isInviteMessage
    ? await fetchMeetingInvite(token, messageId)
    : null;

  let unresolvedImageRefs: string[] = [];
  let inlineAttachmentKeys: string[] = [];
  if (isHtml && /cid:/i.test(body)) {
    const resolved = await resolveInlineImages(token, messageId, body);
    body = resolved.html;
    unresolvedImageRefs = resolved.unresolvedRefs;
    inlineAttachmentKeys = resolved.attachmentKeys;
  }

  return {
    ...toMailMessage(raw),
    to: recipientNames(raw.toRecipients),
    cc: recipientNames(raw.ccRecipients),
    body,
    bodyIsHtml: isHtml,
    hasAttachments: raw.hasAttachments,
    unresolvedImageRefs,
    inlineAttachmentKeys,
    meetingInvite,
  };
}

/** Mensagens mais recentes da caixa de entrada do próprio usuário. */
export async function listRecentMessages(
  token: string,
  top = 15,
): Promise<MailMessage[]> {
  const params = new URLSearchParams({
    $orderby: 'receivedDateTime desc',
    $top: String(top),
    $select:
      'id,subject,bodyPreview,receivedDateTime,isRead,webLink,from,inferenceClassification',
  });

  const data = await graphGet<GraphList<RawMessage>>(
    token,
    `/me/mailFolders/inbox/messages?${params.toString()}`,
  );

  return data.value.map(toMailMessage);
}
