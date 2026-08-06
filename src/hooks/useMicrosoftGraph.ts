import { AuthError, BrowserAuthErrorCodes } from '@azure/msal-browser';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  acquireGraphToken,
  connectMicrosoft,
  disconnectMicrosoft,
  getConnectedAccountEmail,
  isMicrosoftConfigured,
  MicrosoftNotConnectedError,
  readMicrosoftDiagnostics,
} from '@/integrations/microsoft/msalClient';
import {
  cancelCalendarEvent,
  createCalendarEvent,
  declineCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  fetchAttachmentContent,
  getMailMessage,
  GraphError,
  listCalendarEvents,
  listInboxPage,
  listMessageAttachments,
  listRecentMessages,
  searchInboxPage,
  updateCalendarEvent,
} from '@/services/microsoftGraphService';
import { EVENT_ACTION, GRAPH_ERROR_CODE } from '@/types/microsoftGraph';
import type {
  CalendarEventInput,
  MailClassification,
  CalendarEventUpdate,
  EventAction,
} from '@/types/microsoftGraph';

const ACCOUNT_QUERY_KEY = ['microsoft-account'];
const CALENDAR_QUERY_KEY = 'microsoft-calendar';
const MAIL_QUERY_KEY = 'microsoft-mail';
const EVENT_QUERY_KEY = 'microsoft-event';

const POPUP_BLOCKED_CODES: string[] = [
  BrowserAuthErrorCodes.popupWindowError,
  BrowserAuthErrorCodes.emptyWindowError,
  BrowserAuthErrorCodes.blockNestedPopups,
];

/**
 * Falhas de autorização vêm da Microsoft com código próprio (`errorCode` da
 * MSAL, ou `AADSTS*` quando o erro é do Entra ID). A mensagem carrega o código
 * porque sem ele não há como distinguir popup bloqueado de app mal configurado.
 */
export function describeConnectError(error: unknown): string {
  if (!(error instanceof AuthError)) {
    return 'Não foi possível conectar sua conta Microsoft.';
  }

  if (error.errorCode === BrowserAuthErrorCodes.userCancelled) {
    return 'Autorização cancelada — a janela da Microsoft foi fechada antes de concluir.';
  }
  if (POPUP_BLOCKED_CODES.includes(error.errorCode)) {
    return 'O navegador bloqueou a janela da Microsoft. Libere popups para este site e tente de novo.';
  }
  if (error.errorCode === BrowserAuthErrorCodes.interactionInProgress) {
    return 'Havia uma autorização travada e ela foi limpa. Clique em Conectar novamente.';
  }

  // AADSTS* aparece no errorMessage e é o que identifica erro de configuração
  // (redirect URI, consentimento, tenant).
  const aadCode = /AADSTS\d+/.exec(error.errorMessage ?? '')?.[0];
  return `Erro da Microsoft: ${aadCode ?? error.errorCode}. Detalhes no console do navegador.`;
}

/** Mensagem acionável para falhas do Graph, sem stack trace na tela. */
export function describeGraphError(error: unknown): string {
  if (error instanceof MicrosoftNotConnectedError) {
    return 'Conecte sua conta Microsoft para ver estes dados.';
  }
  if (error instanceof GraphError && error.code === GRAPH_ERROR_CODE.EXPIRED) {
    return 'A autorização da Microsoft não é mais válida. Reconecte sua conta para continuar.';
  }
  if (error instanceof GraphError && error.code === GRAPH_ERROR_CODE.FORBIDDEN) {
    return 'Sua conta Microsoft não tem permissão para este acesso. Fale com o administrador do Microsoft 365.';
  }
  return 'Não foi possível consultar a Microsoft agora. Tente novamente em instantes.';
}

/**
 * Estado da autorização Microsoft. `isConfigured` distingue "ambiente sem as
 * variáveis do Entra ID" de "usuário ainda não autorizou".
 */
export function useMicrosoftConnection() {
  const queryClient = useQueryClient();
  const isConfigured = isMicrosoftConfigured();

  const account = useQuery({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: getConnectedAccountEmail,
    enabled: isConfigured,
    staleTime: Infinity,
  });

  const invalidateGraphData = () => {
    queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [MAIL_QUERY_KEY] });
  };

  // O e-mail vem do resultado do popup, não de uma releitura do cache da MSAL:
  // acabamos de receber o token, então essa é a fonte autoritativa.
  const connect = useMutation({
    mutationFn: connectMicrosoft,
    onSuccess: (email) => {
      queryClient.setQueryData(ACCOUNT_QUERY_KEY, email);
      invalidateGraphData();
    },
    onError: (error) => {
      // Código e mensagem da MSAL no console; nenhum token é registrado.
      console.error('[microsoft] falha ao conectar:', error);
      toast.error(describeConnectError(error));
    },
  });

  const disconnect = useMutation({
    mutationFn: disconnectMicrosoft,
    onSuccess: () => {
      queryClient.setQueryData(ACCOUNT_QUERY_KEY, null);
      invalidateGraphData();
      toast.success('Conta Microsoft desconectada do Pulse.');
    },
  });

  return {
    isConfigured,
    isLoading: account.isLoading,
    isConnected: Boolean(account.data),
    accountEmail: account.data ?? null,
    connect: () => connect.mutate(),
    isConnecting: connect.isPending,
    connectError: connect.error,
    disconnect: () => disconnect.mutate(),
    isDisconnecting: disconnect.isPending,
  };
}

