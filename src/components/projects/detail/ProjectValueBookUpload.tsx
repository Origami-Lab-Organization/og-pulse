import { useRef, useState } from 'react';
import { FileText, Upload, ExternalLink, Loader2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectValueBookUploadProps {
  projectId: string;
  currentUrl: string | null;
  isReadOnly: boolean;
  onUploadSuccess: (url: string) => void;
}

const ACCEPTED_TYPES = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function extractFileName(url: string): string {
  try {
    const decoded = decodeURIComponent(url.split('/').pop() || '');
    // Remove timestamp prefix pattern like "value-book-1234567890."
    return decoded.replace(/^value-book-\d+\./, 'value-book.');
  } catch {
    return 'value-book';
  }
}

export function ProjectValueBookUpload({
  projectId,
  currentUrl,
  isReadOnly,
  onUploadSuccess,
}: ProjectValueBookUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Tipo de arquivo inválido', description: 'Use PDF, DOC ou DOCX.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'O tamanho máximo é 10MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/value-book-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('projects')
        .update({ value_book_url: publicUrl })
        .eq('id', projectId);

      if (updateError) throw updateError;

      onUploadSuccess(publicUrl);
      toast({ title: 'Value Book enviado com sucesso.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao enviar Value Book', description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          Value Book
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground flex-1 truncate">
              {extractFileName(currentUrl)}
            </span>
            <Button variant="outline" size="sm" asChild>
              <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Visualizar
              </a>
            </Button>
            {!isReadOnly && (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleInputChange}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Substituir
                </Button>
              </>
            )}
          </div>
        ) : isReadOnly ? (
          <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleInputChange}
            />
            <div
              role="button"
              tabIndex={0}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer
                ${dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/40'
                }
                ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <p className="text-sm font-medium text-foreground">
                {uploading ? 'Enviando...' : 'Anexe o documento do Value Book'}
              </p>
              <p className="text-xs text-muted-foreground">PDF, DOC, DOCX — máx. 10MB</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
