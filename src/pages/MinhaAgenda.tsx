import { useState } from 'react';
import { eachDayOfInterval, format } from 'date-fns';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Unplug } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MicrosoftConnectPrompt } from '@/components/microsoft/MicrosoftConnectPrompt';
import { DayEventsDialog } from '@/components/agenda/DayEventsDialog';
import { EventDetailDialog } from '@/components/agenda/EventDetailDialog';
import { MonthCalendar } from '@/components/agenda/MonthCalendar';
import { TimeGridCalendar } from '@/components/agenda/TimeGridCalendar';
import {
  formatViewTitle,
  getViewRange,
  shiftViewDate,
} from '@/components/agenda/calendarGrid';
import { EventFormDialog } from '@/components/agenda/EventFormDialog';
import { Segmentado } from '@/components/prospeccao/metrics/parts';
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
  useOutlookCategories,
} from '@/hooks/useMicrosoftGraph';
import { CategoryColorsProvider } from '@/components/agenda/CategoryColorsContext';
import { CALENDAR_VIEW } from '@/types/agenda';
import type { CalendarView } from '@/types/agenda';
import type { CalendarEventDetail } from '@/types/microsoftGraph';

const VIEW_OPTIONS = [
  { value: CALENDAR_VIEW.DAY, label: 'Dia' },
  { value: CALENDAR_VIEW.WEEK, label: 'Semana' },
  { value: CALENDAR_VIEW.MONTH, label: 'Mês' },
] as const;

const VIEW_STORAGE_KEY = 'pulse:agenda:view';

/** Última visão escolhida, por navegador — conveniência, cai no mês se não der para ler. */
function readStoredView(): CalendarView {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEW_OPTIONS.some((option) => option.value === stored)
      ? (stored as CalendarView)
      : CALENDAR_VIEW.MONTH;
  } catch {
    return CALENDAR_VIEW.MONTH;
  }
}

function storeView(view: CalendarView): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): a visão só não fica lembrada.
  }
}

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

const PERIOD_NOUN: Record<CalendarView, { previous: string; next: string }> = {
  [CALENDAR_VIEW.DAY]: { previous: 'Dia anterior', next: 'Próximo dia' },
  [CALENDAR_VIEW.WEEK]: { previous: 'Semana anterior', next: 'Próxima semana' },
  [CALENDAR_VIEW.MONTH]: { previous: 'Mês anterior', next: 'Próximo mês' },
};

interface PeriodNavigatorProps {
  view: CalendarView;
  date: Date;
  onChange: (date: Date) => void;
}

function PeriodNavigator(props: PeriodNavigatorProps) {
  const { view, date, onChange } = props;
  const labels = PERIOD_NOUN[view];

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label={labels.previous}
        onClick={() => onChange(shiftViewDate(view, date, -1))}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onChange(new Date())}>
        Hoje
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label={labels.next}
        onClick={() => onChange(shiftViewDate(view, date, 1))}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      <p className="ml-1 font-medium text-foreground first-letter:uppercase" aria-live="polite">
        {formatViewTitle(view, date)}
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

  const [view, setView] = useState<CalendarView>(readStoredView);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newEventDay, setNewEventDay] = useState<Date | null>(null);
  const [newEventTime, setNewEventTime] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDetail | null>(null);

  const viewRange = getViewRange(view, viewDate);
  const calendar = useMicrosoftCalendarRange(viewRange.start, viewRange.end, isConnected);
  const events = calendar.data ?? [];
  // Só pinta se a pessoa já autorizou as categorias no seletor — nunca abre popup daqui.
  const categories = useOutlookCategories(isConnected, false);

  const changeView = (next: CalendarView) => {
    setView(next);
    storeView(next);
  };

  const openDayView = (day: Date) => {
    setViewDate(day);
    changeView(CALENDAR_VIEW.DAY);
  };

  const openNewEvent = (day: Date, time: string | null = null) => {
    setSelectedDay(null);
    setEditingEvent(null);
    setNewEventTime(time);
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

  const renderGrid = () => {
    if (calendar.isLoading) return <Skeleton className="h-[32rem] w-full" />;

    if (view === CALENDAR_VIEW.MONTH) {
      return (
        <MonthCalendar
          month={viewDate}
          events={events}
          onSelectDay={setSelectedDay}
          onSelectEvent={setSelectedEventId}
        />
      );
    }

    return (
      <TimeGridCalendar
        days={eachDayOfInterval(viewRange)}
        events={events}
        onSelectEvent={setSelectedEventId}
        onSelectSlot={(start) => openNewEvent(start, format(start, 'HH:mm'))}
        onSelectDay={view === CALENDAR_VIEW.WEEK ? openDayView : undefined}
      />
    );
  };

  const renderCalendar = () => {
    if (calendar.error) return <GraphErrorAlert error={calendar.error} />;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodNavigator view={view} date={viewDate} onChange={setViewDate} />
          <div className="flex flex-wrap items-center gap-3">
            <Segmentado
              value={view}
              onChange={changeView}
              options={VIEW_OPTIONS}
              label="Visualização da agenda"
            />
            <Button
              variant="gradient"
              size="sm"
              onClick={() => openNewEvent(new Date())}
              aria-label="Novo compromisso"
            >
              <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Novo
            </Button>
          </div>
        </div>
        <CategoryColorsProvider categories={categories.data}>{renderGrid()}</CategoryColorsProvider>
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
        initialTime={newEventTime}
        event={editingEvent}
      />
    </AppLayout>
  );
}
