import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MailMessage } from '@/types/microsoftGraph';

/** Hoje mostra hora; antes disso, a data — como o Outlook faz na lista. */
function receivedLabel(receivedAt: string): string {
  const received = parseISO(receivedAt);
  return isToday(received)
    ? format(received, 'HH:mm')
    : format(received, "d 'de' MMM", { locale: ptBR });
}

interface MessageRowProps {
  message: MailMessage;
  onOpen: () => void;
  /** Enviados e Rascunhos: o que importa é para quem foi, não quem enviou (eu). */
  showRecipients?: boolean;
  /** Aberto na coluna de leitura ao lado — destacado como no Outlook. */
  selected?: boolean;
}

function rowStyle(message: MailMessage, selected?: boolean): string {
  if (selected) return 'border-primary/50 bg-primary/10';
  return message.isRead ? 'hover:bg-muted/50' : 'bg-primary/[0.03] hover:bg-muted/50';
}

function headline(message: MailMessage, showRecipients?: boolean): string {
  if (!showRecipients) return message.from;
  return message.to.length ? `Para: ${message.to.join(', ')}` : '(sem destinatário)';
}

export function MessageRow(props: MessageRowProps) {
  const { message, onOpen, showRecipients, selected } = props;
  return (
    <li
      className={cn(
        'group relative flex gap-3 rounded-lg border border-border p-3 transition-colors',
        rowStyle(message, selected),
      )}
    >
      {/* Barra de não lido: mesma pista visual do Outlook, sem depender de cor só. */}
      <span
        className={cn(
          'w-0.5 shrink-0 rounded-full',
          message.isRead ? 'bg-transparent' : 'bg-primary',
        )}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={onOpen}
        aria-current={selected ? 'true' : undefined}
        className="min-w-0 flex-1 text-left focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              'min-w-0 truncate text-sm',
              message.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground',
            )}
          >
            {headline(message, showRecipients)}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {receivedLabel(message.receivedAt)}
            {!message.isRead && <span className="sr-only"> · não lido</span>}
          </span>
        </div>

        <p
          className={cn(
            'truncate text-sm',
            message.isRead ? 'text-foreground/80' : 'font-medium text-foreground',
          )}
        >
          {message.subject}
        </p>

        {message.preview && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {message.preview}
          </p>
        )}
      </button>

      {message.webLink && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 transition-opacity
                     focus-visible:opacity-100 group-hover:opacity-100"
        >
          <a
            href={message.webLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir "${message.subject}" no Outlook`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      )}
    </li>
  );
}
