import { Download, ExternalLink, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  canOpenInBrowser,
  useDownloadAttachment,
  useMessageAttachments,
  useOpenAttachment,
} from '@/hooks/useMicrosoftGraph';
import type { MailAttachment } from '@/services/microsoftGraphService';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({
  attachment,
  onDownload,
  onOpen,
  isDownloading,
  isOpening,
}: {
  attachment: MailAttachment;
  onDownload: () => void;
  onOpen: () => void;
  isDownloading: boolean;
  isOpening: boolean;
}) {
  const canOpen = canOpenInBrowser(attachment.contentType);

  return (
    <li className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {attachment.name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatSize(attachment.size)}
      </span>
      {canOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={`Abrir ${attachment.name} em nova aba`}
          onClick={onOpen}
          disabled={isOpening}
        >
          {isOpening ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`Baixar ${attachment.name}`}
        onClick={onDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </li>
  );
}

/**
 * Anexos baixáveis da mensagem.
 *
 * Embutidos ficam fora da lista — eles já aparecem no corpo (imagem de
 * assinatura, print colado) e listá-los seria ruído.
 */
export function MessageAttachments({ messageId }: { messageId: string }) {
  const { data: attachments, isLoading } = useMessageAttachments(messageId);
  const download = useDownloadAttachment();
  const open = useOpenAttachment();

  if (isLoading || !attachments?.length) return null;

  return (
    <div>
      <p className="ol-label text-muted-foreground mb-2">
        Anexos ({attachments.length})
      </p>
      <ul className="space-y-1.5">
        {attachments.map((attachment) => (
          <AttachmentRow
            key={attachment.id}
            attachment={attachment}
            isDownloading={
              download.isPending && download.variables?.attachmentId === attachment.id
            }
            isOpening={open.isPending && open.variables?.attachmentId === attachment.id}
            onDownload={() =>
              download.mutate({ messageId, attachmentId: attachment.id })
            }
            onOpen={() => open.mutate({ messageId, attachmentId: attachment.id })}
          />
        ))}
      </ul>
    </div>
  );
}
