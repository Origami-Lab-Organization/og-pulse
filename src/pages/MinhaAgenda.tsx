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
  Unplug,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MicrosoftConnectPrompt } from '@/components/microsoft/MicrosoftConnectPrompt';
import { DayEventsDialog } from '@/components/agenda/DayEventsDialog';
import { EventDetailDialog } from '@/components/agenda/EventDetailDialog';
import { MonthCalendar } from '@/components/agenda/MonthCalendar';
import { getMonthGridRange } from '@/components/agenda/calendarGrid';
import { EventFormDialog } from '@/components/agenda/EventFormDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  describeGraphError,
  formatConnectErrorDetail,
  useMicrosoftCalendarRange,
  useMicrosoftConnection,
  useMicrosoftDiagnostics,
} from '@/hooks/useMicrosoftGraph';
import type { CalendarEventDetail } from '@/types/microsoftGraph';

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-20 w-full" />
      ))}
    </div>
  );
}

function GraphErrorAlert({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{describeGraphError(error)}</AlertDescription>
    </Alert>
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

  const renderCalendar = () => {
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
      return (
        <MicrosoftConnectPrompt
          icon={<CalendarDays className="h-8 w-8" aria-hidden="true" />}
          title="Conecte sua conta Microsoft"
          description="Autorize o acesso para ver sua agenda e criar compromissos sem sair do Pulse. Só você vê estes dados."
          onConnect={connect}
          isConnecting={isConnecting}
        />
      );
    }

    return renderCalendar();
  };

  return (
    <AppLayout
      title="Minha Agenda"
      description="Seus compromissos da conta Microsoft, sem sair do Pulse."
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
