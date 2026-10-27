import { ATTENDEE_RESPONSE } from '@/types/microsoftGraph';
import type { CalendarEvent } from '@/types/microsoftGraph';

/**
 * Destaque do evento segue a resposta ao convite, como no Outlook: confirmado é
 * sólido, "talvez" fica tracejado, sem resposta fica só contornado.
 */
export function eventResponseStyle(event: CalendarEvent): string {
  if (event.myResponse === ATTENDEE_RESPONSE.TENTATIVE) {
    return 'border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10';
  }
  if (event.myResponse === ATTENDEE_RESPONSE.NOT_RESPONDED) {
    return 'border border-primary/40 bg-transparent hover:bg-primary/10';
  }
  return 'bg-primary/10 hover:bg-primary/20';
}
