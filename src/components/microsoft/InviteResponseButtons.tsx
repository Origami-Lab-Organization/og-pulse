import { useState } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRespondToInvite } from '@/hooks/useMicrosoftGraph';
import { ATTENDEE_RESPONSE, INVITE_RESPONSE } from '@/types/microsoftGraph';
import type { InviteResponse } from '@/types/microsoftGraph';
import { DeclineInviteDialog } from './DeclineInviteDialog';

const CURRENT_STATUS_LABEL: Record<string, string> = {
  [ATTENDEE_RESPONSE.ACCEPTED]: 'Você aceitou.',
  [ATTENDEE_RESPONSE.TENTATIVE]: 'Você marcou como provisório.',
  [ATTENDEE_RESPONSE.DECLINED]: 'Você recusou.',
};

const CURRENT_TO_RESPONSE: Record<string, InviteResponse> = {
  [ATTENDEE_RESPONSE.ACCEPTED]: INVITE_RESPONSE.ACCEPT,
  [ATTENDEE_RESPONSE.TENTATIVE]: INVITE_RESPONSE.TENTATIVE,
  [ATTENDEE_RESPONSE.DECLINED]: INVITE_RESPONSE.DECLINE,
};

interface InviteResponseButtonsProps {
  eventId: string;
  /** Resposta atual (formato do Graph) — destaca o botão ativo e o texto. */
  currentResponse?: string;
  onResponded?: (response: InviteResponse) => void;
}

/**
 * Aceitar / Provisório / Recusar de um convite — as mesmas respostas do
 * Outlook, sempre disponíveis para TROCAR a resposta. Age sobre o evento e
 * avisa o organizador; usado no e-mail de convite e no detalhe do evento.
 */
export function InviteResponseButtons({
  eventId,
  currentResponse,
  onResponded,
}: InviteResponseButtonsProps) {
  const respond = useRespondToInvite();
  const [declineOpen, setDeclineOpen] = useState(false);

  const active = currentResponse ? CURRENT_TO_RESPONSE[currentResponse] : undefined;
  const statusLabel = currentResponse
    ? CURRENT_STATUS_LABEL[currentResponse]
    : undefined;

  const isPending = (response: InviteResponse) =>
    respond.isPending && respond.variables?.response === response;

  const answer = (
    response: InviteResponse,
    options?: { comment?: string; removeFromCalendar?: boolean },
  ) =>
    respond.mutate(
      { eventId, response, ...options },
      {
        onSuccess: () => {
          setDeclineOpen(false);
          onResponded?.(response);
        },
      },
    );

  const activeRing = (response: InviteResponse) =>
    active === response ? 'ring-2 ring-ring ring-offset-1' : '';

  return (
    <div className="space-y-2">
      {statusLabel && (
        <p className="text-sm text-muted-foreground">{statusLabel}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="gradient"
          aria-pressed={active === INVITE_RESPONSE.ACCEPT}
          className={activeRing(INVITE_RESPONSE.ACCEPT)}
          disabled={respond.isPending}
          onClick={() => answer(INVITE_RESPONSE.ACCEPT)}
        >
          <Check className="mr-2 h-4 w-4" aria-hidden="true" />
          {isPending(INVITE_RESPONSE.ACCEPT) ? 'Enviando...' : 'Aceitar'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-pressed={active === INVITE_RESPONSE.TENTATIVE}
          className={activeRing(INVITE_RESPONSE.TENTATIVE)}
          disabled={respond.isPending}
          onClick={() => answer(INVITE_RESPONSE.TENTATIVE)}
        >
          <HelpCircle className="mr-2 h-4 w-4" aria-hidden="true" />
          {isPending(INVITE_RESPONSE.TENTATIVE) ? 'Enviando...' : 'Provisório'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-pressed={active === INVITE_RESPONSE.DECLINE}
          className={`text-destructive hover:text-destructive ${activeRing(INVITE_RESPONSE.DECLINE)}`}
          disabled={respond.isPending}
          onClick={() => setDeclineOpen(true)}
        >
          <X className="mr-2 h-4 w-4" aria-hidden="true" />
          {isPending(INVITE_RESPONSE.DECLINE) ? 'Enviando...' : 'Recusar'}
        </Button>
      </div>

      <DeclineInviteDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        isPending={isPending(INVITE_RESPONSE.DECLINE)}
        onConfirm={(options) => answer(INVITE_RESPONSE.DECLINE, options)}
      />
    </div>
  );
}
