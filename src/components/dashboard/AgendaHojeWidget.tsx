import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, endOfDay, format, isSameDay, isToday, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MicrosoftLogo } from '@/components/auth/MicrosoftLogo';
import { cn } from '@/lib/utils';
import {
  useMicrosoftCalendarRange,
  useMicrosoftConnection,
} from '@/hooks/useMicrosoftGraph';
import type { CalendarEvent } from '@/types/microsoftGraph';

function eventPeriod(event: CalendarEvent): string {
  if (event.isAllDay || !event.start) return 'Dia inteiro';
  const start = parseISO(event.start);
  const end = event.end ? parseISO(event.end) : null;
  return end && isSameDay(start, end)
    ? `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
    : format(start, 'HH:mm');
}

/** Já terminou: fica visível como contexto do dia, mas sem competir por atenção. */
function hasFinished(event: CalendarEvent): boolean {
  if (event.isAllDay || !event.end) return false;
  return parseISO(event.end) < new Date();
}

/** Rótulo do dia exibido: Hoje/Ontem/Amanhã, senão a data. */
function dayLabel(day: Date): string {
  const diff = Math.round(
    (startOfDay(day).getTime() - startOfDay(new Date()).getTime()) / 86_400_000,
  );
  if (diff === 0) return 'Hoje';
  if (diff === -1) return 'Ontem';
  if (diff === 1) return 'Amanhã';
  return format(day, "EEE, d 'de' MMM", { locale: ptBR });
}

function EventLine({ event, dimPast }: { event: CalendarEvent; dimPast: boolean }) {
  const finished = dimPast && hasFinished(event);

  return (
    <li className={cn('flex items-start gap-3', finished && 'opacity-50')}>
      <span
        className="mt-1 h-8 w-0.5 shrink-0 rounded-full bg-primary/40"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{event.subject}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{eventPeriod(event)}</p>
      </div>
      {event.onlineMeetingUrl && !finished && (
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <a
            href={event.onlineMeetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ingressar em ${event.subject}`}
          >
            <Video className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      )}
    </li>
  );
}

/**
 * Agenda de hoje no dashboard.
 *
 * Mostra o dia inteiro, incluindo o que já passou — atenuado. Filtrar o passado
 * deixaria o card vazio no fim da tarde, e a lista do dia é contexto útil.
 *
 * Quando a conta Microsoft não está conectada, convida a conectar em vez de
 * esconder o card: é onde a maioria vai descobrir a integração.
 */
export function AgendaHojeWidget() {
  const { isConfigured, isConnected, connect, isConnecting } = useMicrosoftConnection();

  const [dayOffset, setDayOffset] = useState(0);
  const day = useMemo(() => addDays(startOfDay(new Date()), dayOffset), [dayOffset]);

  const { data: events, isLoading } = useMicrosoftCalendarRange(
    startOfDay(day),
    endOfDay(day),
    isConnected,
  );

  if (!isConfigured) return null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Agenda
            <span className="font-normal text-muted-foreground first-letter:uppercase">
              · {dayLabel(day)}
            </span>
          </CardTitle>
          {isConnected && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Dia anterior"
                onClick={() => setDayOffset((current) => current - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              {dayOffset !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground"
                  onClick={() => setDayOffset(0)}
                >
                  Hoje
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Próximo dia"
                onClick={() => setDayOffset((current) => current + 1)}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link to="/minha-agenda">
                  Ver tudo
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Rola por dentro: sem isso um dia cheio esticaria a linha do dashboard e
          desalinharia o card ao lado. */}
      <CardContent className="max-h-80 flex-1 overflow-y-auto">
        {!isConnected ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Conecte sua conta Microsoft para ver seus compromissos aqui.
            </p>
            <Button variant="outline" size="sm" onClick={connect} disabled={isConnecting}>
              <MicrosoftLogo className="mr-2 h-4 w-4" />
              {isConnecting ? 'Aguardando...' : 'Conectar Microsoft'}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !events?.length ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nenhum compromisso neste dia.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <EventLine key={event.id} event={event} dimPast={isToday(day)} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
