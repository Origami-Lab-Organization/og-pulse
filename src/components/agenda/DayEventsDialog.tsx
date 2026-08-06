import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EventRow } from './EventRow';
import type { CalendarEvent } from '@/types/microsoftGraph';

interface DayEventsDialogProps {
  day: Date | null;
  events: CalendarEvent[];
  onOpenChange: (open: boolean) => void;
  onCreateForDay: (day: Date) => void;
  onSelectEvent: (eventId: string) => void;
}

export function DayEventsDialog({
  day,
  events,
  onOpenChange,
  onCreateForDay,
  onSelectEvent,
}: DayEventsDialogProps) {
  const dayEvents = day
    ? events.filter((event) => event.start && isSameDay(parseISO(event.start), day))
    : [];

  return (
    <Dialog open={Boolean(day)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {day ? format(day, "EEEE, d 'de' MMMM", { locale: ptBR }) : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum compromisso neste dia.
            </p>
          ) : (
            dayEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onSelect={() => onSelectEvent(event.id)}
              />
            ))
          )}
        </div>

        {day && (
          <Button variant="gradient" onClick={() => onCreateForDay(day)}>
            <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Novo compromisso neste dia
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
