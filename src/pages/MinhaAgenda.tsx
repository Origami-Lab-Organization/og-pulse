import { useState } from 'react';
import { addMonths, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Mail,
  Unplug,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MicrosoftLogo } from '@/components/auth/MicrosoftLogo';
import { DayEventsDialog } from '@/components/agenda/DayEventsDialog';
import { EventDetailDialog } from '@/components/agenda/EventDetailDialog';
import { MonthCalendar } from '@/components/agenda/MonthCalendar';
import { getMonthGridRange } from '@/components/agenda/calendarGrid';
import { EventFormDialog } from '@/components/agenda/EventFormDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  describeGraphError,
  formatConnectErrorDetail,
  useMicrosoftCalendarRange,
  useMicrosoftConnection,
  useMicrosoftDiagnostics,
  useMicrosoftMail,
} from '@/hooks/useMicrosoftGraph';
import type { CalendarEventDetail, MailMessage } from '@/types/microsoftGraph';

const MAIL_PAGE_SIZE = 15;

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-20 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="text-muted-foreground">{icon}</div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function MessageRow({ message }: { message: MailMessage }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">{message.subject}</p>
            {!message.isRead && <Badge variant="secondary">Não lido</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{message.from}</p>
          {message.preview && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{message.preview}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {format(parseISO(message.receivedAt), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        {message.webLink && (
          <Button asChild variant="outline" size="sm">
            <a href={message.webLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Abrir no Outlook
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function GraphErrorAlert({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{describeGraphError(error)}</AlertDescription>
    </Alert>
  );
}

function ConnectPrompt({
  onConnect,
  isConnecting,
}: {
  onConnect: () => void;
  isConnecting: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground">Conecte sua conta Microsoft</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Autorize o acesso para ver sua agenda e seus e-mails aqui dentro do Pulse e
            criar compromissos sem sair do sistema. Só você vê estes dados.
          </p>
        </div>
        <Button variant="gradient" onClick={onConnect} disabled={isConnecting}>
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MicrosoftLogo className="mr-2 h-4 w-4" />
          )}
          {isConnecting ? 'Aguardando autorização...' : 'Conectar Microsoft'}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Painel de diagnóstico visível só em desenvolvimento. Existe porque o DevTools
 * está bloqueado por política da organização.
 */
function ConnectionDiagnostics({ connectError }: { connectError: unknown }) {
  const { data, refetch, isFetching } = useMicrosoftDiagnostics();
  const errorDetail = formatConnectErrorDetail(connectError);

  if (!import.meta.env.DEV) return null;

  return (
    <Card className="mt-6 border-dashed">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="ol-label text-muted-foreground">Diagnóstico da conexão (dev)</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Reler
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Configurado</dt>
            <dd className="font-mono">{String(data?.configured ?? '—')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contas</dt>
            <dd className="font-mono">{data?.accounts ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Conta ativa</dt>
            <dd className="font-mono">{String(data?.hasActiveAccount ?? '—')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Chaves MSAL</dt>
            <dd className="font-mono">{data?.msalKeys ?? '—'}</dd>
          </div>
        </dl>

        {errorDetail && (
          <div className="overflow-x-auto">
            <p className="ol-label text-muted-foreground mb-1">Último erro</p>
            <pre className="text-xs text-destructive whitespace-pre-wrap">{errorDetail}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MonthNavigator({
  month,
  onChange,
}: {
  month: Date;
  onChange: (month: Date) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(subMonths(month, 1))}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onChange(startOfMonth(new Date()))}>
        Hoje
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(month, 1))}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      <p className="ml-1 font-medium text-foreground first-letter:uppercase">
        {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
      </p>
    </div>
  );
}

export default function MinhaAgenda() {
  const {
    isConfigured,
    isLoading,
    isConnected,
    accountEmail,
    connect,
    isConnecting,
    connectError,
    disconnect,
    isDisconnecting,
  } = useMicrosoftConnection();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newEventDay, setNewEventDay] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDetail | null>(null);

  const gridRange = getMonthGridRange(month);
  const calendar = useMicrosoftCalendarRange(gridRange.start, gridRange.end, isConnected);
  const mail = useMicrosoftMail(MAIL_PAGE_SIZE, isConnected);
  const events = calendar.data ?? [];

  const openNewEvent = (day: Date) => {
    setSelectedDay(null);
    setEditingEvent(null);
    setNewEventDay(day);
  };

  const openEditEvent = (event: CalendarEventDetail) => {
    setSelectedEventId(null);
    setEditingEvent(event);
  };

  const closeEventForm = () => {
    setNewEventDay(null);
    setEditingEvent(null);
  };

  const headerActions = isConnected ? (
    <div className="flex items-center gap-3">
      {accountEmail && (
        <span className="hidden lg:inline text-sm text-muted-foreground">{accountEmail}</span>
      )}
      <Button variant="outline" size="sm" onClick={disconnect} disabled={isDisconnecting}>
        <Unplug className="mr-2 h-4 w-4" aria-hidden="true" />
        Desconectar
      </Button>
    </div>
  ) : undefined;

  const renderCalendarTab = () => {
    if (calendar.error) return <GraphErrorAlert error={calendar.error} />;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthNavigator month={month} onChange={setMonth} />
          <Button variant="gradient" size="sm" onClick={() => openNewEvent(new Date())}>
            <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Novo compromisso
          </Button>
        </div>
        {calendar.isLoading ? (
          <Skeleton className="h-[32rem] w-full" />
        ) : (
          <MonthCalendar
            month={month}
            events={events}
            onSelectDay={setSelectedDay}
            onSelectEvent={setSelectedEventId}
          />
        )}
      </div>
    );
  };

  const renderMailTab = () => {
    if (mail.isLoading) return <ListSkeleton />;
    if (mail.error) return <GraphErrorAlert error={mail.error} />;
    if (!mail.data?.length) {
      return (
        <EmptyState
          icon={<Mail className="h-8 w-8" aria-hidden="true" />}
          message="Nenhum e-mail recente na caixa de entrada."
        />
      );
    }
    return (
      <div className="space-y-3">
        {mail.data.map((message) => (
          <MessageRow key={message.id} message={message} />
        ))}
      </div>
    );
  };

  const renderBody = () => {
    if (!isConfigured) {
      return (
        <Alert>
          <AlertDescription>
            A integração com a Microsoft ainda não está configurada neste ambiente.
            Fale com o time de tecnologia para habilitar o acesso à agenda.
          </AlertDescription>
        </Alert>
      );
    }

    if (isLoading) return <ListSkeleton />;

    if (!isConnected) {
      return <ConnectPrompt onConnect={connect} isConnecting={isConnecting} />;
    }

    return (
      <Tabs defaultValue="agenda" className="w-full">
        <TabsList>
          <TabsTrigger value="agenda">
            <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
            E-mails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          {renderCalendarTab()}
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          {renderMailTab()}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <AppLayout
      title="Minha Agenda"
      description="Seus compromissos e e-mails da conta Microsoft, sem sair do Pulse."
      actions={headerActions}
    >
      {renderBody()}
      <ConnectionDiagnostics connectError={connectError} />

      <DayEventsDialog
        day={selectedDay}
        events={events}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        onCreateForDay={openNewEvent}
        onSelectEvent={(eventId) => {
          setSelectedDay(null);
          setSelectedEventId(eventId);
        }}
      />

      <EventDetailDialog
        eventId={selectedEventId}
        onOpenChange={(open) => !open && setSelectedEventId(null)}
        onEdit={openEditEvent}
      />

      <EventFormDialog
        open={Boolean(newEventDay) || Boolean(editingEvent)}
        onOpenChange={(open) => !open && closeEventForm()}
        initialDate={newEventDay ?? new Date()}
        event={editingEvent}
      />
    </AppLayout>
  );
}
