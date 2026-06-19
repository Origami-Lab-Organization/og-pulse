import { useEffect, useState } from 'react';
import { FileText, Download, Loader2, ImageOff, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLeadInteractions } from '@/hooks/useLeadInteractions';
import { getAttachmentSignedUrl, LeadAttachment } from '@/lib/leadAttachments';

function isImage(type: string): boolean {
  return type.startsWith('image/');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Card de anexo: preview para imagens (URL assinada) e ícone para os demais; download por clique. */
function AttachmentCard({ attachment }: { attachment: LeadAttachment }) {
  const { toast } = useToast();
  const image = isImage(attachment.type);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(image);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!image) return;
    let active = true;
    getAttachmentSignedUrl(attachment.path, 300)
      .then((url) => active && (setPreviewUrl(url), setLoadingPreview(false)))
      .catch(() => active && setLoadingPreview(false));
    return () => {
      active = false;
    };
  }, [attachment.path, image]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await getAttachmentSignedUrl(attachment.path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: 'Não foi possível abrir o anexo', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-background overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={handleDownload}
        title={`Abrir ${attachment.name}`}
        className="aspect-video bg-muted flex items-center justify-center overflow-hidden hover:bg-muted/70 transition-colors"
      >
        {image ? (
          loadingPreview ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : previewUrl ? (
            <img src={previewUrl} alt={attachment.name} className="h-full w-full object-cover" />
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          )
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}
      </button>
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium truncate" title={attachment.name}>
          {attachment.name}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">{formatSize(attachment.size)}</span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            title="Baixar"
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Aba Arquivos: agrega todos os anexos dos comentários da oportunidade (GP-J5). */
export function LeadAttachmentsTab({ leadId }: { leadId: string }) {
  const { data: comments = [], isLoading } = useLeadInteractions(leadId);
  const attachments = comments.flatMap((comment) => comment.attachments ?? []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FolderOpen className="h-8 w-8 mb-2" />
        <p className="text-sm">Nenhum arquivo anexado ainda.</p>
        <p className="text-xs mt-1">Anexe arquivos aos comentários na aba Follow-ups.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {attachments.map((attachment) => (
        <AttachmentCard key={attachment.path} attachment={attachment} />
      ))}
    </div>
  );
}
