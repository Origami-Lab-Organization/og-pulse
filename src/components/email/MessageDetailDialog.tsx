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

function RecipientLine({ label, names }: { label: string; names: string[] }) {
  if (!names.length) return null;
  return (
    <p className="text-sm text-muted-foreground">
      <span className="text-foreground/70">{label}:</span> {names.join(', ')}
    </p>
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
