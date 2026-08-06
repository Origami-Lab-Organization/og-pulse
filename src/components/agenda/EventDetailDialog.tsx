import { useState } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, Pencil, Users, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { describeGraphError, useCalendarEventDetail } from '@/hooks/useMicrosoftGraph';
import { ATTENDEE_RESPONSE, EVENT_ACTION } from '@/types/microsoftGraph';
import type {
  AttendeeResponse,
  CalendarEventDetail,
  EventAction,
  EventAttendee,
} from '@/types/microsoftGraph';
import { EventActionDialog } from './EventActionDialog';
import { RitoLinkSection } from './RitoLinkSection';

const RESPONSE_LABEL: Record<AttendeeResponse, string> = {
  [ATTENDEE_RESPONSE.ORGANIZER]: 'Organizador',
  [ATTENDEE_RESPONSE.ACCEPTED]: 'Aceitou',
  [ATTENDEE_RESPONSE.DECLINED]: 'Recusou',
  [ATTENDEE_RESPONSE.TENTATIVE]: 'Talvez',
  [ATTENDEE_RESPONSE.NOT_RESPONDED]: 'Sem resposta',
  [ATTENDEE_RESPONSE.NONE]: 'Sem resposta',
};

function formatPeriod(event: CalendarEventDetail): string {
  if (!event.start) return 'Horário não informado';
  const start = parseISO(event.start);
  if (event.isAllDay) {
    return `${format(start, "EEEE, d 'de' MMMM", { locale: ptBR })} · dia inteiro`;
  }

  const end = event.end ? parseISO(event.end) : null;
  const day = format(start, "EEEE, d 'de' MMMM", { locale: ptBR });
  const range =
    end && isSameDay(start, end)
      ? `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
      : format(start, 'HH:mm');

  return `${day} · ${range}`;
}

/**
 * A ação disponível depende do papel: quem organiza cancela (avisando todos) ou
 * exclui quando não há convidados; quem foi convidado recusa.
 */
function resolveAction(event: CalendarEventDetail): EventAction {
  if (!event.isOrganizer) return EVENT_ACTION.DECLINE;
  return event.attendees.length > 0 ? EVENT_ACTION.CANCEL : EVENT_ACTION.DELETE;
}

const ACTION_LABEL: Record<EventAction, string> = {
  [EVENT_ACTION.CANCEL]: 'Cancelar reunião',
  [EVENT_ACTION.DELETE]: 'Excluir compromisso',
  [EVENT_ACTION.DECLINE]: 'Recusar convite',
};

function InfoLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 text-foreground">{children}</div>
    </div>
  );
}

function AttendeeLine({ attendee }: { attendee: EventAttendee }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate">
        {attendee.name}
        {!attendee.isRequired && (
          <span className="text-muted-foreground"> · opcional</span>
        )}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {RESPONSE_LABEL[attendee.response]}
      </span>
    </li>
  );
}

function DetailBody({ event }: { event: CalendarEventDetail }) {
  return (
    <div className="space-y-4">
      {event.isCancelled && (
        <Alert variant="destructive">
          <AlertDescription>Esta reunião foi cancelada pelo organizador.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2.5">
        <InfoLine icon={<Clock className="h-4 w-4" aria-hidden="true" />}>
          <span className="first-letter:uppercase">{formatPeriod(event)}</span>
        </InfoLine>

        {event.location && (
          <InfoLine icon={<MapPin className="h-4 w-4" aria-hidden="true" />}>
            {event.location}
          </InfoLine>
        )}

        {event.organizer && (
          <InfoLine icon={<Users className="h-4 w-4" aria-hidden="true" />}>
            <span>
              Organizado por {event.organizer}
              {event.isOrganizer && <span className="text-muted-foreground"> (você)</span>}
            </span>
          </InfoLine>
        )}
      </div>

      {event.onlineMeetingUrl && (
        <Button asChild variant="outline" className="w-full">
          <a href={event.onlineMeetingUrl} target="_blank" rel="noopener noreferrer">
            <Video className="mr-2 h-4 w-4" aria-hidden="true" />
            Ingressar na reunião
          </a>
        </Button>
      )}

      {event.attendees.length > 0 && (
        <div>
          <p className="ol-label text-muted-foreground mb-2">
            Participantes ({event.attendees.length})
          </p>
          <ul className="space-y-1.5 text-sm">
            {event.attendees.map((attendee) => (
              <AttendeeLine key={attendee.email || attendee.name} attendee={attendee} />
            ))}
          </ul>
        </div>
      )}

      {event.preview && (
        <div>
          <p className="ol-label text-muted-foreground mb-1">Descrição</p>
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {event.preview}
          </p>
        </div>
      )}

      <RitoLinkSection event={event} />
    </div>
  );
}

interface EventDetailDialogProps {
  eventId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Abre o formulário de edição com este evento. */
  onEdit: (event: CalendarEventDetail) => void;
}

export function EventDetailDialog({
  eventId,
  onOpenChange,
  onEdit,
}: EventDetailDialogProps) {
  const { data: event, isLoading, error } = useCalendarEventDetail(eventId);
  const [actionOpen, setActionOpen] = useState(false);

  const action = event ? resolveAction(event) : null;

  return (
    <>
      <Dialog open={Boolean(eventId)} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg flex max-h-[85vh] flex-col">
          <DialogHeader>
            <DialogTitle className="pr-6">
              {event?.subject ?? 'Compromisso'}
              {event?.isCancelled && (
                <Badge variant="destructive" className="ml-2 align-middle">
                  Cancelado
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Só o conteúdo rola: título e ação destrutiva ficam sempre visíveis. */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{describeGraphError(error)}</AlertDescription>
              </Alert>
            )}

            {event && !isLoading && <DetailBody event={event} />}
          </div>

          {event && !isLoading && !event.isCancelled && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Editar só existe para quem organiza: o Graph recusa PATCH de convidado. */}
              {event.isOrganizer && (
                <Button variant="outline" className="flex-1" onClick={() => onEdit(event)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>
              )}
              {action && (
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setActionOpen(true)}
                >
                  {ACTION_LABEL[action]}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {event && action && (
        <EventActionDialog
          open={actionOpen}
          onOpenChange={setActionOpen}
          action={action}
          eventId={event.id}
          eventSubject={event.subject}
          attendeeCount={event.attendees.length}
          onDone={() => {
            setActionOpen(false);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