/**
 * Estado bruto da MSAL para o painel de diagnóstico em tela. Temporário —
 * existe porque o DevTools está bloqueado por política da organização.
 */
export function useMicrosoftDiagnostics() {
  return useQuery({
    queryKey: ['microsoft-diagnostics'],
    queryFn: readMicrosoftDiagnostics,
    enabled: import.meta.env.DEV,
    staleTime: 0,
  });
}

/** Texto cru do erro de conexão, para leitura sem DevTools. */
export function formatConnectErrorDetail(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof AuthError) {
    return [error.errorCode, error.errorMessage].filter(Boolean).join(' — ').slice(0, 400);
  }
  return String(error instanceof Error ? error.message : error).slice(0, 400);
}

/** Eventos de um intervalo arbitrário — usado pela grade de mês. */
export function useMicrosoftCalendarRange(
  rangeStart: Date,
  rangeEnd: Date,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [CALENDAR_QUERY_KEY, rangeStart.toISOString(), rangeEnd.toISOString()],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const token = await acquireGraphToken();
      return listCalendarEvents(token, rangeStart, rangeEnd);
    },
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CalendarEventInput) => {
      const token = await acquireGraphToken();
      return createCalendarEvent(token, input);
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      toast.success(`"${event.subject}" criado na sua agenda.`);
    },
    onError: (error) => {
      console.error('[microsoft] falha ao criar compromisso:', error);
      toast.error(describeGraphError(error));
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { eventId: string; input: CalendarEventUpdate }) => {
      const token = await acquireGraphToken();
      return updateCalendarEvent(token, variables.eventId, variables.input);
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [EVENT_QUERY_KEY] });
      toast.success(`"${event.subject}" atualizado. Os convidados foram avisados.`);
    },
    onError: (error) => {
      console.error('[microsoft] falha ao atualizar compromisso:', error);
      toast.error(describeGraphError(error));
    },
  });
}

/** Detalhe completo de um evento — carregado só quando o card é aberto. */
export function useCalendarEventDetail(eventId: string | null) {
  return useQuery({
    queryKey: [EVENT_QUERY_KEY, eventId],
    enabled: Boolean(eventId),
    retry: false,
    queryFn: async () => {
      const token = await acquireGraphToken();
      return getCalendarEvent(token, eventId as string);
    },
  });
}

const ACTION_RUNNERS: Record<
  EventAction,
  (token: string, eventId: string, comment: string) => Promise<void>
> = {
  [EVENT_ACTION.CANCEL]: cancelCalendarEvent,
  [EVENT_ACTION.DELETE]: (token, eventId) => deleteCalendarEvent(token, eventId),
  [EVENT_ACTION.DECLINE]: declineCalendarEvent,
};

const ACTION_SUCCESS_MESSAGE: Record<EventAction, string> = {
  [EVENT_ACTION.CANCEL]: 'Reunião cancelada. Os convidados foram avisados.',
  [EVENT_ACTION.DELETE]: 'Compromisso removido da sua agenda.',
  [EVENT_ACTION.DECLINE]: 'Convite recusado. O organizador recebeu sua resposta.',
};

/**
 * Cancelar, excluir ou recusar. Cada ação é irreversível e algumas notificam
 * outras pessoas, então a confirmação é responsabilidade da UI que chama.
 */
export function useEventAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      action: EventAction;
      eventId: string;
      comment: string;
    }) => {
      const token = await acquireGraphToken();
      await ACTION_RUNNERS[variables.action](token, variables.eventId, variables.comment);
      return variables.action;
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [EVENT_QUERY_KEY] });
      toast.success(ACTION_SUCCESS_MESSAGE[action]);
    },
    onError: (error) => {
      console.error('[microsoft] falha na ação sobre o evento:', error);
      toast.error(describeGraphError(error));
    },
  });
}

/**
 * Caixa de entrada paginada, da mais recente para a mais antiga. Uma consulta
 * só: a separação Prioritários/Outros acontece na tela. O cursor é a `nextLink`
 * opaca do Graph — nunca montada por nós.
 */
