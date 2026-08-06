import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { CalendarEvent } from '@/types/microsoftGraph';

function formatEventPeriod(event: CalendarEvent): string {
  if (!event.start) return 'Horário não informado';
  const start = parseISO(event.start);
  if (event.isAllDay) {
    return `${format(start, "d 'de' MMMM", { locale: ptBR })} · dia inteiro`;
  }

  const end = event.end ? parseISO(event.end) : null;
  const day = format(start, "EEE, d 'de' MMM", { locale: ptBR });
  const range =
    end && isSameDay(start, end)
      ? `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
      : format(start, 'HH:mm');

  return `${day} · ${range}`;
}

export function EventRow({
  event,
  onSelect,
}: {
  event: CalendarEvent;
  onSelect?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
        <button
          type="button"
          onClick={onSelect}
          disabled={!onSelect}
          className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-ring rounded disabled:cursor-default"
        >
          <p className="font-medium text-foreground">{event.subject}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{formatEventPeriod(event)}</p>
          {event.location && (
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{event.location}</p>
          )}
          {event.organizer && (
            <p className="text-xs text-muted-foreground mt-1">Organizador: {event.organizer}</p>
          )}
        </button>
        {event.onlineMeetingUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={event.onlineMeetingUrl} target="_blank" rel="noopener noreferrer">
              <Video className="mr-2 h-4 w-4" aria-hidden="true" />
              Entrar
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
