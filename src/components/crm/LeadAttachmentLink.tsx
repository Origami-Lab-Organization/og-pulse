import { useState } from 'react';
import { Loader2, Paperclip, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAttachmentSignedUrl, LeadAttachment } from '@/lib/leadAttachments';

/** Anexo de comentário: gera URL assinada sob demanda e abre o download (GP-J5 CA-03). */
export function LeadAttachmentLink({ attachment }: { attachment: LeadAttachment }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const url = await getAttachmentSignedUrl(attachment.path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: 'Não foi possível abrir o anexo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted transition-colors max-w-full"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : (
        <Paperclip className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{attachment.name}</span>
      <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
    </button>
  );
}