export function useInboxPages(top: number, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: [MAIL_QUERY_KEY, 'inbox', top],
    enabled,
    staleTime: 60_000,
    retry: false,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const token = await acquireGraphToken();
      return listInboxPage(token, { top, nextLink: pageParam });
    },
    getNextPageParam: (lastPage) => lastPage.nextLink,
  });
}

const MESSAGE_QUERY_KEY = 'microsoft-message';

/** Mensagem completa — carregada só quando o e-mail é aberto. */
export function useMailMessageDetail(messageId: string | null) {
  return useQuery({
    queryKey: [MESSAGE_QUERY_KEY, messageId],
    enabled: Boolean(messageId),
    retry: false,
    queryFn: async () => {
      const token = await acquireGraphToken();
      return getMailMessage(token, messageId as string);
    },
  });
}

/** Anexos da mensagem aberta. */
export function useMessageAttachments(messageId: string | null) {
  return useQuery({
    queryKey: [MESSAGE_QUERY_KEY, messageId, 'attachments'],
    enabled: Boolean(messageId),
    retry: false,
    queryFn: async () => {
      const token = await acquireGraphToken();
      return listMessageAttachments(token, messageId as string);
    },
  });
}

/** Converte o base64 do Graph em bytes para o navegador salvar. */
function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

/**
 * Tipos que podem ser ABERTOS em aba nova.
 *
 * Uma URL `blob:` herda a nossa origem: abrir HTML ou SVG assim executaria o
 * script do anexo com acesso à nossa sessão e ao localStorage. PDF e imagem
 * rasterizada o navegador renderiza sem executar nada — SVG fica de fora
 * justamente porque é XML com script. Todo o resto só baixa.
 */
const OPENABLE_CONTENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'text/plain',
];

export function canOpenInBrowser(contentType: string): boolean {
  return OPENABLE_CONTENT_TYPES.includes(contentType.toLowerCase().split(';')[0].trim());
}

/** Revogar de imediato corta o download/aba antes de começar em alguns navegadores. */
const BLOB_LIFETIME_MS = 60_000;

/**
 * Baixa um anexo. O conteúdo vem em base64 e é convertido no navegador — nada
 * passa por servidor nosso nem fica gravado.
 */
export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async (variables: { messageId: string; attachmentId: string }) => {
      const token = await acquireGraphToken();
      const attachment = await fetchAttachmentContent(
        token,
        variables.messageId,
        variables.attachmentId,
      );

      const url = URL.createObjectURL(
        base64ToBlob(attachment.contentBytes, attachment.contentType),
      );

      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), BLOB_LIFETIME_MS);

      return attachment.name;
    },
    onError: (error) => {
      console.error('[microsoft] falha ao baixar anexo:', error);
      toast.error(
        error instanceof GraphError
          ? error.message
          : 'Não foi possível baixar o anexo.',
      );
    },
  });
}

/**
 * Abre o anexo em aba nova. Só é chamado para os tipos de
 * `canOpenInBrowser` — ver o motivo lá.
 */
export function useOpenAttachment() {
  return useMutation({
    mutationFn: async (variables: { messageId: string; attachmentId: string }) => {
      const token = await acquireGraphToken();
      const attachment = await fetchAttachmentContent(
        token,
        variables.messageId,
        variables.attachmentId,
      );

      if (!canOpenInBrowser(attachment.contentType)) {
        throw new GraphError(
          GRAPH_ERROR_CODE.UNKNOWN,
          'Este tipo de arquivo não pode ser aberto aqui — use o download.',
        );
      }

      const url = URL.createObjectURL(
        base64ToBlob(attachment.contentBytes, attachment.contentType),
      );

      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), BLOB_LIFETIME_MS);

      return attachment.name;
    },
    onError: (error) => {
      console.error('[microsoft] falha ao abrir anexo:', error);
      toast.error(
        error instanceof GraphError ? error.message : 'Não foi possível abrir o anexo.',
      );
    },
  });
}

/** Menor termo que vale consultar — uma letra traria a caixa inteira. */
const MIN_SEARCH_LENGTH = 2;

/** Busca paginada na caixa de entrada. Inativa com termo curto. */
export function useInboxSearch(query: string, top: number, enabled: boolean) {
  const term = query.trim();

  return useInfiniteQuery({
    queryKey: [MAIL_QUERY_KEY, 'search', term, top],
    enabled: enabled && term.length >= MIN_SEARCH_LENGTH,
    staleTime: 60_000,
    retry: false,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const token = await acquireGraphToken();
      return searchInboxPage(token, term, { top, nextLink: pageParam });
    },
    getNextPageParam: (lastPage) => lastPage.nextLink,
  });
}

export function useMicrosoftMail(top: number, enabled: boolean) {
  return useQuery({
    queryKey: [MAIL_QUERY_KEY, top],
    enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const token = await acquireGraphToken();
      return listRecentMessages(token, top);
    },
  });
}
