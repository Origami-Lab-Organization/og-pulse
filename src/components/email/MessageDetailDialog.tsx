import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { describeGraphError, useMailMessageDetail } from '@/hooks/useMicrosoftGraph';
import { MessageAttachments } from './MessageAttachments';
import { MessageBody } from './MessageBody';
import type { MailMessageDetail } from '@/types/microsoftGraph';

/** Nomes visíveis antes do "+N" — o resto abre sob demanda, como no Outlook. */
const RECIPIENTS_PREVIEW = 3;

function RecipientLine({ label, names }: { label: string; names: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!names.length) return null;

  const visible = expanded ? names : names.slice(0, RECIPIENTS_PREVIEW);
  const hidden = names.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      {visible.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className="max-w-56 truncate rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
        >
          {name}
        </span>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full px-2 py-0.5 text-xs text-primary hover:bg-muted
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          +{hidden}
        </button>
      )}
      {expanded && names.length > RECIPIENTS_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="px-1 text-xs text-muted-foreground hover:text-foreground
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          mostrar menos
        </button>
      )}
    </div>
  );
}

function DetailBody({ message }: { message: MailMessageDetail }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{message.from}</p>
        <RecipientLine label="Para" names={message.to} />
        <RecipientLine label="Cc" names={message.cc} />
        <p className="text-xs text-muted-foreground">
          {format(parseISO(message.receivedAt), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      <MessageAttachments messageId={message.id} />

      <MessageBody message={message} />
    </div>
  );
}

interface MessageDetailDialogProps {
  messageId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function MessageDetailDialog({ messageId, onOpenChange }: MessageDetailDialogProps) {
  const { data: message, isLoading, error } = useMailMessageDetail(messageId);

  return (
    <Dialog open={Boolean(messageId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle className="pr-6">{message?.subject ?? 'E-mail'}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{describeGraphError(error)}</AlertDescription>
            </Alert>
          )}

          {message && !isLoading && <DetailBody message={message} />}
        </div>

        {message?.webLink && (
          <Button asChild variant="outline" className="w-full">
            <a href={message.webLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Abrir no Outlook
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
